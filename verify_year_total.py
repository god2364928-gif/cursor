#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""연도별 총합계 검증"""

# 2024년도 각 월별 데이터 (결제수단 합계)
months_2024 = {
    10: {'revenue': 1855794, 'fees': 50643},
    11: {'revenue': 5168062, 'fees': 124155},
    12: {'revenue': 3327511, 'fees': 76471},
    1: {'revenue': 4000500, 'fees': 247281},
    2: {'revenue': 3992140, 'fees': 72289},
    3: {'revenue': 4668902, 'fees': 81429},
    4: {'revenue': 3599910, 'fees': 81533},
    5: {'revenue': 6825073, 'fees': 151035},
    6: {'revenue': 3838877, 'fees': 70825},
    7: {'revenue': 4894084, 'fees': 114873},
    8: {'revenue': 6618799, 'fees': 148211},
    9: {'revenue': 6463384, 'fees': 115924}
}

# 2024 매출총이익 = 각 월의 결제수단 합계 (수수료 제외)
profit_2024_calculated = sum(m['revenue'] for m in months_2024.values())
csv_profit_2024 = 55253036

print("=== 2024年度 売上総利益 검증 ===")
print(f"계산값 (각 월 결제수단 합계): {profit_2024_calculated:,}")
print(f"CSV 값: {csv_profit_2024:,}")
print(f"일치: {profit_2024_calculated == csv_profit_2024}")

# 또 다른 방법: 売上高 - 手数料
revenue_2024 = sum(m['revenue'] + m['fees'] for m in months_2024.values())
fees_2024 = sum(m['fees'] for m in months_2024.values())
profit_2024_method2 = revenue_2024 - fees_2024

print(f"\n검증 (売上高 - 手数料): {profit_2024_method2:,}")
print(f"일치: {profit_2024_method2 == csv_profit_2024}")

# CSV 결제수단 합계
csv_data_2024 = {
    '口座振込': 24746787,
    'PayPay': 1594200,
    'PayPal': 9216993,
    'strip': 15835008,
    'strip1': 1179619,
    'ココナラ': 2680429
}
total_payment_2024 = sum(csv_data_2024.values())
print(f"\nCSV 결제수단 합계: {total_payment_2024:,}")
print(f"일치: {total_payment_2024 == csv_profit_2024}")

print("\n" + "="*60)
print("=== 2025年度 売上総利益 검증 ===")

# 2025년도 결제수단 합계 (CSV에서 직접)
csv_data_2025 = {
    '口座振込': 51438263,
    'PayPay': 1669250,
    'PayPal': 2259203,
    'strip': 45474000,
    'strip1': 716242,
    'ココナラ': 2805050
}
total_payment_2025 = sum(csv_data_2025.values())
csv_profit_2025 = 104362008

print(f"CSV 결제수단 합계: {total_payment_2025:,}")
print(f"CSV 売上総利益: {csv_profit_2025:,}")
print(f"일치: {total_payment_2025 == csv_profit_2025}")

print("\n" + "="*60)
print("\n✅ 결론:")
print("売上総利益 (연도 합계) = 각 결제수단의 연도 합계")
print("                      = 口座振込 + PayPay + PayPal + strip + strip1 + ココナラ")
print("                      (수수료는 포함하지 않음)")

