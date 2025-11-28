#!/usr/bin/env python3
"""빠른 마이그레이션 스크립트 - 배치 처리"""

import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch
import glob
from datetime import datetime
import sys

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway')
BATCH_SIZE = 1000

def main():
    print('=' * 60)
    print('🍜 일본 음식점 CRM 빠른 마이그레이션')
    print('=' * 60)
    print(f'시작: {datetime.now()}')
    sys.stdout.flush()
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    csv_files = sorted(glob.glob('hotpepper/Final_HotPepper_Master_List_*.csv'))
    print(f'📁 CSV 파일: {len(csv_files)}개')
    sys.stdout.flush()
    
    for idx, csv_file in enumerate(csv_files, 1):
        print(f'\n[{idx}/{len(csv_files)}] {csv_file}')
        sys.stdout.flush()
        
        df = pd.read_csv(csv_file)
        print(f'   레코드: {len(df):,}개')
        sys.stdout.flush()
        
        # 데이터 준비
        records = []
        for _, row in df.iterrows():
            shop_id = str(row['가게ID']).strip() if pd.notna(row['가게ID']) else None
            name = str(row['가게명']).strip() if pd.notna(row['가게명']) else None
            prefecture = str(row['도도부현']).strip() if pd.notna(row['도도부현']) else None
            
            if not shop_id or not name or not prefecture:
                continue
            
            tel_original = str(row['전화번호(기존)']).strip() if pd.notna(row['전화번호(기존)']) and str(row['전화번호(기존)']).strip() != 'nan' else None
            tel_confirmed = str(row['전화번호(확인됨)']).strip() if pd.notna(row['전화번호(확인됨)']) and str(row['전화번호(확인됨)']).strip() != 'nan' else None
            address = str(row['주소']).strip() if pd.notna(row['주소']) and str(row['주소']).strip() != 'nan' else None
            homepage = str(row['공식홈페이지']).strip() if pd.notna(row['공식홈페이지']) and str(row['공식홈페이지']).strip() != 'nan' else None
            homepage_status = str(row['홈페이지상태']).strip() if pd.notna(row['홈페이지상태']) and str(row['홈페이지상태']).strip() != 'nan' else None
            instagram = str(row['인스타그램URL']).strip() if pd.notna(row['인스타그램URL']) and str(row['인스타그램URL']).strip() != 'nan' else None
            hotpepper = str(row['핫페퍼URL']).strip() if pd.notna(row['핫페퍼URL']) and str(row['핫페퍼URL']).strip() != 'nan' else None
            
            areas_str = str(row['지역']).strip() if pd.notna(row['지역']) and str(row['지역']).strip() != 'nan' else None
            areas = [areas_str] if areas_str else None
            
            genres_str = str(row['장르']).strip() if pd.notna(row['장르']) and str(row['장르']).strip() != 'nan' else None
            genres = [g.strip() for g in genres_str.split(',')] if genres_str else None
            
            contactable_val = str(row['문의가능여부']).strip().upper() if pd.notna(row['문의가능여부']) else ''
            is_contactable = contactable_val in ['O', 'TRUE', '1', '성공']
            
            records.append((shop_id, name, prefecture, tel_original, tel_confirmed, address, areas, genres, homepage, homepage_status, instagram, hotpepper, is_contactable))
        
        print(f'   유효 레코드: {len(records):,}개')
        sys.stdout.flush()
        
        # 배치 삽입
        sql = '''
            INSERT INTO restaurants (shop_id, name, prefecture, tel_original, tel_confirmed, address, areas, genres, homepage, homepage_status, instagram, hotpepper, is_contactable)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                is_contactable = EXCLUDED.is_contactable
        '''
        
        for i in range(0, len(records), BATCH_SIZE):
            batch = records[i:i+BATCH_SIZE]
            execute_batch(cur, sql, batch)
            conn.commit()
            if (i + BATCH_SIZE) % 10000 == 0 or i + BATCH_SIZE >= len(records):
                print(f'   진행: {min(i+BATCH_SIZE, len(records)):,}/{len(records):,}')
                sys.stdout.flush()
        
        print(f'   ✅ 완료')
        sys.stdout.flush()
    
    # 최종 통계
    cur.execute('SELECT COUNT(*) FROM restaurants')
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM restaurants WHERE tel_original IS NOT NULL AND tel_original != ''")
    with_phone = cur.fetchone()[0]
    
    print(f'\n' + '=' * 60)
    print(f'📊 마이그레이션 완료!')
    print(f'총 레코드: {total:,}개')
    print(f'전화번호 보유: {with_phone:,}개')
    print(f'완료: {datetime.now()}')
    
    conn.close()

if __name__ == '__main__':
    main()

