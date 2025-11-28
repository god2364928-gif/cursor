#!/usr/bin/env python3
"""
일본 음식점 CRM 데이터 마이그레이션 스크립트

7개로 분할된 Final_HotPepper_Master_List_*.csv 파일들을 읽어서
PostgreSQL restaurants 테이블에 적재합니다.

사용법:
    python scripts/db_seed.py

환경변수:
    DATABASE_URL: PostgreSQL 연결 문자열
"""

import os
import sys
import glob
from datetime import datetime

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from tqdm import tqdm
from dotenv import load_dotenv

# 환경 변수 로드 (옵션, 이미 설정된 경우 스킵)
try:
    load_dotenv()
except Exception:
    pass  # 환경변수가 이미 설정되어 있으면 무시

# 설정
CSV_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'hotpepper')
BATCH_SIZE = 10000

# CSV 컬럼명 → DB 컬럼 매핑
COLUMN_MAPPING = {
    '가게ID': 'shop_id',
    '도도부현': 'prefecture',
    '지역': 'areas',
    '장르': 'genres',
    '가게명': 'name',
    '전화번호(기존)': 'tel_original',
    '전화번호(확인됨)': 'tel_confirmed',
    '주소': 'address',
    '공식홈페이지': 'homepage',
    '홈페이지상태': 'homepage_status',
    '문의가능여부': 'is_contactable',
    '인스타그램URL': 'instagram',
    '핫페퍼URL': 'hotpepper'
}


def get_db_connection():
    """데이터베이스 연결"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL 환경 변수가 설정되지 않았습니다")
    
    return psycopg2.connect(database_url)


def clean_value(val):
    """값 정제 - NaN이나 빈 문자열을 None으로"""
    if pd.isna(val):
        return None
    if isinstance(val, str):
        val = val.strip()
        if val == '' or val.lower() == 'nan':
            return None
    return val


def parse_array(val):
    """콤마로 구분된 문자열을 PostgreSQL Array 형식으로 변환"""
    val = clean_value(val)
    if not val:
        return None
    
    # 콤마로 분리하고 각 항목 정제
    items = [item.strip() for item in str(val).split(',') if item.strip()]
    return items if items else None


def parse_contactable(val):
    """문의 가능 여부를 Boolean으로 변환"""
    val = clean_value(val)
    if not val:
        return False
    
    # 'O', 'TRUE', 'True', '1' 등을 True로
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.upper() in ['O', 'TRUE', 'YES', '1', '성공']
    return bool(val)


def process_csv_file(filepath, conn):
    """CSV 파일 처리 및 DB 적재"""
    filename = os.path.basename(filepath)
    print(f"\n📄 처리 중: {filename}")
    
    # CSV 읽기 (인코딩 자동 감지)
    try:
        df = pd.read_csv(filepath, encoding='utf-8')
    except UnicodeDecodeError:
        try:
            df = pd.read_csv(filepath, encoding='cp949')
        except:
            df = pd.read_csv(filepath, encoding='euc-kr')
    
    print(f"   총 {len(df):,}개 레코드")
    
    # 컬럼 매핑
    df = df.rename(columns=COLUMN_MAPPING)
    
    # 필수 컬럼 확인
    required_cols = ['shop_id', 'name', 'prefecture']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        print(f"   ❌ 필수 컬럼 누락: {missing_cols}")
        return 0
    
    # 데이터 전처리
    records = []
    for _, row in df.iterrows():
        record = {
            'shop_id': clean_value(row.get('shop_id')),
            'name': clean_value(row.get('name')),
            'prefecture': clean_value(row.get('prefecture')),
            'tel_original': clean_value(row.get('tel_original')),
            'tel_confirmed': clean_value(row.get('tel_confirmed')),
            'address': clean_value(row.get('address')),
            'areas': parse_array(row.get('areas')),
            'genres': parse_array(row.get('genres')),
            'homepage': clean_value(row.get('homepage')),
            'homepage_status': clean_value(row.get('homepage_status')),
            'instagram': clean_value(row.get('instagram')),
            'hotpepper': clean_value(row.get('hotpepper')),
            'is_contactable': parse_contactable(row.get('is_contactable'))
        }
        
        # 필수값 검증
        if record['shop_id'] and record['name'] and record['prefecture']:
            records.append(record)
    
    print(f"   유효 레코드: {len(records):,}개")
    
    # 배치 삽입
    inserted = 0
    updated = 0
    errors = 0
    
    with conn.cursor() as cur:
        for i in tqdm(range(0, len(records), BATCH_SIZE), desc="   삽입 중"):
            batch = records[i:i + BATCH_SIZE]
            
            # UPSERT 쿼리 (shop_id 기준 중복 시 업데이트)
            for record in batch:
                try:
                    cur.execute("""
                        INSERT INTO restaurants (
                            shop_id, name, prefecture, tel_original, tel_confirmed,
                            address, areas, genres, homepage, homepage_status,
                            instagram, hotpepper, is_contactable
                        ) VALUES (
                            %(shop_id)s, %(name)s, %(prefecture)s, %(tel_original)s, %(tel_confirmed)s,
                            %(address)s, %(areas)s, %(genres)s, %(homepage)s, %(homepage_status)s,
                            %(instagram)s, %(hotpepper)s, %(is_contactable)s
                        )
                        ON CONFLICT (shop_id) DO UPDATE SET
                            name = EXCLUDED.name,
                            prefecture = EXCLUDED.prefecture,
                            tel_original = COALESCE(EXCLUDED.tel_original, restaurants.tel_original),
                            tel_confirmed = COALESCE(EXCLUDED.tel_confirmed, restaurants.tel_confirmed),
                            address = COALESCE(EXCLUDED.address, restaurants.address),
                            areas = COALESCE(EXCLUDED.areas, restaurants.areas),
                            genres = COALESCE(EXCLUDED.genres, restaurants.genres),
                            homepage = COALESCE(EXCLUDED.homepage, restaurants.homepage),
                            homepage_status = COALESCE(EXCLUDED.homepage_status, restaurants.homepage_status),
                            instagram = COALESCE(EXCLUDED.instagram, restaurants.instagram),
                            hotpepper = COALESCE(EXCLUDED.hotpepper, restaurants.hotpepper),
                            is_contactable = EXCLUDED.is_contactable,
                            updated_at = CURRENT_TIMESTAMP
                    """, record)
                    
                    if cur.rowcount > 0:
                        inserted += 1
                except Exception as e:
                    errors += 1
                    if errors <= 5:
                        print(f"\n   ⚠️ 오류 ({record.get('shop_id')}): {e}")
            
            conn.commit()
    
    print(f"   ✅ 완료: {inserted:,}개 삽입/업데이트, {errors:,}개 오류")
    return inserted


def create_schema_if_not_exists(conn):
    """스키마가 없으면 생성"""
    with conn.cursor() as cur:
        # 테이블 존재 확인
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'restaurants'
            )
        """)
        exists = cur.fetchone()[0]
        
        if not exists:
            print("📦 restaurants 테이블 생성 중...")
            
            # 스키마 파일 읽기
            schema_path = os.path.join(
                os.path.dirname(__file__), 
                '..', 'cursor', 'server', 'database', 'restaurants-schema.sql'
            )
            
            if os.path.exists(schema_path):
                with open(schema_path, 'r', encoding='utf-8') as f:
                    schema_sql = f.read()
                cur.execute(schema_sql)
                conn.commit()
                print("   ✅ 스키마 생성 완료")
            else:
                print(f"   ❌ 스키마 파일을 찾을 수 없습니다: {schema_path}")
                sys.exit(1)
        else:
            print("📦 restaurants 테이블이 이미 존재합니다")


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("🍜 일본 음식점 CRM 데이터 마이그레이션")
    print("=" * 60)
    print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # CSV 파일 찾기
    csv_pattern = os.path.join(CSV_FOLDER, 'Final_HotPepper_Master_List_*.csv')
    csv_files = sorted(glob.glob(csv_pattern))
    
    if not csv_files:
        print(f"\n❌ CSV 파일을 찾을 수 없습니다: {csv_pattern}")
        sys.exit(1)
    
    print(f"\n📁 발견된 CSV 파일: {len(csv_files)}개")
    for f in csv_files:
        print(f"   - {os.path.basename(f)}")
    
    # DB 연결
    try:
        conn = get_db_connection()
        print("\n✅ 데이터베이스 연결 성공")
    except Exception as e:
        print(f"\n❌ 데이터베이스 연결 실패: {e}")
        sys.exit(1)
    
    try:
        # 스키마 확인/생성
        create_schema_if_not_exists(conn)
        
        # 각 CSV 파일 처리
        total_inserted = 0
        for csv_file in csv_files:
            inserted = process_csv_file(csv_file, conn)
            total_inserted += inserted
        
        # 최종 통계
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM restaurants")
            total_records = cur.fetchone()[0]
            
            cur.execute("SELECT COUNT(*) FROM restaurants WHERE tel_original IS NOT NULL AND tel_original != ''")
            with_phone = cur.fetchone()[0]
            
            cur.execute("SELECT COUNT(*) FROM restaurants WHERE homepage IS NOT NULL AND homepage != ''")
            with_homepage = cur.fetchone()[0]
        
        print("\n" + "=" * 60)
        print("📊 마이그레이션 완료!")
        print("=" * 60)
        print(f"총 레코드 수: {total_records:,}개")
        print(f"전화번호(기존) 보유: {with_phone:,}개 ({with_phone/total_records*100:.1f}%)")
        print(f"홈페이지 보유: {with_homepage:,}개 ({with_homepage/total_records*100:.1f}%)")
        print(f"완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    main()

