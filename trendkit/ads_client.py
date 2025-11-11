"""
Google Ads API 클라이언트 헬퍼.
"""

from __future__ import annotations

import logging
import random
import time
from typing import Iterable, List, Optional

import pandas as pd
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException

from .config import Settings

LOGGER = logging.getLogger(__name__)


class AdsClient:
    """Google Ads API에서 검색량을 조회합니다."""

    GEO_TARGETS = {
        "JP": "geoTargetConstants/2392",
        "KR": "geoTargetConstants/2142",
        "US": "geoTargetConstants/2840",
    }

    LANG_TARGETS = {
        "ja": "languageConstants/1005",
        "ko": "languageConstants/1012",
        "en": "languageConstants/1000",
    }

    def __init__(
        self,
        settings: Settings,
        max_attempts: int = 3,
        base_backoff: float = 2.0,
    ) -> None:
        self._settings = settings
        self._max_attempts = max_attempts
        self._base_backoff = base_backoff
        self._client: Optional[GoogleAdsClient] = None

    def _load_client(self) -> GoogleAdsClient:
        if self._client is None:
            config_path = self._settings.ensure_ads_config()
            self._client = GoogleAdsClient.load_from_storage(config_path)
        return self._client

    @staticmethod
    def _empty_frame() -> pd.DataFrame:
        return pd.DataFrame(
            columns=[
                "keyword",
                "avg_monthly_searches",
                "competition_index",
                "low_top_of_page_cpc",
                "high_top_of_page_cpc",
                "monthly_breakdown",
            ]
        )

    def get_historical_metrics(
        self, keywords: Iterable[str], geo: str, lang: str
    ) -> pd.DataFrame:
        """키워드 검색량과 CPC 범위를 조회합니다."""
        keywords = [kw for kw in keywords if kw]
        if not keywords:
            LOGGER.info("조회할 키워드가 없습니다.")
            return self._empty_frame()

        geo_code = self.GEO_TARGETS.get(geo.upper())
        if not geo_code:
            raise ValueError(f"지원하지 않는 국가 코드입니다: {geo}")

        lang_code = self.LANG_TARGETS.get(lang.lower(), self.LANG_TARGETS["en"])

        customer_id = self._settings.google_ads_customer_id
        if not customer_id:
            LOGGER.warning(
                "GOOGLE_ADS_CUSTOMER_ID가 설정되지 않아 키워드 플래너 데이터를 비웁니다."
            )
            return self._empty_frame()

        client = self._load_client()
        service = client.get_service("KeywordPlanIdeaService")
        request = client.get_type("GenerateKeywordHistoricalMetricsRequest")
        request.customer_id = customer_id
        request.keywords.extend(keywords)
        request.language = lang_code
        request.geo_target_constants.extend([geo_code])
        request.include_adult_keywords = False
        request.keyword_plan_network = (
            client.enums.KeywordPlanNetworkEnum.GOOGLE_SEARCH_AND_PARTNERS
        )

        for attempt in range(1, self._max_attempts + 1):
            try:
                response = service.generate_keyword_historical_metrics(request)
                frame = self._response_to_frame(response, keywords)
                if frame.empty:
                    LOGGER.info(
                        "키워드 플래너가 빈 값을 반환했습니다. 테스트 모드 토큰이거나 권한이 제한됐을 수 있습니다."
                    )
                return frame
            except GoogleAdsException as exc:  # pragma: no cover - 네트워크 의존
                if attempt < self._max_attempts and self._is_rate_limit_error(exc):
                    wait = self._compute_backoff(attempt)
                    LOGGER.warning(
                        "Google Ads API 한도에 도달했습니다. %.1f초 대기 후 재시도합니다.",
                        wait,
                    )
                    time.sleep(wait)
                    continue
                LOGGER.error(
                    "Google Ads API 오류가 발생했습니다: %s",
                    self._format_googleads_error(exc),
                )
                break
            except Exception as exc:  # pragma: no cover - 안전장치
                LOGGER.error("알 수 없는 오류로 키워드 데이터를 비웁니다: %s", exc)
                break

        return self._empty_frame()

    @staticmethod
    def _compute_backoff(attempt: int) -> float:
        jitter = random.uniform(0.0, 0.5)
        return (2 ** (attempt - 1)) + jitter

    @staticmethod
    def _is_rate_limit_error(exc: GoogleAdsException) -> bool:
        for error in exc.failure.errors:
            error_code = error.error_code
            if error_code.quota_error or error_code.rate_limit_error:
                return True
        return False

    @staticmethod
    def _format_googleads_error(exc: GoogleAdsException) -> str:
        details = []
        for error in exc.failure.errors:
            details.append(str(error))
        return "; ".join(details) or exc.error.message

    def _response_to_frame(self, response, keywords: List[str]) -> pd.DataFrame:
        rows = []
        for result in response.results:
            metrics = result.metrics
            monthly = []
            for item in metrics.monthly_search_volumes:
                month = f"{item.year}-{int(item.month):02d}"
                monthly.append(
                    {
                        "year_month": month,
                        "search_volume": item.monthly_searches,
                    }
                )
            rows.append(
                {
                    "keyword": result.text or result.search_query or keywords[0],
                    "avg_monthly_searches": metrics.avg_monthly_searches,
                    "competition_index": metrics.competition_index,
                    "low_top_of_page_cpc": self._micros_to_unit(
                        metrics.low_top_of_page_bid_micros
                    ),
                    "high_top_of_page_cpc": self._micros_to_unit(
                        metrics.high_top_of_page_bid_micros
                    ),
                    "monthly_breakdown": monthly,
                }
            )
        return pd.DataFrame(rows, columns=self._empty_frame().columns)

    @staticmethod
    def _micros_to_unit(value: Optional[int]) -> Optional[float]:
        if value is None:
            return None
        return round(value / 1_000_000, 2)

    def validate_credentials(self) -> bool:
        """설정 파일과 인증 정보를 검증합니다."""
        self._load_client()
        return True
