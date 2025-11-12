#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import csv
from datetime import datetime
import re

# 매출 CSV 파싱
with open('/Users/go/Desktop/new/일본 자본금 사용 내역 - 시트16.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    sales_values = []
    
    for row in reader:
        if len(row) < 6:
            continue
        
        # 날짜 파싱 (여러 형식 지원)
        date_str = row[0].strip()
        date = None
        
        try:
            if '/' in date_str:
                # 형식: "2023/9/5 17:15" or "2023/9/5"
                if ' ' in date_str:
                    dt = datetime.strptime(date_str, "%Y/%m/%d %H:%M")
                else:
                    dt = datetime.strptime(date_str, "%Y/%m/%d")
                date = dt.strftime("%Y-%m-%d %H:%M:00")
            elif '. ' in date_str:
                # 형식: "2025. 10. 29"
                date_str_clean = date_str.replace('. ', '-').rstrip('.')
                dt = datetime.strptime(date_str_clean, "%Y-%m-%d")
                date = dt.strftime("%Y-%m-%d 00:00:00")
            elif '-' in date_str:
                # 형식: "2025-10-31 11:59"
                if ' ' in date_str:
                    dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M")
                else:
                    dt = datetime.strptime(date_str, "%Y-%m-%d")
                date = dt.strftime("%Y-%m-%d %H:%M:00")
            elif len(date_str) == 8 and date_str.isdigit():
                # 형식: "20230819"
                date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]} 00:00:00"
        except Exception as e:
            print(f"# 날짜 파싱 실패: {date_str} - {e}", file=sys.stderr)
            continue
        
        if not date:
            continue
        
        category = row[1].replace("'", "''")
        user_id = row[2].replace("'", "''")
        name = row[3].replace("'", "''")
        receipt = row[4].replace("'", "''") if row[4] else ''
        
        # 금액 파싱 (쉼표 제거)
        amount_str = row[5].replace(',', '').replace('"', '').strip()
        try:
            amount = int(amount_str)
        except:
            continue
        
        sales_values.append(f"('{date}', '{category}', '{user_id}', '{name}', '{receipt}', {amount})")

print(f"-- PayPay 매출 데이터 ({len(sales_values)}개)")
print("INSERT INTO paypay_sales (date, category, user_id, name, receipt_number, amount) VALUES")
print(",\n".join(sales_values) + ";")
