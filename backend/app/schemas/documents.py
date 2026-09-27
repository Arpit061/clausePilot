from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models import DocumentStatus


class DocumentPageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    page_number: int
    char_count: int


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    content_type: str
    size_bytes: int
    page_count: int
    status: DocumentStatus
    error_message: str | None
    created_at: datetime


class DocumentDetailResponse(DocumentResponse):
    pages: list[DocumentPageResponse]


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
