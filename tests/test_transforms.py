import pandas as pd

from trendkit import transforms


def _build_sample_trends():
    dates = pd.date_range("2024-01-01", periods=180, freq="D")
    values = []
    for dt in dates:
        base = 50
        if dt.month == 2:
            base += 30
        if dt.month == 3:
            base += 40
        if dt.month == 6:
            base -= 15
        if dt.weekday() >= 5:
            base += 10
        values.append(base)
    return pd.DataFrame(
        {
            "date": dates,
            "value": values,
            "isPartial": False,
        }
    )


def _build_ads_frame():
    return pd.DataFrame(
        [
            {
                "keyword": "東京カフェ",
                "avg_monthly_searches": 1200,
                "competition_index": 35,
                "low_top_of_page_cpc": 150,
                "high_top_of_page_cpc": 320,
                "monthly_breakdown": [
                    {"year_month": "2024-02", "search_volume": 800},
                    {"year_month": "2024-03", "search_volume": 1000},
                    {"year_month": "2024-06", "search_volume": 300},
                ],
            }
        ]
    )


def test_monthly_ranking_orders_by_score():
    df_trends = _build_sample_trends()
    monthly = transforms.monthly_ranking(df_trends)
    assert not monthly.empty
    top_month = monthly.iloc[0]["month"]
    assert top_month == "2024-03"
    last_month = monthly.iloc[-1]["month"]
    assert last_month == "2024-06"


def test_weekday_ranking_highest_on_weekend():
    df_trends = _build_sample_trends()
    weekday = transforms.weekday_ranking(df_trends)
    assert weekday.iloc[0]["weekday"] in {"Saturday", "Sunday"}
    assert weekday.iloc[-1]["weekday"] in {"Tuesday", "Wednesday", "Thursday"}


def test_weekly_summary_returns_three_peaks():
    df_trends = _build_sample_trends()
    summary = transforms.weekly_summary(df_trends)
    assert len(summary["peaks"]) == 3
    assert summary["peaks"][0]["value"] >= summary["peaks"][1]["value"]


def test_merge_trends_and_volume_aligns_months():
    df_trends = _build_sample_trends()
    df_ads = _build_ads_frame()
    merged = transforms.merge_trends_and_volume(df_trends, df_ads)
    march_row = merged[merged["month"] == "2024-03"].iloc[0]
    june_row = merged[merged["month"] == "2024-06"].iloc[0]
    assert march_row.search_volume > june_row.search_volume
    assert march_row.volume_index >= june_row.volume_index


def test_simple_insights_localized_messages():
    df_trends = _build_sample_trends()
    monthly = transforms.monthly_ranking(df_trends)
    weekday = transforms.weekday_ranking(df_trends)
    peaks = transforms.weekly_summary(df_trends)
    insights = transforms.simple_insights(monthly, weekday, peaks)
    assert "2024年3月" in insights["ja"]["seasonal_peak"]
    assert "2024년 3월" in insights["ko"]["seasonal_peak"]

