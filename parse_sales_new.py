#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
import re
from datetime import datetime

# 카테고리 매핑
STAFF_MAPPING = {
    '미유': '山﨑水優',
    '히토미': '石井瞳',
    '미나미': '山下南',
    '제이': 'JEYI'
}

def parse_date(date_str):
    """다양한 날짜 형식을 파싱"""
    # 2024-04-02 18:15 형식
    if '-' in date_str and ':' in date_str:
        try:
            return datetime.strptime(date_str, '%Y-%m-%d %H:%M').strftime('%Y-%m-%d %H:%M:00')
        except:
            pass
    
    # 2024/08/07 16:18 형식
    if '/' in date_str and ':' in date_str:
        try:
            return datetime.strptime(date_str, '%Y/%m/%d %H:%M').strftime('%Y-%m-%d %H:%M:00')
        except:
            pass
    
    # 2024. 10. 1 형식
    if '. ' in date_str and ':' not in date_str:
        try:
            # "2024. 10. 1" -> "2024-10-01"
            # 공백 정리
            parts = [p.strip() for p in date_str.replace('.', ' ').split() if p.strip()]
            if len(parts) == 3:
                year, month, day = parts
                return f"{year}-{month.zfill(2)}-{day.zfill(2)} 00:00:00"
        except:
            pass
    
    # 2025.1.9 형식 (공백 없음)
    if '.' in date_str and date_str.count('.') == 2:
        try:
            parts = date_str.split('.')
            if len(parts) == 3:
                year, month, day = parts
                return f"{year}-{month.zfill(2)}-{day.zfill(2)} 00:00:00"
        except:
            pass
    
    # 20250308 형식 (YYYYMMDD)
    if len(date_str) == 8 and date_str.isdigit():
        try:
            return datetime.strptime(date_str, '%Y%m%d').strftime('%Y-%m-%d 00:00:00')
        except:
            pass
    
    return None

def parse_amount(amount_str):
    """금액 문자열을 숫자로 변환 (쉼표 제거)"""
    if isinstance(amount_str, str):
        return amount_str.replace(',', '').replace('"', '').strip()
    return str(amount_str)

def determine_category(user_id, name):
    """user_id나 name으로 카테고리 판단"""
    # 이미 매핑된 이름이 있으면 사용
    if user_id in STAFF_MAPPING:
        return STAFF_MAPPING[user_id]
    if name in STAFF_MAPPING:
        return STAFF_MAPPING[name]
    
    # 특정 담당자 이름이 직접 들어있는 경우
    if user_id == '山﨑水優' or name == '山﨑水優':
        return '山﨑水優'
    if user_id == '石井瞳' or name == '石井瞳':
        return '石井瞳'
    if user_id == '山下南' or name == '山下南':
        return '山下南'
    if user_id == 'JEYI' or name == 'JEYI':
        return 'JEYI'
    
    # 기본값은 셀마플
    return '셀마플'

# CSV 파싱
input_file = '일본 자본금 사용 내역 - 시트18 (1).csv'
output_file = 'paypay_sales_new_import.sql'

with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    
    sales = []
    skipped = []
    line_num = 0
    for row in reader:
        line_num += 1
        if len(row) >= 4:  # 최소 4개 필드 (날짜, user_id, name, receipt_number)
            date_str = row[0].strip()
            user_id = row[1].strip()
            name = row[2].strip()
            receipt_number = row[3].strip() if len(row) > 3 else ''
            amount = parse_amount(row[4]) if len(row) > 4 else '0'
            
            parsed_date = parse_date(date_str)
            if parsed_date:
                category = determine_category(user_id, name)
                sales.append({
                    'date': parsed_date,
                    'category': category,
                    'user_id': user_id,
                    'name': name,
                    'receipt_number': receipt_number if receipt_number else f'AUTO_{line_num}',
                    'amount': amount
                })
            else:
                skipped.append(f"Line {line_num}: 날짜 파싱 실패 - {date_str}")
        else:
            skipped.append(f"Line {line_num}: 필드 부족 - {len(row)}개")

print(f"총 {len(sales)}개 레코드 파싱 완료")
if skipped:
    print(f"\n건너뛴 {len(skipped)}개 레코드:")
    for s in skipped[:10]:  # 처음 10개만 출력
        print(f"  {s}")

# SQL 생성
with open(output_file, 'w', encoding='utf-8') as f:
    f.write("-- PayPay 매출 데이터 추가 (284건)\n")
    f.write("BEGIN;\n\n")
    
    for sale in sales:
        # SQL 문자열 이스케이프
        name_escaped = sale['name'].replace("'", "''")
        user_id_escaped = sale['user_id'].replace("'", "''")
        category_escaped = sale['category'].replace("'", "''")
        
        sql = f"""INSERT INTO paypay_sales (date, category, user_id, name, receipt_number, amount)
VALUES ('{sale['date']}', '{category_escaped}', '{user_id_escaped}', '{name_escaped}', '{sale['receipt_number']}', {sale['amount']});
"""
        f.write(sql)
        f.write("\n")
    
    f.write("\nCOMMIT;\n")

print(f"SQL 파일 생성 완료: {output_file}")
print(f"총 {len(sales)}개 INSERT 문 생성")

