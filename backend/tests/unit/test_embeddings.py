import pytest

from app.services.llm.embeddings import (
    EmbeddingProviderError,
    FakeEmbeddingProvider,
    OpenAIEmbeddingProvider,
    build_embedding_text,
)


def test_fake_provider_produces_configured_dimension() -> None:
    provider = FakeEmbeddingProvider(dimension=64)

    vectors = provider.embed(["1.1 General requirements apply to all widgets."])

    assert len(vectors) == 1
    assert len(vectors[0]) == 64


def test_fake_provider_is_deterministic_for_identical_text() -> None:
    provider = FakeEmbeddingProvider(dimension=32)

    first = provider.embed(["Materials shall be corrosion resistant."])[0]
    second = provider.embed(["Materials shall be corrosion resistant."])[0]

    assert first == second


def test_fake_provider_is_case_and_whitespace_insensitive() -> None:
    provider = FakeEmbeddingProvider(dimension=32)

    a = provider.embed(["Materials shall be corrosion resistant."])[0]
    b = provider.embed(["  MATERIALS SHALL BE CORROSION RESISTANT.  "])[0]

    assert a == b


def test_fake_provider_produces_different_vectors_for_different_text() -> None:
    provider = FakeEmbeddingProvider(dimension=32)

    a = provider.embed(["Materials shall be corrosion resistant."])[0]
    b = provider.embed(["Fire safety requirements for enclosures."])[0]

    assert a != b


def test_fake_provider_embeds_a_batch_in_order() -> None:
    provider = FakeEmbeddingProvider(dimension=16)

    vectors = provider.embed(["alpha", "beta", "gamma"])

    assert len(vectors) == 3
    assert vectors[0] == provider.embed(["alpha"])[0]
    assert vectors[2] == provider.embed(["gamma"])[0]


def test_openai_provider_requires_an_api_key() -> None:
    with pytest.raises(EmbeddingProviderError):
        OpenAIEmbeddingProvider(api_key="", model="text-embedding-3-small", dimension=1536)


def test_build_embedding_text_combines_number_title_and_text() -> None:
    result = build_embedding_text(number="1.1.1", title="Materials", text="Materials shall be corrosion resistant.")

    assert result == "1.1.1 - Materials - Materials shall be corrosion resistant."


def test_build_embedding_text_handles_missing_title() -> None:
    result = build_embedding_text(number="Annex A", title=None, text="Informative annex text.")

    assert result == "Annex A - Informative annex text."
