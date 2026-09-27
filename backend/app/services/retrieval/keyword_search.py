import re
from dataclasses import dataclass

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.models import Clause

SNIPPET_RADIUS = 80
SNIPPET_MAX_LENGTH = 220

TITLE_MATCH_WEIGHT = 15.0
TEXT_MATCH_WEIGHT = 5.0
EXACT_NUMBER_SCORE = 90.0
NUMBER_SUBSTRING_SCORE = 40.0
EXACT_PHRASE_TITLE_SCORE = 100.0
EXACT_PHRASE_TEXT_SCORE = 60.0

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


@dataclass
class ScoredMatch:
    score: float
    snippet: str


@dataclass
class ClauseMatch:
    clause_id: str
    document_id: str
    number: str
    title: str | None
    snippet: str
    page_number: int
    score: float


def _normalize(text: str) -> str:
    lowered = text.lower()
    collapsed = _NON_ALNUM.sub(" ", lowered)
    return collapsed.strip()


def _tokenize(text: str) -> list[str]:
    normalized = _normalize(text)
    if not normalized:
        return []
    tokens: list[str] = []
    for token in normalized.split(" "):
        if token not in tokens:
            tokens.append(token)
    return tokens


def _build_snippet(text: str, title: str | None, query: str, query_tokens: list[str]) -> str:
    stripped = text.strip()
    lower_text = stripped.lower()
    query_lower = query.strip().lower()

    idx = lower_text.find(query_lower) if query_lower else -1
    if idx == -1:
        for token in query_tokens:
            idx = lower_text.find(token)
            if idx != -1:
                break

    if idx == -1:
        base = stripped or (title or "")
        if len(base) <= SNIPPET_MAX_LENGTH:
            return base
        return base[:SNIPPET_MAX_LENGTH].rstrip() + "…"

    start = max(0, idx - SNIPPET_RADIUS)
    end = min(len(stripped), idx + len(query_lower) + SNIPPET_RADIUS)
    snippet = stripped[start:end].strip()
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(stripped) else ""
    return f"{prefix}{snippet}{suffix}"


def score_match(*, number: str, title: str | None, text: str, query: str) -> ScoredMatch | None:
    raw_query = query.strip()
    if not raw_query:
        return None

    query_lower = raw_query.lower()
    number_lower = number.strip().lower()

    normalized_query = _normalize(raw_query)
    normalized_title = _normalize(title or "")
    normalized_text = _normalize(text)

    query_tokens = normalized_query.split() if normalized_query else []
    title_tokens = set(normalized_title.split())
    text_tokens = set(normalized_text.split())

    score = 0.0

    if number_lower == query_lower:
        score += EXACT_NUMBER_SCORE
    elif query_lower in number_lower:
        score += NUMBER_SUBSTRING_SCORE

    if normalized_query:
        if normalized_title and normalized_query in normalized_title:
            score += EXACT_PHRASE_TITLE_SCORE
        if normalized_query in normalized_text:
            score += EXACT_PHRASE_TEXT_SCORE

    if query_tokens:
        score += sum(1 for token in query_tokens if token in title_tokens) * TITLE_MATCH_WEIGHT
        score += sum(1 for token in query_tokens if token in text_tokens) * TEXT_MATCH_WEIGHT

    if score <= 0:
        return None

    snippet = _build_snippet(text, title, raw_query, query_tokens)
    return ScoredMatch(score=score, snippet=snippet)


def search_clauses(
    session: Session,
    *,
    query: str,
    document_id: str | None = None,
    limit: int = 20,
) -> list[ClauseMatch]:
    raw_query = query.strip()
    if not raw_query:
        return []

    tokens = _tokenize(raw_query)

    conditions = [
        Clause.number.ilike(f"%{raw_query}%"),
        Clause.title.ilike(f"%{raw_query}%"),
        Clause.text.ilike(f"%{raw_query}%"),
    ]
    for token in tokens:
        conditions.extend(
            [
                Clause.number.ilike(f"%{token}%"),
                Clause.title.ilike(f"%{token}%"),
                Clause.text.ilike(f"%{token}%"),
            ]
        )

    stmt = select(Clause).where(or_(*conditions))
    if document_id:
        stmt = stmt.where(Clause.document_id == document_id)

    candidates = session.execute(stmt).scalars().all()

    matches: list[ClauseMatch] = []
    for clause in candidates:
        scored = score_match(number=clause.number, title=clause.title, text=clause.text, query=raw_query)
        if scored is None:
            continue
        matches.append(
            ClauseMatch(
                clause_id=clause.id,
                document_id=clause.document_id,
                number=clause.number,
                title=clause.title,
                snippet=scored.snippet,
                page_number=clause.page_number,
                score=scored.score,
            )
        )

    matches.sort(key=lambda m: (-m.score, m.page_number, m.number))
    return matches[:limit]
