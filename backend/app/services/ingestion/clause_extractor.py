import re
from dataclasses import dataclass

NUMERIC_HEADING = re.compile(r"^(\d{1,2}(?:\.\d{1,2}){0,4})\.?\s+(.+)$")
ANNEX_HEADING = re.compile(r"^Annex\s+([A-Za-z])(?:\.(\d{1,2}))?\.?\s*(.*)$", re.IGNORECASE)

MAX_HEADING_LINE_LENGTH = 150


@dataclass
class ExtractedClause:
    number: str
    title: str | None
    text: str
    page_number: int
    depth: int
    parent_number: str | None
    path: str
    order_index: int


def _match_heading(line: str) -> tuple[str, str | None] | None:
    stripped = line.strip()
    if not stripped or len(stripped) > MAX_HEADING_LINE_LENGTH:
        return None

    numeric_match = NUMERIC_HEADING.match(stripped)
    if numeric_match:
        number = numeric_match.group(1)
        title = numeric_match.group(2).strip()
        return number, title or None

    annex_match = ANNEX_HEADING.match(stripped)
    if annex_match:
        letter = annex_match.group(1).upper()
        sub = annex_match.group(2)
        number = f"Annex {letter}.{sub}" if sub else f"Annex {letter}"
        title = annex_match.group(3).strip()
        return number, title or None

    return None


def _depth_and_parent(number: str) -> tuple[int, str | None]:
    if number.startswith("Annex"):
        segments = number.removeprefix("Annex ").split(".")
        depth = len(segments)
        if depth == 1:
            return depth, None
        return depth, "Annex " + ".".join(segments[:-1])

    segments = number.split(".")
    depth = len(segments)
    if depth == 1:
        return depth, None
    return depth, ".".join(segments[:-1])


def extract_clauses(pages: list[str]) -> list[ExtractedClause]:
    flat_lines: list[tuple[int, str]] = []
    for page_number, page_text in enumerate(pages, start=1):
        for line in page_text.splitlines():
            flat_lines.append((page_number, line))

    headings: list[tuple[int, int, str, str | None]] = []
    for line_index, (page_number, line) in enumerate(flat_lines):
        match = _match_heading(line)
        if match:
            number, title = match
            headings.append((line_index, page_number, number, title))

    if not headings:
        return []

    extracted: list[ExtractedClause] = []
    number_path: dict[str, str] = {}

    for order_index, (line_index, page_number, number, title) in enumerate(headings):
        depth, parent_number = _depth_and_parent(number)

        next_line_index = (
            headings[order_index + 1][0] if order_index + 1 < len(headings) else len(flat_lines)
        )
        body_lines = [flat_lines[i][1] for i in range(line_index + 1, next_line_index)]
        text = "\n".join(line for line in body_lines if line.strip()).strip()

        parent_path = number_path.get(parent_number) if parent_number else None
        path = f"{parent_path} > {number}" if parent_path else number
        number_path.setdefault(number, path)

        extracted.append(
            ExtractedClause(
                number=number,
                title=title,
                text=text,
                page_number=page_number,
                depth=depth,
                parent_number=parent_number,
                path=path,
                order_index=order_index,
            )
        )

    return extracted
