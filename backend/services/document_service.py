"""
Real document generation for CareerKonnect AI.

Produces genuine .docx (Open Office XML via python-docx) and .pdf (via
reportlab) files server-side. Nothing here renames a text file: both outputs
are valid, properly formatted documents with sensible margins and typography.
"""

import io
import logging
import re

logger = logging.getLogger(__name__)


def safe_filename_stem(name, fallback="Cover_Letter"):
    """
    Build a filesystem-safe filename stem from a person's name.

    "Yashwanth Madipeddi" -> "Yashwanth_Madipeddi"
    """
    if not name:
        return fallback
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", str(name)).strip("_")
    return cleaned or fallback


def _split_paragraphs(content):
    """Split letter text into paragraphs on blank lines, preserving order."""
    if not content:
        return []
    normalised = str(content).replace("\r\n", "\n").replace("\r", "\n")
    parts = [p.strip() for p in re.split(r"\n\s*\n", normalised)]
    paragraphs = [p for p in parts if p]
    if paragraphs:
        return paragraphs
    # Fall back to single newlines when the model used one line per paragraph.
    return [line.strip() for line in normalised.split("\n") if line.strip()]


def build_cover_letter_docx(content, candidate_name=None, job_title=None, company_name=None):
    """
    Generate a real .docx cover letter.

    Returns the document as bytes.
    """
    try:
        from docx import Document
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.shared import Inches, Pt
    except ImportError as exc:  # pragma: no cover - dependency missing
        raise RuntimeError(
            "python-docx is not installed on the server. Run: pip install python-docx"
        ) from exc

    document = Document()

    # Page margins.
    for section in document.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Base typography.
    normal = document.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal_format = normal.paragraph_format
    normal_format.space_after = Pt(10)
    normal_format.line_spacing = 1.15

    # Letterhead: candidate name, then optional role/company context line.
    if candidate_name:
        heading = document.add_paragraph()
        heading.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = heading.add_run(str(candidate_name))
        run.bold = True
        run.font.size = Pt(18)
        heading.paragraph_format.space_after = Pt(2)

    context_bits = [bit for bit in (job_title, company_name) if bit]
    if context_bits:
        subtitle = document.add_paragraph()
        run = subtitle.add_run(" • ".join(str(b) for b in context_bits))
        run.italic = True
        run.font.size = Pt(10.5)
        subtitle.paragraph_format.space_after = Pt(14)

    for paragraph_text in _split_paragraphs(content):
        para = document.add_paragraph()
        # Keep intra-paragraph line breaks (useful for the sign-off block).
        lines = paragraph_text.split("\n")
        for index, line in enumerate(lines):
            if index:
                para.add_run().add_break()
            para.add_run(line.strip())
        para.alignment = WD_ALIGN_PARAGRAPH.LEFT

    buffer = io.BytesIO()
    document.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def build_cover_letter_pdf(content, candidate_name=None, job_title=None, company_name=None):
    """
    Generate a real .pdf cover letter.

    Returns the document as bytes.
    """
    try:
        from reportlab.lib.enums import TA_LEFT
        from reportlab.lib.pagesizes import LETTER
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    except ImportError as exc:  # pragma: no cover - dependency missing
        raise RuntimeError(
            "reportlab is not installed on the server. Run: pip install reportlab"
        ) from exc

    from xml.sax.saxutils import escape

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        topMargin=1 * inch,
        bottomMargin=1 * inch,
        leftMargin=1 * inch,
        rightMargin=1 * inch,
        title="Cover Letter",
        author=str(candidate_name) if candidate_name else "CareerKonnect AI",
    )

    sheet = getSampleStyleSheet()
    name_style = ParagraphStyle(
        "LetterName",
        parent=sheet["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=TA_LEFT,
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "LetterSubtitle",
        parent=sheet["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=10.5,
        leading=14,
        alignment=TA_LEFT,
        spaceAfter=14,
    )
    body_style = ParagraphStyle(
        "LetterBody",
        parent=sheet["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15.5,
        alignment=TA_LEFT,
        spaceAfter=10,
    )

    story = []
    if candidate_name:
        story.append(Paragraph(escape(str(candidate_name)), name_style))

    context_bits = [bit for bit in (job_title, company_name) if bit]
    if context_bits:
        # Escape each part BEFORE joining, otherwise the separator entity
        # itself gets escaped and renders literally as "&bull;".
        joined = " &bull; ".join(escape(str(b)) for b in context_bits)
        story.append(Paragraph(joined, subtitle_style))
    elif candidate_name:
        story.append(Spacer(1, 12))

    for paragraph_text in _split_paragraphs(content):
        safe = escape(paragraph_text).replace("\n", "<br/>")
        story.append(Paragraph(safe, body_style))

    if not story:
        story.append(Paragraph("(empty document)", body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
