from app.services.retrieval.keyword_search import score_match


def test_no_match_returns_none() -> None:
    result = score_match(number="1.1", title="General", text="Widgets shall be blue.", query="corrosion")

    assert result is None


def test_blank_query_returns_none() -> None:
    result = score_match(number="1.1", title="General", text="Some text.", query="   ")

    assert result is None


def test_exact_title_phrase_scores_highest() -> None:
    exact_title = score_match(
        number="1.1",
        title="Corrosion Resistance",
        text="Some unrelated body text.",
        query="corrosion resistance",
    )
    token_only = score_match(
        number="2.4",
        title="Unrelated",
        text="This clause briefly mentions corrosion and resistance separately.",
        query="corrosion resistance",
    )

    assert exact_title is not None
    assert token_only is not None
    assert exact_title.score > token_only.score


def test_exact_phrase_in_text_outscores_loose_token_matches() -> None:
    exact_phrase = score_match(
        number="1.1.1",
        title="Materials",
        text="Materials shall be corrosion resistant under all conditions.",
        query="corrosion resistant",
    )
    scattered_tokens = score_match(
        number="3.2",
        title="Other",
        text="Corrosion may occur. Resistant coatings are mentioned in a different sentence.",
        query="corrosion resistant",
    )

    assert exact_phrase is not None
    assert scattered_tokens is not None
    assert exact_phrase.score > scattered_tokens.score


def test_exact_clause_number_match_scores_higher_than_substring() -> None:
    exact_number = score_match(number="1.1", title="General", text="Body text.", query="1.1")
    substring_number = score_match(number="1.1.1", title="Materials", text="Body text.", query="1.1")

    assert exact_number is not None
    assert substring_number is not None
    assert exact_number.score > substring_number.score


def test_matching_is_case_and_punctuation_insensitive() -> None:
    result = score_match(
        number="1.1",
        title="General",
        text="Materials shall be corrosion-resistant under load.",
        query="Corrosion Resistant",
    )

    assert result is not None
    assert "corrosion" in result.snippet.lower()


def test_snippet_centers_on_the_match_location() -> None:
    long_text = ("padding " * 40) + "the critical requirement is fire resistance" + (" more padding" * 40)

    result = score_match(number="4", title="Requirements", text=long_text, query="fire resistance")

    assert result is not None
    assert "fire resistance" in result.snippet


def test_snippet_falls_back_to_title_when_text_has_no_direct_hit() -> None:
    # Query only matches via the title; the body text doesn't contain the phrase at all.
    result = score_match(
        number="5",
        title="Fire Safety",
        text="This clause covers unrelated administrative matters only.",
        query="fire safety",
    )

    assert result is not None
    assert result.snippet
