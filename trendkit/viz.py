"""
보고서용 시각화 유틸리티.
"""

from __future__ import annotations

from pathlib import Path
from typing import Sequence

import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.patches import FancyBboxPatch

from .transforms import weekly_summary

FIG_BG = "#111111"
CARD_BG = "#1b1b1b"
TEXT_COLOR = "#f2f2f2"
ACCENT_COLOR = "#4cc9f0"
ACCENT_SECONDARY = "#ffb703"

plt.rcParams.update(
    {
        "figure.facecolor": FIG_BG,
        "axes.facecolor": CARD_BG,
        "savefig.facecolor": FIG_BG,
        "axes.edgecolor": FIG_BG,
        "text.color": TEXT_COLOR,
        "axes.labelcolor": TEXT_COLOR,
        "xtick.color": TEXT_COLOR,
        "ytick.color": TEXT_COLOR,
        "font.size": 11,
        "font.family": [
            "Hiragino Sans",
            "Yu Gothic",
            "Apple SD Gothic Neo",
            "Noto Sans CJK JP",
            "Noto Sans CJK KR",
            "Arial",
        ],
    }
)


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def _prepare_trends(df_trends: pd.DataFrame) -> pd.DataFrame:
    if df_trends is None or df_trends.empty:
        return pd.DataFrame(columns=["date", "value"])
    frame = df_trends.copy()
    frame["date"] = pd.to_datetime(frame["date"])
    frame = frame.sort_values("date")
    return frame


def _draw_card_background(ax) -> None:
    ax.set_facecolor(CARD_BG)
    ax.axis("off")
    bbox = FancyBboxPatch(
        (0, 0),
        1,
        1,
        boxstyle="round,pad=0.02,rounding_size=0.05",
        transform=ax.transAxes,
        linewidth=0,
        facecolor=CARD_BG,
    )
    ax.add_patch(bbox)


def save_weekly_peaks_chart(
    df_trends: pd.DataFrame, out_png: Path, lang: str = "ja"
) -> Path:
    """일자별 추이와 주간 피크를 라인 차트로 저장합니다."""
    frame = _prepare_trends(df_trends)
    _ensure_parent(Path(out_png))

    fig, ax = plt.subplots(figsize=(10, 4.8))
    fig.patch.set_facecolor(FIG_BG)
    _draw_card_background(ax)

    if frame.empty:
        ax.text(
            0.5,
            0.5,
            "데이터가 없습니다." if lang == "ko" else "データがありません。",
            ha="center",
            va="center",
            color=TEXT_COLOR,
            fontsize=14,
        )
    else:
        ax.plot(frame["date"], frame["value"], color=ACCENT_COLOR, linewidth=2)
        peaks = weekly_summary(frame).get("peaks", [])
        if peaks:
            peak_dates = [p["week_start"] for p in peaks]
            peak_values = [p["value"] for p in peaks]
            ax.scatter(
                peak_dates,
                peak_values,
                color=ACCENT_SECONDARY,
                s=60,
                zorder=5,
            )
        ax.set_ylabel("Score")
        ax.tick_params(axis="x", rotation=25)
        ax.grid(color="#333333", linestyle="--", linewidth=0.5, alpha=0.5)

    fig.tight_layout()
    fig.savefig(out_png, dpi=220, transparent=False)
    plt.close(fig)
    return Path(out_png)


def _table_headers(lang: str, table_type: str) -> Sequence[str]:
    if table_type == "month":
        return (
            ["순위", "월", "평균 점수"]
            if lang == "ko"
            else ["順位", "月", "平均スコア"]
        )
    if table_type == "weekday":
        return (
            ["순위", "요일", "평균 점수"]
            if lang == "ko"
            else ["順位", "曜日", "平均スコア"]
        )
    return ["#", "Label", "Value"]


def _table_rows(df: pd.DataFrame, lang: str, label_col: str) -> Sequence[Sequence]:
    rows = []
    for row in df.itertuples():
        label = getattr(row, label_col, getattr(row, "month", getattr(row, "weekday", "")))
        rows.append([row.rank, label, round(float(row.average_score), 1)])
    return rows


def _render_table(df: pd.DataFrame, out_png: Path, lang: str, table_type: str) -> Path:
    _ensure_parent(Path(out_png))
    fig, ax = plt.subplots(figsize=(6, 6))
    fig.patch.set_facecolor(FIG_BG)
    _draw_card_background(ax)

    if df.empty:
        message = "데이터가 없습니다." if lang == "ko" else "データがありません。"
        ax.text(0.5, 0.5, message, ha="center", va="center", fontsize=14)
    else:
        label_col = "label_ko" if lang == "ko" else "label_ja"
        headers = _table_headers(lang, table_type)
        table = ax.table(
            cellText=_table_rows(df, lang, label_col),
            colLabels=headers,
            cellLoc="center",
            loc="center",
        )
        table.scale(1, 1.4)
        table.auto_set_font_size(False)
        table.set_fontsize(11)
        for key, cell in table.get_celld().items():
            cell.set_edgecolor(FIG_BG)
            cell.set_facecolor("#252525" if key[0] == 0 else CARD_BG)
            cell.set_text_props(color=TEXT_COLOR)

    fig.tight_layout()
    fig.savefig(out_png, dpi=220, transparent=False)
    plt.close(fig)
    return Path(out_png)


def save_monthly_ranking_table(
    df_monthly: pd.DataFrame, out_png: Path, lang: str = "ja"
) -> Path:
    """월 순위를 표로 저장합니다."""
    top = df_monthly.head(10)
    return _render_table(top, Path(out_png), lang, "month")


def save_weekday_ranking_table(
    df_weekday: pd.DataFrame, out_png: Path, lang: str = "ja"
) -> Path:
    """요일 순위를 표로 저장합니다."""
    ordered = df_weekday.sort_values("rank")
    return _render_table(ordered, Path(out_png), lang, "weekday")








