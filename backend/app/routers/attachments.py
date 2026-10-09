import os
import uuid
import secrets
from io import BytesIO
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
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB (spec requirement)
MAX_PIXEL_DIMENSION = 6000       # cap extreme dimensions to prevent decompression bombs

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
            detail="Please upload a JPG, PNG or WEBP image under 5 MB."
        )

    # Read contents and enforce size limit
    contents = await photo.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds 5 MB limit. Your file is {round(file_size / (1024*1024), 1)} MB."
        )

    # Step 1: Verify it is a valid image using Pillow (open, not verify — verify() closes the buffer)
    try:
        img = Image.open(BytesIO(contents))
        img.load()  # Force decoding — catches truncated/corrupt images
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupt image file."
        )

    # Step 2: Cap extreme pixel dimensions to prevent decompression bombs
    w, h = img.size
    if w > MAX_PIXEL_DIMENSION or h > MAX_PIXEL_DIMENSION:
        img.thumbnail((MAX_PIXEL_DIMENSION, MAX_PIXEL_DIMENSION), Image.LANCZOS)

    # Step 3: Strip EXIF/GPS metadata by re-encoding through Pillow
    # Convert to RGB first (handles RGBA PNG, palette images, etc.)
    if img.mode in ("RGBA", "P", "LA"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "RGBA":
            background.paste(img, mask=img.split()[3])
        else:
            background.paste(img)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Determine output format
    save_ext = ".jpg"
    save_format = "JPEG"
    if file_ext in (".png",) and photo.content_type == "image/png":
        save_ext = ".png"
        save_format = "PNG"
    elif file_ext == ".webp":
        save_ext = ".webp"
        save_format = "WEBP"

    # Re-encode without EXIF — this is the EXIF strip
    clean_buffer = BytesIO()
    if save_format == "JPEG":
        img.save(clean_buffer, format="JPEG", quality=88, optimize=True)
    elif save_format == "PNG":
        img.save(clean_buffer, format="PNG", optimize=True)
    else:
        img.save(clean_buffer, format="WEBP", quality=88)

    clean_bytes = clean_buffer.getvalue()

    # Generate random filename — never expose original name on disk
    random_hex = secrets.token_hex(16)
    unique_filename = f"{random_hex}{save_ext}"
    file_path = UPLOADS_DIR / unique_filename

    with open(file_path, "wb") as f:
        f.write(clean_bytes)

    attachment = ComplaintAttachment(
        grievance_id=None,  # Linked upon grievance submission
        uploaded_by=current_user.id,
        file_path=unique_filename,
        file_name=photo.filename or unique_filename,
        file_type=photo.content_type or "image/jpeg",
        file_size=len(clean_bytes),
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
