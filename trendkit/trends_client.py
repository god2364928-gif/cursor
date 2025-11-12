"""
Google Trends 래퍼.
"""

from __future__ import annotations

import logging
import random
import time
from datetime import datetime
from typing import Dict, Iterable, Optional
from zoneinfo import ZoneInfo

import pandas as pd
from pytrends.request import TrendReq

LOGGER = logging.getLogger(__name__)


class TrendsClient:
    """pytrends 기반 데이터 수집기."""

    HL_MAP = {
        "ja": "ja-JP",
        "ko": "ko-KR",
        "en": "en-US",
    }

    GEO_TIMEZONE = {
        "JP": "Asia/Tokyo",
        "KR": "Asia/Seoul",
    }

    def __init__(self, max_attempts: int = 3, base_backoff: float = 2.0) -> None:
        self._max_attempts = max_attempts
        self._base_backoff = base_backoff

    def _tz_offset_minutes(self, geo: str) -> int:
        zone_name = self.GEO_TIMEZONE.get(geo.upper(), "Asia/Tokyo")
        now = datetime.now(ZoneInfo(zone_name))
        return int(now.utcoffset().total_seconds() // 60)

    def _new_client(self, lang: str, geo: str) -> TrendReq:
        hl = self.HL_MAP.get(lang.lower(), "en-US")
        tz = self._tz_offset_minutes(geo)
        return TrendReq(
            hl=hl,
            tz=tz,
            retries=0,
            backoff_factor=0,
            requests_args={"timeout": (5, 30)},
        )

    def _with_retry(self, func, *args, **kwargs):
        for attempt in range(1, self._max_attempts + 1):
            try:
                return func(*args, **kwargs)
            except Exception as exc:  # pragma: no cover - 네트워크 의존
                if attempt == self._max_attempts:
                    LOGGER.error("pytrends 호출 실패: %s", exc)
                    raise
                wait = self._compute_backoff(attempt)
                LOGGER.warning(
                    "pytrends 호출에 실패했습니다. %.1f초 대기 후 재시도합니다.", wait
                )
                time.sleep(wait)

    @staticmethod
    def _compute_backoff(attempt: int) -> float:
        jitter = random.uniform(0.0, 0.5)
        return (2 ** (attempt - 1)) + jitter

    def fetch_interest_over_time(
        self, keyword: str, geo: str, timeframe: str, lang: str = "ja"
    ) -> pd.DataFrame:
        """관심도 추이를 일자별로 조회합니다."""
        client = self._new_client(lang, geo)
        geo = geo.upper()

        def _call():
            client.build_payload(
                kw_list=[keyword],
                geo=geo,
                timeframe=timeframe,
            )
            return client.interest_over_time()

        trends_df = self._with_retry(_call)
        if trends_df is None or trends_df.empty:
            LOGGER.info("pytrends가 빈 데이터를 반환했습니다.")
            return pd.DataFrame(columns=["date", "value", "isPartial"])

        trends_df = trends_df.reset_index().rename(columns={"date": "date"})
        trends_df["date"] = pd.to_datetime(trends_df["date"])
        value_column = [
            col for col in trends_df.columns if col not in {"date", "isPartial"}
        ]
        if value_column:
            trends_df = trends_df.rename(columns={value_column[0]: "value"})
        else:
            trends_df["value"] = 0
        return trends_df[["date", "value", "isPartial"]]

    def fetch_related_queries(
        self, keyword: str, geo: str, timeframe: str, lang: str = "ja"
    ) -> Dict[str, dict]:
        """연관 검색어를 조회합니다."""
        client = self._new_client(lang, geo)
        geo = geo.upper()

        def _call():
            client.build_payload(
                kw_list=[keyword],
                geo=geo,
                timeframe=timeframe,
            )
            return client.related_queries()

        result = self._with_retry(_call)
        return result or {}


