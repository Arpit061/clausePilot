from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "clausepilot-api"
    APP_ENV: str = "development"
    DEBUG: bool = False
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5433/clausepilot"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    UPLOAD_DIR: str = str(BACKEND_DIR.parent / "data" / "uploads")
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024

    # Embeddings / semantic search.
    #
    # EMBEDDING_PROVIDER defaults to "fake": a deterministic, network-free
    # provider so the app (and its tests) run out of the box with no API key.
    # Set it to "openai" plus EMBEDDING_API_KEY for real semantic search.
    #
    # EMBEDDING_DIMENSION is the single source of truth for the database's
    # vector column width. It must match whatever EMBEDDING_MODEL actually
    # outputs -- it is never guessed independently in more than one place.
    EMBEDDING_PROVIDER: str = "fake"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_API_KEY: str = ""
    EMBEDDING_DIMENSION: int = 1536

    # Hybrid search fusion weights. Keyword and semantic scores are each
    # normalized to [0, 1] before being combined as:
    #   hybrid_score = HYBRID_KEYWORD_WEIGHT * normalized_keyword
    #                + HYBRID_SEMANTIC_WEIGHT * normalized_semantic
    # Weights need not sum to 1; they are just relative contribution factors.
    HYBRID_KEYWORD_WEIGHT: float = 0.5
    HYBRID_SEMANTIC_WEIGHT: float = 0.5


settings = Settings()
