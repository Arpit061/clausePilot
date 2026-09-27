import pytest
from sqlalchemy import text

from app.core.config import settings
from app.db.database import check_database_connection, engine

pytestmark = pytest.mark.skipif(
    not check_database_connection(),
    reason="Requires a running PostgreSQL instance (see docker-compose.yml).",
)


def test_pgvector_extension_is_available() -> None:
    with engine.connect() as connection:
        row = connection.execute(
            text("SELECT extversion FROM pg_extension WHERE extname = 'vector'")
        ).first()

    assert row is not None, "The 'vector' extension is not installed in this database."


def test_clause_embedding_column_is_a_vector_of_the_configured_dimension() -> None:
    with engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT format_type(a.atttypid, a.atttypmod) "
                "FROM pg_attribute a "
                "JOIN pg_class c ON a.attrelid = c.oid "
                "WHERE c.relname = 'clauses' AND a.attname = 'embedding'"
            )
        ).first()

    assert row is not None, "clauses.embedding column does not exist."
    assert row[0] == f"vector({settings.EMBEDDING_DIMENSION})"
