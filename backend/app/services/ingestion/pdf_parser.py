from pathlib import Path

from pypdf import PdfReader


class PdfParseError(Exception):
    pass


def extract_pages(file_path: Path) -> list[str]:
    try:
        reader = PdfReader(str(file_path))
    except Exception as exc:
        raise PdfParseError(f"Could not open PDF: {exc}") from exc

    pages: list[str] = []
    for page in reader.pages:
        try:
            text = page.extract_text() or ""
        except Exception as exc:
            raise PdfParseError(f"Could not extract text from page: {exc}") from exc
        pages.append(text)

    return pages
