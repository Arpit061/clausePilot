"""Generate embeddings for any persisted clauses that don't have one yet.

This does not re-upload or re-process any document -- it only fills in
missing `Clause.embedding` values, using whichever embedding provider is
configured (EMBEDDING_PROVIDER / EMBEDDING_MODEL / EMBEDDING_API_KEY /
EMBEDDING_DIMENSION in the backend's .env). Safe to run repeatedly.

Usage (from the repository root, with the backend's virtualenv active):

    python scripts/backfill_embeddings.py
    python scripts/backfill_embeddings.py --document-id <document-id>
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.db.database import SessionLocal  # noqa: E402
from app.services.ingestion.embedding_backfill import backfill_missing_embeddings  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--document-id", default=None, help="Only backfill clauses belonging to this document.")
    args = parser.parse_args()

    session = SessionLocal()
    try:
        count = backfill_missing_embeddings(session, document_id=args.document_id)
        print(f"Backfilled embeddings for {count} clause(s).")
    finally:
        session.close()


if __name__ == "__main__":
    main()
