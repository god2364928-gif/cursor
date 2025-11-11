"""
데이터 집계 및 통찰 로직.
"""

from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd

MONTH_LABELS = {
    "ja": {
        1: "1月",
        2: "2月",
        3: "3月",
        4: "4月",
        5: "5月",
        6: "6月",
        7: "7月",
        8: "8月",
        9: "9月",
        10: "10月",
        11: "11月",
        12: "12月",
    },
    "ko": {
        1: "1월",
        2: "2월",
        3: "3월",
        4: "4월",
        5: "5월",
        6: "6월",
        7: "7월",
        8: "8월",
        9: "9월",
        10: "10월",
        11: "11월",
        12: "12월",
    },
}

WEEKDAY_LABELS = {
    "ja": {
        0: "月曜日",
        1: "火曜日",
        2: "水曜日",
        3: "木曜日",
        4: "金曜日",
        5: "土曜日",
        6: "日曜日",
    },
    "ko": {
        0: "월요일",
        1: "화요일",
        2: "수요일",
        3: "목요일",
        4: "금요일",
        5: "토요일",
        6: "일요일",
    },
}


def _prepare_trends(df_trends: pd.DataFrame) -> pd.DataFrame:
    if df_trends is None or df_trends.empty:
        return pd.DataFrame(columns=["date", "value", "isPartial"])
    df = df_trends.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["value"] = pd.to_numeric(df["value"], errors="coerce").fillna(0)
    return df


def weekly_summary(df_trends: pd.DataFrame) -> Dict[str, List[dict]]:
    """주간 단위 최고점을 정리합니다."""
    df = _prepare_trends(df_trends)
    if df.empty:
        return {"peaks": []}

    df["week_start"] = df["date"] - pd.to_timedelta(df["date"].dt.weekday, unit="d")
    weekly = (
        df.groupby("week_start", as_index=False)["value"]
        .max()
        .sort_values("value", ascending=False)
    )

    peaks = []
    for rank, row in enumerate(weekly.head(3).itertuples(), start=1):
        peaks.append(
            {
                "rank": rank,
                "week_start": row.week_start,
                "value": round(float(row.value), 1),
            }
        )
    return {"peaks": peaks}


def monthly_ranking(df_trends: pd.DataFrame) -> pd.DataFrame:
    """월별 평균 점수 랭킹."""
    df = _prepare_trends(df_trends)
    if df.empty:
        return pd.DataFrame(columns=["rank", "month", "average_score", "label_ja", "label_ko"])

    df["month"] = df["date"].dt.to_period("M").dt.to_timestamp()
    monthly = (
        df.groupby("month", as_index=False)["value"]
        .mean()
        .rename(columns={"value": "average_score"})
    )
    monthly["month_key"] = monthly["month"].dt.strftime("%Y-%m")
    monthly["label_ja"] = monthly["month"].dt.month.map(MONTH_LABELS["ja"])
    monthly["label_ko"] = monthly["month"].dt.month.map(MONTH_LABELS["ko"])
    monthly = monthly.sort_values("average_score", ascending=False)
    monthly["rank"] = np.arange(1, len(monthly) + 1)
    return monthly[["rank", "month_key", "average_score", "label_ja", "label_ko"]].rename(
        columns={"month_key": "month"}
    )


def weekday_ranking(df_trends: pd.DataFrame) -> pd.DataFrame:
    """요일별 평균 점수 랭킹."""
    df = _prepare_trends(df_trends)
    if df.empty:
        return pd.DataFrame(columns=["rank", "weekday", "average_score", "label_ja", "label_ko"])

    df["weekday_idx"] = df["date"].dt.weekday
    weekday = (
        df.groupby("weekday_idx", as_index=False)["value"]
        .mean()
        .rename(columns={"value": "average_score"})
    )
    weekday["weekday"] = weekday["weekday_idx"].map(
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    )
    weekday["label_ja"] = weekday["weekday_idx"].map(WEEKDAY_LABELS["ja"])
    weekday["label_ko"] = weekday["weekday_idx"].map(WEEKDAY_LABELS["ko"])
    weekday = weekday.sort_values("average_score", ascending=False)
    weekday["rank"] = np.arange(1, len(weekday) + 1)
    return weekday[["rank", "weekday", "average_score", "label_ja", "label_ko"]]


def merge_trends_and_volume(
    df_trends: pd.DataFrame, df_ads: pd.DataFrame
) -> pd.DataFrame:
    """월별 트렌드 점수와 검색량을 병합합니다."""
    monthly = monthly_ranking(df_trends)
    if monthly.empty:
        return pd.DataFrame(
            columns=[
                "rank",
                "month",
                "average_score",
                "label_ja",
                "label_ko",
                "search_volume",
                "volume_index",
            ]
        )

    volume_records: List[dict] = []
    if df_ads is not None and not df_ads.empty:
        for row in df_ads.itertuples():
            breakdown = getattr(row, "monthly_breakdown", []) or []
            for entry in breakdown:
                if "year_month" in entry and "search_volume" in entry:
                    volume_records.append(
                        {
                            "month": entry["year_month"],
                            "search_volume": entry["search_volume"],
                        }
                    )

    if volume_records:
        volume_df = (
            pd.DataFrame(volume_records)
            .groupby("month", as_index=False)["search_volume"]
            .sum()
        )
        min_volume = volume_df["search_volume"].min()
        max_volume = volume_df["search_volume"].max()
        if max_volume == min_volume:
            volume_df["volume_index"] = 100.0
        else:
            volume_df["volume_index"] = (
                (volume_df["search_volume"] - min_volume)
                / (max_volume - min_volume)
                * 100
            ).round(1)
    else:
        volume_df = pd.DataFrame(columns=["month", "search_volume", "volume_index"])

    merged = monthly.merge(volume_df, on="month", how="left")
    return merged.fillna(
        {"search_volume": 0, "volume_index": 0}
    )[
        [
            "rank",
            "month",
            "average_score",
            "label_ja",
            "label_ko",
            "search_volume",
            "volume_index",
        ]
    ]


def simple_insights(
    monthly_df: pd.DataFrame,
    weekday_df: pd.DataFrame,
    peaks_summary: Dict[str, List[dict]],
) -> Dict[str, Dict[str, str]]:
    """계절·요일 포인트에 대한 짧은 문장을 생성합니다."""

    def _month_text(month: str, lang: str) -> str:
        year, month_num = month.split("-")
        month_int = int(month_num)
        label = MONTH_LABELS[lang][month_int]
        if lang == "ja":
            return f"{year}年{label}"
        if lang == "ko":
            return f"{year}년 {label}"
        return f"{year}-{month_num}"

    def _weekday_text(rank_row, lang: str) -> str:
        if hasattr(rank_row, "label_ja"):
            return rank_row.label_ja if lang == "ja" else rank_row.label_ko
        return rank_row.weekday

    def _seasonal(lang: str) -> str:
        if monthly_df is None or monthly_df.empty:
            return "최근 12개월 동안 뚜렷한 계절 패턴을 찾기 어려웠습니다." if lang == "ko" else "直近12か月で顕著な季節傾向は見つかりませんでした。"
        top_month = monthly_df.iloc[0]["month"]
        return (
            f"{_month_text(top_month, 'ko')}에 검색 온도가 가장 높았습니다."
            if lang == "ko"
            else f"{_month_text(top_month, 'ja')}に検索熱が最も高まりました。"
        )

    def _weekday(lang: str) -> str:
        if weekday_df is None or weekday_df.empty:
            return "요일별 차이는 제한적이었습니다." if lang == "ko" else "曜日差は大きくありませんでした。"
        top = weekday_df.iloc[0]
        bottom = weekday_df.iloc[-1]
        top_label = _weekday_text(top, lang)
        bottom_label = _weekday_text(bottom, lang)
        if lang == "ko":
            return f"{top_label}에 검색이 가장 활발했고, {bottom_label}이 가장 낮았습니다."
        return f"{top_label}に検索が最も活発で、{bottom_label}が最も落ち着いていました。"

    def _lowest(lang: str) -> str:
        if monthly_df is None or monthly_df.empty:
            return "낮은 달 정보를 확인할 수 없습니다." if lang == "ko" else "低調な月の情報は取得できませんでした。"
        low_month = monthly_df.sort_values("average_score").iloc[0]["month"]
        if lang == "ko":
            return f"{_month_text(low_month, 'ko')}은(는) 상대적으로 관심도가 낮았습니다."
        return f"{_month_text(low_month, 'ja')}は相対的に関心度が低めでした。"

    results = {
        "ja": {
            "seasonal_peak": _seasonal("ja"),
            "weekday_pattern": _weekday("ja"),
            "lowest_month": _lowest("ja"),
        },
        "ko": {
            "seasonal_peak": _seasonal("ko"),
            "weekday_pattern": _weekday("ko"),
            "lowest_month": _lowest("ko"),
        },
    }

    if peaks_summary.get("peaks"):
        top_week = peaks_summary["peaks"][0]["week_start"]
        if not pd.isna(top_week):
            week_label = top_week.strftime("%Y-%m-%d")
            results["ja"]["top_week"] = f"ピーク週は{week_label}始まりでした。"
            results["ko"]["top_week"] = f"피크 주는 {week_label} 시작 주였습니다."
    else:
        results["ja"]["top_week"] = "ピーク週情報は取得できませんでした。"
        results["ko"]["top_week"] = "피크 주 정보를 확인할 수 없었습니다."

    return results
