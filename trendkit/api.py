"""
CLI entry point for keyword summaries consumed by the CRM backend.
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
import requests

from .ads_client import AdsClient
from .config import get_settings
from .transforms import (
    merge_trends_and_volume,
    monthly_ranking,
    simple_insights,
    weekday_ranking,
    weekly_summary,
)
from .trends_client import TrendsClient


@dataclass
class KeywordSummary:
    status: str
    keyword: str
    geo: str
    lang: str
    timeframe: str
    generated_at: str
    ads_warning: bool
    insights: Dict[str, Any]
    time_series: List[Dict[str, Any]]
    monthly_ranking: List[Dict[str, Any]]
    weekday_ranking: List[Dict[str, Any]]
    weekly_peaks: List[Dict[str, Any]]
    ads_summary: Dict[str, Any]
    related_queries: Dict[str, Any]
    places: Dict[str, Any]


def _sanitize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (float, np.floating)):
        if pd.isna(value):
            return None
        return round(float(value), 2)
    if isinstance(value, (int, np.integer)):
        return int(value)
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if pd.isna(value):
        return None
    if hasattr(value, "item"):
        try:
            return _sanitize_value(value.item())
        except Exception:  # pragma: no cover - defensive
            return None
    return value


def _sanitize_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [
        {key: _sanitize_value(val) for key, val in record.items()}
        for record in records
    ]


def _serialize_dataframe(df: pd.DataFrame) -> List[Dict[str, Any]]:
    if df is None or df.empty:
        return []
    return _sanitize_records(df.to_dict(orient="records"))


def _serialize_time_series(df: pd.DataFrame) -> List[Dict[str, Any]]:
    if df is None or df.empty:
        return []
    records = []
    for row in df.to_dict(orient="records"):
        date = row.get("date")
        value = row.get("value")
        is_partial = bool(row.get("isPartial", False))
        records.append(
            {
                "date": _sanitize_value(date),
                "value": float(value) if value is not None else 0.0,
                "isPartial": is_partial,
            }
        )
    return records


def _related_queries_to_dict(raw: Dict[str, Any]) -> Dict[str, Any]:
    if not raw:
        return {"top": [], "rising": []}

    top_df = None
    rising_df = None

    for _, payload in raw.items():
        top_df = payload.get("top") if payload else None
        rising_df = payload.get("rising") if payload else None
        break

    def _convert(df: Optional[pd.DataFrame]) -> List[Dict[str, Any]]:
        if df is None or df.empty:
            return []
        subset = df.head(10)
        records = []
        for _, row in subset.iterrows():
            query = row.get("query")
            value = row.get("value")
            records.append(
                {
                    "query": query if query is None else str(query),
                    "value": _sanitize_value(value),
                }
            )
        return records

    return {
        "top": _convert(top_df),
        "rising": _convert(rising_df),
    }


def fetch_places_summary(keyword: str, geo: str) -> Dict[str, Any]:
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        return {
            "status": "placeholder",
            "message": "Google Places API 키를 설정하면 실제 상권 데이터를 불러올 수 있습니다.",
            "summary": {},
            "examples": [],
        }

    try:
        query = f"{keyword} {geo}"
        params = {
            "query": query,
            "key": api_key,
            "language": "ja" if geo.upper() == "JP" else "ko",
            "region": geo.upper(),
        }
        response = requests.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            params=params,
            timeout=15,
        )
        response.raise_for_status()
        payload = response.json()
        results = payload.get("results", [])

        processed = []
        total_rating = 0.0
        total_reviews = 0

        for entry in results[:10]:
            rating = entry.get("rating")
            reviews = entry.get("user_ratings_total")
            if isinstance(rating, (int, float)):
                total_rating += float(rating)
            if isinstance(reviews, int):
                total_reviews += reviews
            processed.append(
                {
                    "name": entry.get("name"),
                    "rating": rating,
                    "reviews": reviews,
                    "address": entry.get("formatted_address"),
                    "types": entry.get("types", []),
                }
            )

        avg_rating = round(total_rating / len(processed), 2) if processed else None
        avg_reviews = round(total_reviews / len(processed), 1) if processed else None

        return {
            "status": "ok",
            "summary": {
                "total_places": len(processed),
                "average_rating": avg_rating,
                "average_reviews": avg_reviews,
            },
            "examples": [
                {
                    "name": entry["name"],
                    "rating": entry["rating"],
                    "user_ratings_total": entry["reviews"],
                    "address": entry["address"],
                }
                for entry in processed
            ],
        }
    except Exception as exc:  # pragma: no cover - network errors
        return {
            "status": "placeholder",
            "message": f"Google Places 응답을 가져오지 못했습니다: {exc}",
            "summary": {},
            "examples": [],
        }


def _build_ads_payload(df_ads: pd.DataFrame) -> Dict[str, Any]:
    if df_ads is None or df_ads.empty:
        return {}

    record = df_ads.iloc[0].to_dict()
    monthly = record.get("monthly_breakdown") or []

    return {
        "avg_monthly_searches": _sanitize_value(record.get("avg_monthly_searches")),
        "competition_index": _sanitize_value(record.get("competition_index")),
        "low_cpc": _sanitize_value(record.get("low_top_of_page_cpc")),
        "high_cpc": _sanitize_value(record.get("high_top_of_page_cpc")),
        "monthly_breakdown": monthly,
    }


def build_summary(keyword: str, geo: str, lang: str, timeframe: str) -> KeywordSummary:
    settings = get_settings()
    trends_client = TrendsClient()
    ads_client = AdsClient(settings)

    df_trends = trends_client.fetch_interest_over_time(keyword, geo, timeframe, lang)
    related_raw = trends_client.fetch_related_queries(keyword, geo, timeframe, lang)
    df_ads = ads_client.get_historical_metrics([keyword], geo, lang)

    monthly_df = monthly_ranking(df_trends)
    weekday_df = weekday_ranking(df_trends)
    peaks = weekly_summary(df_trends)
    merged_df = merge_trends_and_volume(df_trends, df_ads)
    insights = simple_insights(monthly_df, weekday_df, peaks)

    ads_payload = _build_ads_payload(df_ads)
    ads_warning = not bool(ads_payload)
    places_payload = fetch_places_summary(keyword, geo)

    return KeywordSummary(
        status="success",
        keyword=keyword,
        geo=geo,
        lang=lang,
        timeframe=timeframe,
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        ads_warning=ads_warning,
        time_series=_serialize_time_series(df_trends),
        monthly_ranking=_serialize_dataframe(monthly_df),
        weekday_ranking=_serialize_dataframe(weekday_df),
        weekly_peaks=_sanitize_records(
            [
                {
                    "rank": item.get("rank"),
                    "week_start": item.get("week_start").strftime("%Y-%m-%d")
                    if item.get("week_start")
                    else None,
                    "value": item.get("value"),
                }
                for item in peaks.get("peaks", [])
            ]
        ),
        insights=insights.get(lang, insights.get("ja", {})),
        related_queries=_related_queries_to_dict(related_raw),
        ads_summary=ads_payload,
        places=places_payload,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate keyword summary JSON.")
    parser.add_argument("--keyword", required=True, help="Target keyword")
    parser.add_argument("--geo", default="JP", help="Country code")
    parser.add_argument("--lang", default="ja", help="Language code")
    parser.add_argument(
        "--timeframe", default="today 12-m", help='Timeframe (e.g., "today 12-m")'
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        summary = build_summary(args.keyword, args.geo, args.lang, args.timeframe)
        print(json.dumps(asdict(summary), ensure_ascii=False))
    except Exception as exc:
        error_payload = {"status": "error", "message": str(exc)}
        print(json.dumps(error_payload, ensure_ascii=False))
        raise


if __name__ == "__main__":
    main()

