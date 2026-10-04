from app.core.config import DEFAULT_UPLOAD_DIR, Settings


def test_render_style_postgres_url_is_normalized_to_psycopg_driver() -> None:
    assert Settings(DATABASE_URL="postgres://u:p@host/db").DATABASE_URL == "postgresql+psycopg://u:p@host/db"
    assert Settings(DATABASE_URL="postgresql://u:p@host/db").DATABASE_URL == "postgresql+psycopg://u:p@host/db"


def test_explicit_psycopg_url_is_left_unchanged() -> None:
    url = "postgresql+psycopg://u:p@localhost:5433/clausepilot"
    assert Settings(DATABASE_URL=url).DATABASE_URL == url


def test_cors_origins_accepts_comma_separated_list() -> None:
    origins = Settings(CORS_ORIGINS="https://a.example.com, https://b.example.com/").CORS_ORIGINS
    assert origins == ["https://a.example.com", "https://b.example.com"]


def test_cors_origins_accepts_json_array() -> None:
    assert Settings(CORS_ORIGINS='["https://a.example.com"]').CORS_ORIGINS == ["https://a.example.com"]


def test_empty_upload_dir_falls_back_to_default() -> None:
    assert Settings(UPLOAD_DIR="", _env_file=None).UPLOAD_DIR == DEFAULT_UPLOAD_DIR


def test_openai_api_key_alias_populates_embedding_key(monkeypatch) -> None:
    monkeypatch.delenv("EMBEDDING_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    assert Settings(_env_file=None).EMBEDDING_API_KEY == "sk-test"

