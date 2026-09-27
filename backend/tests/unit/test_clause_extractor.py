from app.services.ingestion.clause_extractor import extract_clauses


def test_no_headings_returns_empty_list() -> None:
    pages = ["Just some prose with no headings at all."]

    assert extract_clauses(pages) == []


def test_detects_top_level_numeric_clause() -> None:
    pages = ["1 Scope\nThis document specifies requirements."]

    clauses = extract_clauses(pages)

    assert len(clauses) == 1
    clause = clauses[0]
    assert clause.number == "1"
    assert clause.title == "Scope"
    assert clause.text == "This document specifies requirements."
    assert clause.depth == 1
    assert clause.parent_number is None
    assert clause.path == "1"
    assert clause.page_number == 1


def test_detects_nested_clauses_with_correct_hierarchy() -> None:
    pages = [
        "1 Scope\n"
        "Top level body.\n"
        "1.1 General\n"
        "Second level body.\n"
        "1.1.1 Materials\n"
        "Third level body."
    ]

    clauses = extract_clauses(pages)

    assert [c.number for c in clauses] == ["1", "1.1", "1.1.1"]

    top, second, third = clauses
    assert top.depth == 1 and top.parent_number is None
    assert second.depth == 2 and second.parent_number == "1"
    assert third.depth == 3 and third.parent_number == "1.1"

    assert top.path == "1"
    assert second.path == "1 > 1.1"
    assert third.path == "1 > 1.1 > 1.1.1"


def test_detects_annex_headings_and_hierarchy() -> None:
    pages = ["Annex A\nInformative annex text.\nAnnex A.1\nSub-annex detail."]

    clauses = extract_clauses(pages)

    assert [c.number for c in clauses] == ["Annex A", "Annex A.1"]
    assert clauses[0].depth == 1
    assert clauses[0].parent_number is None
    assert clauses[1].depth == 2
    assert clauses[1].parent_number == "Annex A"
    assert clauses[1].path == "Annex A > Annex A.1"


def test_clause_text_spans_across_pages_until_next_heading() -> None:
    pages = [
        "2 Normative references\nThe following documents are referenced",
        "in this standard for compliance purposes.\n2.1 Referenced standards\nISO 9001 shall apply.",
    ]

    clauses = extract_clauses(pages)

    assert [c.number for c in clauses] == ["2", "2.1"]
    section_two = clauses[0]
    assert section_two.page_number == 1
    assert section_two.text == (
        "The following documents are referenced\nin this standard for compliance purposes."
    )

    subsection = clauses[1]
    assert subsection.page_number == 2
    assert subsection.text == "ISO 9001 shall apply."


def test_order_index_is_sequential_in_document_order() -> None:
    pages = ["1 Scope\nBody.\n1.1 General\nBody.\n2 Next\nBody."]

    clauses = extract_clauses(pages)

    assert [c.order_index for c in clauses] == [0, 1, 2]


def test_ignores_numbers_embedded_mid_sentence() -> None:
    pages = ["This sentence mentions 3.14 as pi but does not start with a clause number."]

    assert extract_clauses(pages) == []


def test_ignores_overlong_lines_that_start_with_a_number() -> None:
    long_line = "1 " + "word " * 40
    assert len(long_line) > 150

    assert extract_clauses([long_line]) == []
