#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CSV 매출총이익 상세 검증"""

print("=== 2024年度 10月 상세 검증 ===")
print("\n결제수단별 매출:")
data_2024_10 = {
    '口座振込': 500000,
    'PayPay': 159500,
    'PayPal': 394900,
    'strip': 657800,
    'strip1': 2924,
    'ココナラ': 140670
}
for k, v in data_2024_10.items():
    print(f"  {k}: {v:,}")

revenue_no_fee = sum(data_2024_10.values())
print(f"\n결제수단 합계 (수수료 제외): {revenue_no_fee:,}")

print("\n수수료:")
fees_2024_10 = {
    'PayPal手数料': 18580,
    'strip手数料': 29034,
    'strip1手数料': 3029
}
for k, v in fees_2024_10.items():
    print(f"  {k}: {v:,}")

total_fees = sum(fees_2024_10.values())
print(f"\n수수료 합계: {total_fees:,}")

# CSV에 명시된 값들
csv_revenue = 1906437
csv_fees = 50643
csv_profit = 1855794

print(f"\n=== CSV 값과 비교 ===")
print(f"CSV 売上高: {csv_revenue:,}")
print(f"계산된 売上高 (결제수단 + 수수료): {revenue_no_fee + total_fees:,}")
print(f"일치: {(revenue_no_fee + total_fees) == csv_revenue}")

print(f"\nCSV 手数料: {csv_fees:,}")
print(f"계산된 手数料: {total_fees:,}")
print(f"일치: {total_fees == csv_fees}")

print(f"\nCSV 売上総利益: {csv_profit:,}")
print(f"계산 방법 1 (CSV売上高 - CSV手数料): {csv_revenue - csv_fees:,}")
print(f"계산 방법 2 (결제수단 합계만): {revenue_no_fee:,}")
print(f"일치: {csv_profit == (csv_revenue - csv_fees)}")
print(f"일치: {csv_profit == revenue_no_fee}")

print("\n" + "="*50)
print("=== 2025年度 10月 상세 검증 ===")
print("\n결제수단별 매출:")
data_2025_10 = {
    '口座振込': 2610800,
    'PayPay': 285870,
    'PayPal': 299200,
    'strip': 3357200,
    'strip1': 59222,
    'ココナラ': 0
}
for k, v in data_2025_10.items():
    print(f"  {k}: {v:,}")

revenue_no_fee_2025 = sum(data_2025_10.values())
print(f"\n결제수단 합계 (수수료 제외): {revenue_no_fee_2025:,}")

print("\n수수료:")
fees_2025_10 = {
    'PayPal手数料': 14043,
    'strip手数料': 128178,
    'strip1手数料': 60465
}
for k, v in fees_2025_10.items():
    print(f"  {k}: {v:,}")

total_fees_2025 = sum(fees_2025_10.values())
print(f"\n수수료 합계: {total_fees_2025:,}")

csv_revenue_2025 = 6814978
csv_fees_2025 = 202686
csv_profit_2025 = 6612292

print(f"\n=== CSV 값과 비교 ===")
print(f"CSV 売上高: {csv_revenue_2025:,}")
print(f"계산된 売上高 (결제수단 + 수수료): {revenue_no_fee_2025 + total_fees_2025:,}")
print(f"일치: {(revenue_no_fee_2025 + total_fees_2025) == csv_revenue_2025}")

print(f"\nCSV 手数料: {csv_fees_2025:,}")
print(f"계산된 手数料: {total_fees_2025:,}")
print(f"일치: {total_fees_2025 == csv_fees_2025}")

print(f"\nCSV 売上総利益: {csv_profit_2025:,}")
print(f"계산 방법 1 (CSV売上高 - CSV手数料): {csv_revenue_2025 - csv_fees_2025:,}")
print(f"계산 방법 2 (결제수단 합계만): {revenue_no_fee_2025:,}")
print(f"일치: {csv_profit_2025 == (csv_revenue_2025 - csv_fees_2025)}")
print(f"일치: {csv_profit_2025 == revenue_no_fee_2025}")

print("\n" + "="*50)
print("\n✅ 결론:")
print("売上総利益 = 결제수단 합계 (수수료 제외)")
print("          = 売上高 - 手数料")
print("\n현재 구현이 맞습니다!")

