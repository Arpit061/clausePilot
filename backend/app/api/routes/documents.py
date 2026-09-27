from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.database import get_session
from app.db.repositories.documents import get_document_with_pages, list_documents
from app.schemas.documents import DocumentDetailResponse, DocumentListResponse, DocumentResponse
from app.services.ingestion.document_processor import (
    FileTooLargeError,
    UnsupportedFileTypeError,
    process_upload,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse, status_code=201)
async def upload_document(file: UploadFile, session: Session = Depends(get_session)) -> DocumentResponse:
    content = await file.read()

    try:
        document = process_upload(
            session,
            filename=file.filename or "upload.pdf",
            content_type=file.content_type or "application/octet-stream",
            content=content,
        )
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=415, detail=str(exc)) from exc
    except FileTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc

    return DocumentResponse.model_validate(document)


@router.get("", response_model=DocumentListResponse)
def get_documents(session: Session = Depends(get_session)) -> DocumentListResponse:
    documents = list_documents(session)
    return DocumentListResponse(documents=[DocumentResponse.model_validate(doc) for doc in documents])


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_detail(document_id: str, session: Session = Depends(get_session)) -> DocumentDetailResponse:
    document = get_document_with_pages(session, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentDetailResponse.model_validate(document)
