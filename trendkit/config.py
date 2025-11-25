"""
환경 변수와 설정 로딩 도우미.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseSettings, Field, validator

load_dotenv()


class Settings(BaseSettings):
    """패키지 전역 설정."""

    google_ads_yaml: Optional[str] = Field(default=None, env="GOOGLE_ADS_YAML")
    default_geo: str = Field(default="JP", env="DEFAULT_GEO")
    default_lang: str = Field(default="ja", env="DEFAULT_LANG")
    default_timeframe: str = Field(default="today 12-m", env="DEFAULT_TIMEFRAME")
    tz: str = Field(default="Asia/Tokyo", env="TZ")
    google_ads_customer_id: Optional[str] = Field(
        default=None, env="GOOGLE_ADS_CUSTOMER_ID"
    )

    class Config:
        case_sensitive = False

    @validator("default_geo", pre=True)
    def _normalize_geo(cls, value: str) -> str:
        return value.upper()

    @validator("default_lang", pre=True)
    def _normalize_lang(cls, value: str) -> str:
        return value.lower()

    @validator("google_ads_customer_id", pre=True)
    def _strip_customer_id(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return value
        return value.replace("-", "").strip()

    def ads_yaml_path(self) -> Optional[Path]:
        """환경설정 파일 경로를 반환합니다."""
        if not self.google_ads_yaml:
            return None
        return Path(self.google_ads_yaml).expanduser()

    def ensure_ads_config(self) -> Path:
        """Google Ads 설정 파일이 존재하는지 확인합니다."""
        path = self.ads_yaml_path()
        if not path:
            raise FileNotFoundError(
                "GOOGLE_ADS_YAML 환경 변수가 설정되지 않았습니다."
            )
        if not path.exists():
            raise FileNotFoundError(
                f"Google Ads 설정 파일을 찾을 수 없습니다: {path}"
            )
        return path


@lru_cache()
def get_settings() -> Settings:
    """싱글톤으로 설정을 제공합니다."""
    return Settings()








