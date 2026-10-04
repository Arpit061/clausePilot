from functools import lru_cache

from app.core.config import Settings, settings
from app.services.storage.base import FileStorage
from app.services.storage.local import LocalFileStorage
from app.services.storage.r2 import R2FileStorage


def create_r2_client(cfg: Settings):
    import boto3
    from botocore.config import Config

    # R2 ignores regions but the SDK requires one; "auto" is what Cloudflare documents.
    return boto3.client(
        "s3",
        endpoint_url=cfg.R2_ENDPOINT_URL,
        aws_access_key_id=cfg.R2_ACCESS_KEY_ID,
        aws_secret_access_key=cfg.R2_SECRET_ACCESS_KEY,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def build_file_storage(cfg: Settings) -> FileStorage:
    if cfg.STORAGE_BACKEND == "r2":
        return R2FileStorage(create_r2_client(cfg), cfg.R2_BUCKET_NAME)
    return LocalFileStorage(cfg.UPLOAD_DIR)


@lru_cache(maxsize=1)
def get_file_storage() -> FileStorage:
    """Storage selected by the environment. Built once per process."""
    return build_file_storage(settings)
