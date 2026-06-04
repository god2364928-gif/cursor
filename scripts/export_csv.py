import psycopg2
import csv
import os
import re
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'cursor', 'server', '.env'))

DATABASE_URL = os.getenv('DATABASE_URL')

INVALID_PHONES = {'', '0', '00000000000', '09000000000'}

def clean_phone(raw: str):
    if not raw:
        return None
    cleaned = re.sub(r'[-\s]', '', raw.strip())
    if cleaned in INVALID_PHONES:
        return None
    if cleaned.startswith('0'):
        cleaned = '81' + cleaned[1:]
    return cleaned

def export_retargeting(cursor, writer):
    cursor.execute("""
        SELECT company_name, industry, customer_name, phone
        FROM retargeting_customers
        ORDER BY registered_at DESC
    """)
    count = 0
    for row in cursor.fetchall():
        phone = clean_phone(row[3] or '')
        if phone is None:
            continue
        writer.writerow([
            row[0] or '',
            row[1] or '',
            row[2] or '',
            phone,
        ])
        count += 1
    return count

def export_customers(cursor, writer):
    cursor.execute("""
        SELECT company_name, industry, customer_name, phone
        FROM sales_tracking
        ORDER BY created_at DESC NULLS LAST
    """)
    count = 0
    for row in cursor.fetchall():
        phone = clean_phone(row[3] or '')
        if phone is None:
            continue
        writer.writerow([
            row[0] or '',
            row[1] or '',
            row[2] or '',
            phone,
        ])
        count += 1
    return count

def main():
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    cursor = conn.cursor()

    base_dir = os.path.dirname(__file__)
    headers = ['상호명', '업종', '고객명', '전화번호']

    retargeting_path = os.path.join(base_dir, 'export_retargeting.csv')
    with open(retargeting_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        count = export_retargeting(cursor, writer)
    print(f'[리타겟팅] {count}건 저장 → {retargeting_path}')

    customers_path = os.path.join(base_dir, 'export_customers.csv')
    with open(customers_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        count = export_customers(cursor, writer)
    print(f'[영업이력] {count}건 저장 → {customers_path}')

    cursor.close()
    conn.close()

if __name__ == '__main__':
    main()
