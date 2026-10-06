import os
import uuid
import secrets
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from PIL import Image

from app.database import get_db
from app.models import User, ComplaintAttachment
from app.schemas import AttachmentUploadOut
from app.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Attachments"])

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 3 * 1024 * 1024  # 3 MB

@router.post("/attachments/upload", response_model=AttachmentUploadOut, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Photos are uploaded only by students on their own complaint."
        )

    file_ext = Path(photo.filename or "").suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS or photo.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a JPG, PNG or WEBP image under 3 MB."
        )

    # Read contents and check size
    contents = await photo.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 3 MB limit."
        )

    # Pillow inspection to verify valid image
    try:
        from io import BytesIO
        img = Image.open(BytesIO(contents))
        img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file format."
        )

    # Generate unique filename
    random_hex = secrets.token_hex(8)
    unique_filename = f"{int(secrets.randbelow(1000000))}-{random_hex}{file_ext}"
    file_path = UPLOADS_DIR / unique_filename

    with open(file_path, "wb") as f:
        f.write(contents)

    attachment = ComplaintAttachment(
        grievance_id=None,  # Linked upon grievance submission
        uploaded_by=current_user.id,
        file_path=unique_filename,
        file_name=photo.filename or unique_filename,
        file_type=photo.content_type or "image/jpeg",
        file_size=file_size,
    )

    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return AttachmentUploadOut(
        attachment_id=attachment.id,
        file_name=attachment.file_name,
        file_size=attachment.file_size,
        file_type=attachment.file_type,
    )
