#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CSV 전체매출 데이터 검증 스크립트"""

# 2024년도 10월 데이터 검증
data_2024_10 = {
    '口座振込': 500000,
    'PayPay': 159500,
    'PayPal': 394900,
    'strip': 657800,
    'strip1': 2924,
    'ココナラ': 140670
}

fees_2024_10 = {
    'PayPal手数料': 18580,
    'strip手数料': 29034,
    'strip1手数料': 3029
}

revenue = sum(data_2024_10.values())
total_fees = sum(fees_2024_10.values())
profit = revenue - total_fees

print("=== 2024年度 10月 検証 ===")
print(f"売上高計算: {revenue:,}")
print(f"CSV売上高: 1,906,437")
print(f"一致: {revenue == 1906437}")
print()
print(f"手数料計算: {total_fees:,}")
print(f"CSV手数料: 50,643")
print(f"一致: {total_fees == 50643}")
print()
print(f"売上総利益計算: {profit:,}")
print(f"CSV売上総利益: 1,855,794")
print(f"一致: {profit == 1855794}")
print()

# 2025년도 10월 데이터 검증
data_2025_10 = {
    '口座振込': 2610800,
    'PayPay': 285870,
    'PayPal': 299200,
    'strip': 3357200,
    'strip1': 59222,
    'ココナラ': 0
}

fees_2025_10 = {
    'PayPal手数料': 14043,
    'strip手数料': 128178,
    'strip1手数料': 60465
}

revenue_2025 = sum(data_2025_10.values())
total_fees_2025 = sum(fees_2025_10.values())
profit_2025 = revenue_2025 - total_fees_2025

print("=== 2025年度 10月 検証 ===")
print(f"売上高計算: {revenue_2025:,}")
print(f"CSV売上高: 6,814,978")
print(f"一致: {revenue_2025 == 6814978}")
print(f"差額: {6814978 - revenue_2025:,} (CSV가 {6814978 - revenue_2025:,}만큼 큼)")
print()
print(f"手数料計算: {total_fees_2025:,}")
print(f"CSV手数料: 202,686")
print(f"一致: {total_fees_2025 == 202686}")
print()
print(f"売上総利益計算: {profit_2025:,}")
print(f"CSV売上総利益: 6,612,292")
print(f"一致: {profit_2025 == 6612292}")
print()

# CSV 売上高가 틀렸다면 어떤 값이 더해졌는지 확인
if revenue_2025 + total_fees_2025 == 6814978:
    print("⚠️ CSV의 売上高는 수수료를 포함한 값입니다!")
    print(f"   {revenue_2025:,} + {total_fees_2025:,} = {revenue_2025 + total_fees_2025:,}")

