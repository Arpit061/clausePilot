from app.services.retrieval.hybrid_search import _fuse
from app.services.retrieval.keyword_search import ClauseMatch
from app.services.retrieval.semantic_search import SemanticClauseMatch


def _kw(clause_id: str, score: float, *, number: str = "1", page: int = 1) -> ClauseMatch:
    return ClauseMatch(
        clause_id=clause_id,
        document_id="doc-1",
        number=number,
        title="Title",
        snippet="keyword snippet",
        page_number=page,
        score=score,
    )


def _sem(clause_id: str, similarity: float, *, number: str = "1", page: int = 1) -> SemanticClauseMatch:
    return SemanticClauseMatch(
        clause_id=clause_id,
        document_id="doc-1",
        number=number,
        title="Title",
        snippet="semantic snippet",
        page_number=page,
        similarity=similarity,
    )


def test_keyword_scores_are_min_max_normalized_against_the_result_set() -> None:
    keyword_matches = [_kw("a", 100.0), _kw("b", 50.0), _kw("c", 25.0)]

    fused = _fuse(keyword_matches, [], keyword_weight=1.0, semantic_weight=0.0, limit=10)
    by_id = {m.clause_id: m for m in fused}

    assert by_id["a"].keyword_score == 1.0
    assert by_id["b"].keyword_score == 0.5
    assert by_id["c"].keyword_score == 0.25


def test_semantic_scores_are_used_as_is_since_already_normalized() -> None:
    semantic_matches = [_sem("a", 0.9), _sem("b", 0.3)]

    fused = _fuse([], semantic_matches, keyword_weight=0.0, semantic_weight=1.0, limit=10)
    by_id = {m.clause_id: m for m in fused}

    assert by_id["a"].semantic_score == 0.9
    assert by_id["b"].semantic_score == 0.3


def test_weighted_fusion_combines_both_signals() -> None:
    keyword_matches = [_kw("a", 100.0)]
    semantic_matches = [_sem("a", 0.8)]

    fused = _fuse(keyword_matches, semantic_matches, keyword_weight=0.6, semantic_weight=0.4, limit=10)

    assert len(fused) == 1
    result = fused[0]
    # keyword normalized to 1.0 (only candidate), semantic already 0.8.
    assert result.keyword_score == 1.0
    assert result.semantic_score == 0.8
    assert result.hybrid_score == 0.6 * 1.0 + 0.4 * 0.8


def test_duplicate_candidate_is_merged_into_a_single_result() -> None:
    keyword_matches = [_kw("shared", 80.0)]
    semantic_matches = [_sem("shared", 0.7)]

    fused = _fuse(keyword_matches, semantic_matches, keyword_weight=0.5, semantic_weight=0.5, limit=10)

    assert len(fused) == 1
    assert fused[0].clause_id == "shared"
    assert fused[0].keyword_score is not None
    assert fused[0].semantic_score is not None


def test_keyword_only_candidate_has_none_semantic_score() -> None:
    keyword_matches = [_kw("kw-only", 50.0)]

    fused = _fuse(keyword_matches, [], keyword_weight=0.5, semantic_weight=0.5, limit=10)

    assert len(fused) == 1
    result = fused[0]
    assert result.keyword_score == 1.0
    assert result.semantic_score is None
    # Missing signal contributes 0, not a crash or a guessed value.
    assert result.hybrid_score == 0.5 * 1.0 + 0.5 * 0.0


def test_semantic_only_candidate_has_none_keyword_score() -> None:
    semantic_matches = [_sem("sem-only", 0.6)]

    fused = _fuse([], semantic_matches, keyword_weight=0.5, semantic_weight=0.5, limit=10)

    assert len(fused) == 1
    result = fused[0]
    assert result.keyword_score is None
    assert result.semantic_score == 0.6
    assert result.hybrid_score == 0.5 * 0.0 + 0.5 * 0.6


def test_empty_candidates_produce_empty_results() -> None:
    assert _fuse([], [], keyword_weight=0.5, semantic_weight=0.5, limit=10) == []


def test_results_are_ordered_by_hybrid_score_descending() -> None:
    keyword_matches = [_kw("low", 10.0), _kw("high", 100.0)]
    semantic_matches = [_sem("mid", 0.5)]

    fused = _fuse(keyword_matches, semantic_matches, keyword_weight=1.0, semantic_weight=1.0, limit=10)

    assert [m.clause_id for m in fused] == ["high", "mid", "low"]


def test_ordering_is_deterministic_for_tied_scores() -> None:
    keyword_matches = [
        _kw("z-clause", 50.0, number="9", page=3),
        _kw("a-clause", 50.0, number="1", page=1),
    ]

    first_run = _fuse(keyword_matches, [], keyword_weight=1.0, semantic_weight=0.0, limit=10)
    second_run = _fuse(list(reversed(keyword_matches)), [], keyword_weight=1.0, semantic_weight=0.0, limit=10)

    # Both are normalized to the same 1.0 keyword score (max in a two-item,
    # equal-score set is itself), so the page/number/id tie-break decides
    # the order -- and that tie-break must not depend on input order.
    assert [m.clause_id for m in first_run] == [m.clause_id for m in second_run]
    assert [m.clause_id for m in first_run] == ["a-clause", "z-clause"]


def test_limit_truncates_the_fused_results() -> None:
    keyword_matches = [_kw(f"c{i}", float(100 - i)) for i in range(10)]

    fused = _fuse(keyword_matches, [], keyword_weight=1.0, semantic_weight=0.0, limit=3)

    assert len(fused) == 3
    assert [m.clause_id for m in fused] == ["c0", "c1", "c2"]
