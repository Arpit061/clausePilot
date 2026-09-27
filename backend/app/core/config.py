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


settings = Settings()
