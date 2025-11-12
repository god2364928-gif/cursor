"""
보고서 생성 파이프라인.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List

import pandas as pd

from .ads_client import AdsClient
from .config import get_settings
from .report import export_pdf, render_report
from .transforms import (
    merge_trends_and_volume,
    monthly_ranking,
    simple_insights,
    weekday_ranking,
    weekly_summary,
)
from .trends_client import TrendsClient
from .viz import (
    save_monthly_ranking_table,
    save_weekday_ranking_table,
    save_weekly_peaks_chart,
)

LOGGER = logging.getLogger(__name__)

LANG_LABELS = {
    "ja": {
        "report_title": "トレンドレポート",
        "report_badge": "Trendkit",
        "meta_geo": "ターゲット地域",
        "meta_timeframe": "分析期間",
        "generated_label": "生成時刻",
        "insights_title": "分析まとめ",
        "weekly_peaks_title": "週間ピーク推移",
        "monthly_rank_title": "月別平均スコアランキング",
        "weekday_rank_title": "曜日別分析",
        "peaks_table_title": "ピーク週一覧",
        "no_data": "データがありません",
        "ads_title": "Google 広告 検索ボリューム指標",
        "avg_searches": "平均月間検索数",
        "competition": "競合レベル(指数)",
        "cpc_range": "推定CPC(低-高)",
        "ads_warning": "Google Ads API が試用モードの可能性があります。検索量は参考値としてご確認ください。",
        "footer_note": "Powered by Trendkit",
    },
    "ko": {
        "report_title": "트렌드 리포트",
        "report_badge": "Trendkit",
        "meta_geo": "대상 지역",
        "meta_timeframe": "분석 기간",
        "generated_label": "생성 시각",
        "insights_title": "핵심 요약",
        "weekly_peaks_title": "주간 피크 추세",
        "monthly_rank_title": "월별 평균 점수 순위",
        "weekday_rank_title": "요일별 분석",
        "peaks_table_title": "피크 주 목록",
        "no_data": "데이터가 없습니다",
        "ads_title": "Google Ads 검색량 지표",
        "avg_searches": "월평균 검색량",
        "competition": "경쟁도 지수",
        "cpc_range": "예상 CPC(낮음-높음)",
        "ads_warning": "Google Ads API가 테스트 모드일 수 있어 검색량이 비어 있을 수 있습니다.",
        "footer_note": "Trendkit 제공",
    },
}


def _labels(lang: str) -> Dict[str, str]:
    return LANG_LABELS.get(lang, LANG_LABELS["ja"])


def _format_ads_summary(df_ads: pd.DataFrame) -> Dict[str, str]:
    if df_ads is None or df_ads.empty:
        return {
            "avg_monthly_searches": "-",
            "competition_index": "-",
            "low_cpc": "-",
            "high_cpc": "-",
        }
    row = df_ads.iloc[0]
    avg = int(row.avg_monthly_searches) if pd.notna(row.avg_monthly_searches) else "-"
    comp = (
        int(row.competition_index)
        if pd.notna(row.competition_index)
        else "-"
    )
    low = f"{row.low_top_of_page_cpc:.2f}" if pd.notna(row.low_top_of_page_cpc) else "-"
    high = (
        f"{row.high_top_of_page_cpc:.2f}"
        if pd.notna(row.high_top_of_page_cpc)
        else "-"
    )
    return {
        "avg_monthly_searches": avg,
        "competition_index": comp,
        "low_cpc": low,
        "high_cpc": high,
    }


def run(keyword: str, geo: str, lang: str, timeframe: str, out_dir: str) -> Dict[str, Path]:
    """트렌드 보고서를 생성합니다."""
    settings = get_settings()
    lang = lang.lower()
    labels = _labels(lang)

    base_dir = Path(out_dir)
    raw_dir = base_dir / "data" / "raw"
    processed_dir = base_dir / "data" / "processed"
    figures_dir = base_dir / "figures"

    raw_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)
    figures_dir.mkdir(parents=True, exist_ok=True)

    trends_client = TrendsClient()
    df_trends = trends_client.fetch_interest_over_time(keyword, geo, timeframe, lang)
    df_related = trends_client.fetch_related_queries(keyword, geo, timeframe, lang)

    trends_path = raw_dir / "trends.csv"
    df_trends.to_csv(trends_path, index=False)
    (raw_dir / "related_queries.json").write_text(
        json.dumps(df_related, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    ads_warning = False
    df_ads = pd.DataFrame()
    try:
        ads_client = AdsClient(settings)
        df_ads = ads_client.get_historical_metrics([keyword], geo, lang)
        if df_ads.empty:
            ads_warning = True
    except FileNotFoundError:
        LOGGER.warning("Google Ads 설정 파일이 없어 검색량 데이터를 건너뜁니다.")
        ads_warning = True
    except Exception as exc:  # pragma: no cover - 네트워크 의존
        LOGGER.error("Google Ads 연결 중 오류: %s", exc)
        ads_warning = True

    ads_path = raw_dir / "ads.csv"
    df_ads.to_csv(ads_path, index=False)

    monthly_df = monthly_ranking(df_trends)
    weekday_df = weekday_ranking(df_trends)
    peaks = weekly_summary(df_trends)
    merged_monthly = merge_trends_and_volume(df_trends, df_ads)
    insights = simple_insights(monthly_df, weekday_df, peaks)

    monthly_df.to_csv(processed_dir / "monthly_ranking.csv", index=False)
    weekday_df.to_csv(processed_dir / "weekday_ranking.csv", index=False)
    pd.DataFrame(peaks["peaks"]).to_csv(
        processed_dir / "weekly_peaks.csv", index=False
    )
    merged_monthly.to_csv(processed_dir / "monthly_with_volume.csv", index=False)

    weekly_fig = figures_dir / "weekly_peaks.png"
    monthly_fig = figures_dir / "monthly_ranking.png"
    weekday_fig = figures_dir / "weekday_ranking.png"

    save_weekly_peaks_chart(df_trends, weekly_fig, lang)
    save_monthly_ranking_table(monthly_df, monthly_fig, lang)
    save_weekday_ranking_table(weekday_df, weekday_fig, lang)

    figures_context = {
        "weekly": str(Path("figures") / weekly_fig.name),
        "monthly": str(Path("figures") / monthly_fig.name),
        "weekday": str(Path("figures") / weekday_fig.name),
    }

    logo_src = Path(__file__).parent / "assets" / "logo.png"
    context = {
        "keyword": keyword,
        "geo": geo,
        "lang": lang,
        "timeframe": timeframe,
        "labels": labels,
        "insights": insights.get(lang, insights["ja"]),
        "weekly_peaks": peaks.get("peaks", []),
        "ads_summary": _format_ads_summary(df_ads),
        "ads_warning": ads_warning,
        "figures": figures_context,
        "logo_path": str(logo_src.resolve()) if logo_src.exists() else "",
    }

    html_path = base_dir / "report.html"
    pdf_path = base_dir / "report.pdf"
    render_report(context, html_path)
    export_pdf(html_path, pdf_path)

    return {
        "raw_trends": trends_path,
        "raw_ads": ads_path,
        "processed_monthly": processed_dir / "monthly_ranking.csv",
        "processed_weekday": processed_dir / "weekday_ranking.csv",
        "processed_peaks": processed_dir / "weekly_peaks.csv",
        "figure_weekly": weekly_fig,
        "figure_monthly": monthly_fig,
        "figure_weekday": weekday_fig,
        "report_html": html_path,
        "report_pdf": pdf_path,
    }


