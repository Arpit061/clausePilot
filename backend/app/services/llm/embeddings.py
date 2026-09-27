import hashlib
from abc import ABC, abstractmethod

# Published output dimensions for known OpenAI embedding models. This is a
# convenience default only -- the single authoritative dimension for the
# database schema is always `settings.EMBEDDING_DIMENSION`. Providers must
# produce vectors matching that configured value or raise, rather than the
# app silently trusting two independently-guessed numbers.
KNOWN_MODEL_DIMENSIONS: dict[str, int] = {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
}


class EmbeddingProviderError(Exception):
    pass


class EmbeddingProvider(ABC):
    model: str
    dimension: int

    @abstractmethod
    def embed(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts, returning one vector per input in order."""


class OpenAIEmbeddingProvider(EmbeddingProvider):
    def __init__(self, *, api_key: str, model: str, dimension: int) -> None:
        if not api_key:
            raise EmbeddingProviderError(
                "EMBEDDING_PROVIDER is 'openai' but EMBEDDING_API_KEY is not set."
            )
        self.model = model
        self.dimension = dimension
        self._api_key = api_key

    def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            from openai import OpenAI
        except ImportError as exc:  # pragma: no cover - dependency is always installed via pyproject
            raise EmbeddingProviderError("The 'openai' package is required for EMBEDDING_PROVIDER=openai.") from exc

        try:
            client = OpenAI(api_key=self._api_key)
            response = client.embeddings.create(model=self.model, input=texts)
        except Exception as exc:
            raise EmbeddingProviderError(f"Embedding request failed: {exc}") from exc

        vectors = [item.embedding for item in response.data]
        for vector in vectors:
            if len(vector) != self.dimension:
                raise EmbeddingProviderError(
                    f"Embedding provider returned {len(vector)}-dimensional vectors, "
                    f"but EMBEDDING_DIMENSION is configured as {self.dimension}. "
                    "Update EMBEDDING_DIMENSION to match the configured model."
                )
        return vectors


class FakeEmbeddingProvider(EmbeddingProvider):
    """Deterministic, network-free provider for tests and local dev.

    Produces a stable pseudo-embedding derived from a hash of the input text:
    identical text always yields an identical vector, and different text
    yields a different vector. This is enough to exercise the storage,
    retrieval, and ranking pipeline end-to-end without calling a real
    embedding API or requiring an API key.
    """

    model = "fake-deterministic-v1"

    def __init__(self, *, dimension: int) -> None:
        self.dimension = dimension

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(text) for text in texts]

    def _embed_one(self, text: str) -> list[float]:
        normalized = text.strip().lower()
        digest = hashlib.sha256(normalized.encode("utf-8")).digest()
        repeats = (self.dimension // len(digest)) + 1
        raw = (digest * repeats)[: self.dimension]
        return [(byte / 127.5) - 1.0 for byte in raw]


def build_embedding_text(*, number: str, title: str | None, text: str) -> str:
    """Build the canonical text representation embedded for a clause.

    Used both when generating embeddings for newly-processed documents and
    when backfilling embeddings for already-persisted clauses, so both paths
    embed clauses the same way.
    """
    parts = [number]
    if title:
        parts.append(title)
    if text:
        parts.append(text)
    return " - ".join(parts)


def get_embedding_provider() -> EmbeddingProvider:
    from app.core.config import settings

    if settings.EMBEDDING_PROVIDER == "fake":
        return FakeEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)

    if settings.EMBEDDING_PROVIDER == "openai":
        dimension = settings.EMBEDDING_DIMENSION or KNOWN_MODEL_DIMENSIONS.get(settings.EMBEDDING_MODEL)
        if dimension is None:
            raise EmbeddingProviderError(
                f"Unknown output dimension for embedding model {settings.EMBEDDING_MODEL!r}; "
                "set EMBEDDING_DIMENSION explicitly."
            )
        return OpenAIEmbeddingProvider(
            api_key=settings.EMBEDDING_API_KEY,
            model=settings.EMBEDDING_MODEL,
            dimension=dimension,
        )

    raise EmbeddingProviderError(f"Unsupported EMBEDDING_PROVIDER: {settings.EMBEDDING_PROVIDER!r}")
