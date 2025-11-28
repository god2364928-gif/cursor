#!/usr/bin/env python3
"""
🚀 초고속 HotPepper 데이터 마이그레이션 스크립트
- PostgreSQL COPY 명령 사용 (가장 빠른 방식)
- 인덱스 지연 생성 전략
- 예상 소요 시간: 2~5분 (67만 건)
"""

import os
import sys
import glob
import io
from datetime import datetime
import pandas as pd
import psycopg2
from psycopg2 import sql as psql

# 실시간 출력을 위한 설정
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, 'reconfigure') else None

def log(msg):
    """실시간 로그 출력"""
    print(msg, flush=True)

# tqdm 설치 여부 확인
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    log("⚠️ tqdm 미설치 - 기본 진행률 표시 사용")

DATABASE_URL = os.environ.get(
    'DATABASE_URL', 
    'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway'
)

# restaurants 테이블 인덱스 목록 (스키마에서 추출)
INDEXES = [
    "idx_restaurants_prefecture",
    "idx_restaurants_status",
    "idx_restaurants_is_unusable",
    "idx_restaurants_is_contactable",
    "idx_restaurants_assignee",
    "idx_restaurants_areas",
    "idx_restaurants_genres",
    "idx_restaurants_has_tel_original",
    "idx_restaurants_has_homepage",
    "idx_restaurants_has_instagram",
    "idx_restaurants_contactable",
    "idx_restaurants_prefecture_status",
    "idx_restaurants_prefecture_contactable",
    "idx_restaurants_name_trgm",
]

# 인덱스 재생성 SQL (스키마에서 추출)
INDEX_CREATE_SQLS = [
    "CREATE INDEX IF NOT EXISTS idx_restaurants_prefecture ON restaurants(prefecture);",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_is_unusable ON restaurants(is_unusable);",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_is_contactable ON restaurants(is_contactable);",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_assignee ON restaurants(assignee_id);",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_areas ON restaurants USING GIN(areas);",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_genres ON restaurants USING GIN(genres);",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_has_tel_original ON restaurants(id) WHERE tel_original IS NOT NULL AND tel_original != '';",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_has_homepage ON restaurants(id) WHERE homepage IS NOT NULL AND homepage != '';",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_has_instagram ON restaurants(id) WHERE instagram IS NOT NULL AND instagram != '';",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_contactable ON restaurants(id) WHERE is_contactable = true;",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_prefecture_status ON restaurants(prefecture, status) WHERE is_unusable = false;",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_prefecture_contactable ON restaurants(prefecture, is_contactable) WHERE is_unusable = false;",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm ON restaurants USING GIN(name gin_trgm_ops);",
]


def format_postgres_array(value):
    """콤마 구분 문자열을 PostgreSQL 배열 형식으로 변환"""
    if pd.isna(value) or str(value).strip() in ('', 'nan'):
        return None
    items = [item.strip() for item in str(value).split(',') if item.strip()]
    if not items:
        return None
    # PostgreSQL 배열 형식: {item1,item2,item3}
    escaped = [item.replace('\\', '\\\\').replace('"', '\\"') for item in items]
    return '{' + ','.join(f'"{item}"' for item in escaped) + '}'


def escape_copy_value(value):
    """COPY 명령용 값 이스케이프"""
    if value is None:
        return '\\N'  # PostgreSQL NULL
    s = str(value)
    # 탭, 줄바꿈, 백슬래시 이스케이프
    s = s.replace('\\', '\\\\')
    s = s.replace('\t', '\\t')
    s = s.replace('\n', '\\n')
    s = s.replace('\r', '\\r')
    return s


def process_csv_to_copy_buffer(csv_file):
    """CSV 파일을 COPY 명령용 버퍼로 변환"""
    df = pd.read_csv(csv_file)
    
    buffer = io.StringIO()
    skipped = 0
    
    for _, row in df.iterrows():
        shop_id = str(row['가게ID']).strip() if pd.notna(row['가게ID']) else None
        name = str(row['가게명']).strip() if pd.notna(row['가게명']) else None
        prefecture = str(row['도도부현']).strip() if pd.notna(row['도도부현']) else None
        
        # 필수 필드 누락 시 스킵
        if not shop_id or not name or not prefecture or shop_id == 'nan':
            skipped += 1
            continue
        
        # 나머지 필드 처리
        tel_original = str(row['전화번호(기존)']).strip() if pd.notna(row['전화번호(기존)']) and str(row['전화번호(기존)']).strip() not in ('', 'nan') else None
        tel_confirmed = str(row['전화번호(확인됨)']).strip() if pd.notna(row['전화번호(확인됨)']) and str(row['전화번호(확인됨)']).strip() not in ('', 'nan') else None
        address = str(row['주소']).strip() if pd.notna(row['주소']) and str(row['주소']).strip() not in ('', 'nan') else None
        homepage = str(row['공식홈페이지']).strip() if pd.notna(row['공식홈페이지']) and str(row['공식홈페이지']).strip() not in ('', 'nan') else None
        homepage_status = str(row['홈페이지상태']).strip() if pd.notna(row['홈페이지상태']) and str(row['홈페이지상태']).strip() not in ('', 'nan') else None
        instagram = str(row['인스타그램URL']).strip() if pd.notna(row['인스타그램URL']) and str(row['인스타그램URL']).strip() not in ('', 'nan') else None
        hotpepper = str(row['핫페퍼URL']).strip() if pd.notna(row['핫페퍼URL']) and str(row['핫페퍼URL']).strip() not in ('', 'nan') else None
        
        # 배열 필드
        areas = format_postgres_array(row['지역'])
        genres = format_postgres_array(row['장르'])
        
        # 문의가능여부
        contactable_val = str(row['문의가능여부']).strip().upper() if pd.notna(row['문의가능여부']) else ''
        is_contactable = 't' if contactable_val in ['O', 'TRUE', '1', '성공'] else 'f'
        
        # COPY 형식 행 생성 (탭 구분)
        line = '\t'.join([
            escape_copy_value(shop_id),
            escape_copy_value(name),
            escape_copy_value(tel_original),
            escape_copy_value(tel_confirmed),
            escape_copy_value(address),
            escape_copy_value(prefecture),
            escape_copy_value(areas),
            escape_copy_value(genres),
            escape_copy_value(homepage),
            escape_copy_value(homepage_status),
            escape_copy_value(instagram),
            escape_copy_value(hotpepper),
            is_contactable,
        ])
        buffer.write(line + '\n')
    
    buffer.seek(0)
    return buffer, len(df) - skipped, skipped


def drop_indexes(cur):
    """인덱스 삭제 (속도 향상)"""
    log("\n📉 인덱스 삭제 중...")
    for idx_name in INDEXES:
        try:
            cur.execute(f"DROP INDEX IF EXISTS {idx_name};")
        except Exception as e:
            log(f"   ⚠️ {idx_name} 삭제 실패: {e}")
    log("   ✅ 인덱스 삭제 완료")


def create_indexes(cur):
    """인덱스 재생성"""
    log("\n📈 인덱스 생성 중... (시간 소요)")
    for i, sql in enumerate(INDEX_CREATE_SQLS, 1):
        try:
            idx_name = sql.split("IF NOT EXISTS ")[1].split(" ON")[0]
            log(f"   [{i}/{len(INDEX_CREATE_SQLS)}] {idx_name}...")
            cur.execute(sql)
            log(f"   ✅ {idx_name} 완료")
        except Exception as e:
            log(f"   ❌ {idx_name} 실패: {e}")
    log("   ✅ 인덱스 생성 완료")


def main():
    start_time = datetime.now()
    
    log("=" * 70)
    log("🚀 초고속 HotPepper 데이터 마이그레이션")
    log("   방식: PostgreSQL COPY + 인덱스 지연 생성")
    log("=" * 70)
    log(f"시작 시간: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    log(f"DB: Railway PostgreSQL")
    log("")
    
    # CSV 파일 목록
    csv_files = sorted(glob.glob('hotpepper/Final_HotPepper_Master_List_*.csv'))
    if not csv_files:
        log("❌ CSV 파일을 찾을 수 없습니다.")
        log("   hotpepper/ 폴더에 Final_HotPepper_Master_List_*.csv 파일이 있어야 합니다.")
        sys.exit(1)
    
    log(f"📁 CSV 파일: {len(csv_files)}개")
    for f in csv_files:
        log(f"   - {f}")
    log("")
    
    # DB 연결 (타임아웃 30초)
    log("🔌 데이터베이스 연결 중...")
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=30)
        conn.autocommit = False
        cur = conn.cursor()
        log("   ✅ 연결 성공")
    except Exception as e:
        log(f"   ❌ 연결 실패: {e}")
        sys.exit(1)
    
    try:
        # 1. 테이블 완전 삭제 후 재생성 (가장 빠른 방법)
        log("🗑️ 테이블 삭제 중 (DROP TABLE)...")
        cur.execute("DROP TABLE IF EXISTS sales_activities CASCADE;")
        cur.execute("DROP TABLE IF EXISTS restaurants CASCADE;")
        conn.commit()
        log("   ✅ 테이블 삭제 완료")
        
        # 2. 테이블 재생성 (인덱스 없이)
        log("📦 테이블 생성 중...")
        cur.execute("""
            CREATE TABLE restaurants (
                id SERIAL PRIMARY KEY,
                shop_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                tel_original VARCHAR(50),
                tel_confirmed VARCHAR(50),
                address TEXT,
                prefecture VARCHAR(50) NOT NULL,
                areas TEXT[],
                genres TEXT[],
                homepage TEXT,
                homepage_status VARCHAR(50),
                instagram TEXT,
                hotpepper TEXT,
                is_contactable BOOLEAN DEFAULT FALSE,
                is_unusable BOOLEAN DEFAULT FALSE,
                unusable_reason TEXT,
                unusable_by UUID,
                unusable_at TIMESTAMP,
                status VARCHAR(50) DEFAULT 'new',
                assignee_id UUID,
                last_contacted_at TIMESTAMP,
                last_contacted_by UUID,
                memo TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        log("   ✅ 테이블 생성 완료")
        
        # 3. COPY로 데이터 적재
        log("\n📥 데이터 적재 중 (COPY 방식)...")
        total_inserted = 0
        total_skipped = 0
        
        copy_columns = [
            'shop_id', 'name', 'tel_original', 'tel_confirmed', 'address',
            'prefecture', 'areas', 'genres', 'homepage', 'homepage_status',
            'instagram', 'hotpepper', 'is_contactable'
        ]
        
        copy_sql = f"COPY restaurants ({', '.join(copy_columns)}) FROM STDIN WITH (FORMAT text, NULL '\\N')"
        
        for i, csv_file in enumerate(csv_files, 1):
            log(f"\n   [{i}/{len(csv_files)}] 📄 {csv_file}")
            log(f"       CSV 읽는 중...")
            
            buffer, inserted, skipped = process_csv_to_copy_buffer(csv_file)
            
            log(f"       DB로 전송 중... ({inserted:,}개)")
            cur.copy_expert(copy_sql, buffer)
            conn.commit()
            
            total_inserted += inserted
            total_skipped += skipped
            
            log(f"       ✅ 완료 ({inserted:,}개 삽입, {skipped}개 스킵)")
        
        log(f"\n   ✅ 총 {total_inserted:,}개 삽입 완료 ({total_skipped}개 스킵)")
        
        # 4. 인덱스 재생성
        create_indexes(cur)
        conn.commit()
        
        # 5. 최종 통계
        cur.execute("SELECT COUNT(*) FROM restaurants;")
        final_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM restaurants WHERE tel_original IS NOT NULL AND tel_original != '';")
        with_phone = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM restaurants WHERE homepage IS NOT NULL AND homepage != '';")
        with_homepage = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM restaurants WHERE instagram IS NOT NULL AND instagram != '';")
        with_instagram = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM restaurants WHERE is_contactable = true;")
        contactable = cur.fetchone()[0]
        
        # 도도부현별 통계
        cur.execute("""
            SELECT prefecture, COUNT(*) as cnt 
            FROM restaurants 
            GROUP BY prefecture 
            ORDER BY cnt DESC 
            LIMIT 10;
        """)
        top_prefectures = cur.fetchall()
        
    except Exception as e:
        conn.rollback()
        log(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        cur.close()
        conn.close()
    
    end_time = datetime.now()
    duration = end_time - start_time
    
    log("\n" + "=" * 70)
    log("🎉 마이그레이션 완료!")
    log("=" * 70)
    log(f"\n📊 최종 통계:")
    log(f"   총 레코드: {final_count:,}개")
    log(f"   전화번호 보유: {with_phone:,}개 ({with_phone/final_count*100:.1f}%)")
    log(f"   홈페이지 보유: {with_homepage:,}개 ({with_homepage/final_count*100:.1f}%)")
    log(f"   인스타그램 보유: {with_instagram:,}개 ({with_instagram/final_count*100:.1f}%)")
    log(f"   문의가능: {contactable:,}개 ({contactable/final_count*100:.1f}%)")
    
    log(f"\n📍 도도부현 TOP 10:")
    for pref, cnt in top_prefectures:
        log(f"   {pref}: {cnt:,}개")
    
    log(f"\n⏱️ 소요 시간: {duration}")
    log(f"   시작: {start_time.strftime('%H:%M:%S')}")
    log(f"   종료: {end_time.strftime('%H:%M:%S')}")
    
    # 속도 계산
    seconds = duration.total_seconds()
    if seconds > 0:
        speed = final_count / seconds
        log(f"   속도: {speed:,.0f} 행/초")


if __name__ == '__main__':
    main()

