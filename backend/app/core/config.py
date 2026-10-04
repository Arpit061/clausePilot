import json
from pathlib import Path
from typing import Annotated, Literal

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_UPLOAD_DIR = str(BACKEND_DIR.parent / "data" / "uploads")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "clausepilot-api"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # Accepts a PostgreSQL URL in any common form. Hosted providers such as
    # Render hand out "postgres://" or "postgresql://" URLs, but SQLAlchemy
    # needs the psycopg (v3) driver spelled out, so the scheme is normalized.
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5433/clausepilot"

    # Comma-separated list (or a JSON array). Production should list only the
    # deployed frontend origin, for example "https://clausepilot-web.onrender.com".
    CORS_ORIGINS: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    UPLOAD_DIR: str = DEFAULT_UPLOAD_DIR
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024

    # Where uploaded PDFs are kept. "local" writes to UPLOAD_DIR (development).
    # "r2" stores them in a Cloudflare R2 bucket (production); the R2_* values
    # below are then required.
    STORAGE_BACKEND: Literal["local", "r2"] = "local"
    R2_ENDPOINT_URL: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = ""

    # Embeddings / semantic search.
    #
    # EMBEDDING_PROVIDER defaults to "fake": a deterministic, network-free
    # provider so the app (and its tests) run out of the box with no API key.
    # Set it to "openai" plus an API key for real semantic search.
    #
    # EMBEDDING_DIMENSION is the single source of truth for the database's
    # vector column width. It must match whatever EMBEDDING_MODEL actually
    # outputs -- it is never guessed independently in more than one place.
    EMBEDDING_PROVIDER: str = "fake"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    # OPENAI_API_KEY is accepted as an alias so the standard OpenAI variable works.
    EMBEDDING_API_KEY: str = Field(
        default="",
        validation_alias=AliasChoices("EMBEDDING_API_KEY", "OPENAI_API_KEY"),
    )
    EMBEDDING_DIMENSION: int = 1536

    # Hybrid search fusion weights. Keyword and semantic scores are each
    # normalized to [0, 1] before being combined as:
    #   hybrid_score = HYBRID_KEYWORD_WEIGHT * normalized_keyword
    #                + HYBRID_SEMANTIC_WEIGHT * normalized_semantic
    # Weights need not sum to 1; they are just relative contribution factors.
    HYBRID_KEYWORD_WEIGHT: float = 0.5
    HYBRID_SEMANTIC_WEIGHT: float = 0.5

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        for legacy in ("postgres://", "postgresql://"):
            if value.startswith(legacy):
                return "postgresql+psycopg://" + value[len(legacy):]
        return value

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            return [origin.strip().rstrip("/") for origin in stripped.split(",") if origin.strip()]
        return value

    @field_validator("STORAGE_BACKEND", mode="before")
    @classmethod
    def normalize_storage_backend(cls, value: object) -> object:
        return value.strip().lower() if isinstance(value, str) else value

    @model_validator(mode="after")
    def require_r2_settings_when_selected(self) -> "Settings":
        if self.STORAGE_BACKEND == "r2":
            required = ("R2_ENDPOINT_URL", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME")
            missing = [name for name in required if not getattr(self, name)]
            if missing:
                raise ValueError(f"STORAGE_BACKEND=r2 requires these settings: {', '.join(missing)}")
        return self

    @field_validator("UPLOAD_DIR", mode="after")
    @classmethod
    def default_empty_upload_dir(cls, value: str) -> str:
        # An empty UPLOAD_DIR= line in .env must mean "use the default", not "write to the working directory".
        return value.strip() or DEFAULT_UPLOAD_DIR


settings = Settings()
