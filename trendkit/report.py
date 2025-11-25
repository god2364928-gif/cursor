"""
보고서 랜더링 유틸리티.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).parent / "templates"

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_report(context: Dict[str, Any], out_html: Path) -> Path:
    """컨텍스트를 바탕으로 HTML 보고서를 생성합니다."""
    template = env.get_template("report.html.j2")
    ctx = {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        **context,
    }
    html = template.render(**ctx)
    out_path = Path(out_html)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    return out_path


def export_pdf(out_html: Path, out_pdf: Path) -> Path:
    """HTML 파일을 PDF로 변환합니다."""
    out_pdf = Path(out_pdf)
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    HTML(filename=str(out_html)).write_pdf(str(out_pdf))
    return out_pdf








