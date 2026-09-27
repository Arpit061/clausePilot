from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def get_health() -> dict:
    return {"status": "ok", "service": settings.APP_NAME}
