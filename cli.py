from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from trendkit.config import get_settings
from trendkit.pipeline import run
from trendkit.ads_client import AdsClient

app = typer.Typer(add_completion=False)
console = Console()


def _default_option(name: str, value: str) -> typer.Option:
    return typer.Option(
        value,
        show_default=True,
        help=f"기본값(.env {name})",
    )


@app.command()
def build(
    keyword: str = typer.Argument(..., help="보고서를 생성할 키워드"),
    geo: str = typer.Option(None, "--geo", "-g", help="국가 코드 (예: JP, KR)"),
    lang: str = typer.Option(None, "--lang", "-l", help="언어 코드 (예: ja, ko)"),
    timeframe: str = typer.Option(
        None, "--timeframe", "-t", help='Google Trends 기간 (예: "today 12-m")'
    ),
    out: Path = typer.Option(
        None,
        "--out",
        "-o",
        help="결과를 저장할 폴더 경로",
    ),
) -> None:
    """키워드별 트렌드 보고서를 생성합니다."""
    settings = get_settings()
    geo = geo or settings.default_geo
    lang = lang or settings.default_lang
    timeframe = timeframe or settings.default_timeframe
    out = out or Path("reports") / keyword.replace(" ", "-")

    console.rule(f"[bold]Trendkit[/bold] | {keyword}")
    console.print(f"지역: {geo} · 언어: {lang} · 기간: {timeframe}")
    console.print(f"출력 폴더: {out.resolve()}")

    results = run(keyword, geo, lang, timeframe, out)

    table = Table(title="생성 파일", show_lines=True)
    table.add_column("종류")
    table.add_column("경로")
    for key, path in results.items():
        table.add_row(key, str(path.resolve()))
    console.print(table)
    console.print("[green]보고서 생성이 완료되었습니다.[/green]")


@app.command()
def validate() -> None:
    """환경설정을 확인합니다."""
    settings = get_settings()
    ok = True

    console.rule("환경 점검")
    console.print(f"기본 국가: {settings.default_geo}")
    console.print(f"기본 언어: {settings.default_lang}")
    console.print(f"기본 기간: {settings.default_timeframe}")

    try:
        config_path = settings.ensure_ads_config()
        console.print(f"[green]Google Ads 설정 파일 확인: {config_path}[/green]")
        ads_client = AdsClient(settings)
        ads_client.validate_credentials()
        if settings.google_ads_customer_id:
            console.print(
                f"[green]고객 ID 확인: {settings.google_ads_customer_id}[/green]"
            )
        else:
            console.print(
                "[yellow]GOOGLE_ADS_CUSTOMER_ID가 설정되지 않았습니다. 테스트 모드면 빈 값이 나올 수 있습니다.[/yellow]"
            )
    except FileNotFoundError as exc:
        console.print(f"[red]{exc}[/red]")
        ok = False
    except Exception as exc:  # pragma: no cover - API 인증 실패 대비
        console.print(f"[red]Google Ads 연결 오류: {exc}[/red]")
        ok = False

    if ok:
        console.print("[green]환경 점검 완료[/green]")
        raise typer.Exit(code=0)

    raise typer.Exit(code=1)


if __name__ == "__main__":
    app()
