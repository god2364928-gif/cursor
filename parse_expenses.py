#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import csv

# 지출 CSV 파싱
with open('/Users/go/Desktop/new/일본 자본금 사용 내역 - 시트17.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    expenses_values = []
    
    for row in reader:
        if len(row) < 3:
            continue
        
        # 날짜 파싱 (YYYYMMDD -> YYYY-MM-DD HH:MM:SS)
        date_str = row[0]
        if len(date_str) == 8:
            date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]} 00:00:00"
        else:
            continue
        
        item = row[1].replace("'", "''")
        
        # 금액 파싱 (쉼표 제거)
        amount_str = row[2].replace(',', '').replace('"', '').strip()
        try:
            amount = int(amount_str)
        except:
            continue
        
        expenses_values.append(f"('{date}', '{item}', {amount})")

print(f"-- PayPay 지출 데이터 ({len(expenses_values)}개)")
print("INSERT INTO paypay_expenses (date, item, amount) VALUES")
print(",\n".join(expenses_values) + ";")

