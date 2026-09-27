from app.services.retrieval.semantic_search import _snippet, search_clauses_semantic


def test_blank_query_returns_empty_without_touching_the_database() -> None:
    # Passing session=None proves this never reaches the database for a
    # blank query -- it would raise immediately if it tried.
    results = search_clauses_semantic(None, query="   ")  # type: ignore[arg-type]

    assert results == []


def test_snippet_returns_text_when_short() -> None:
    assert _snippet("Materials shall be corrosion resistant.", title="Materials") == (
        "Materials shall be corrosion resistant."
    )


def test_snippet_falls_back_to_title_when_text_is_empty() -> None:
    assert _snippet("", title="Materials") == "Materials"


def test_snippet_truncates_long_text() -> None:
    long_text = "word " * 100

    snippet = _snippet(long_text, title=None)

    assert snippet.endswith("…")
    assert len(snippet) <= 221
