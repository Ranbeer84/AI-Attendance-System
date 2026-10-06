import io

from PIL import Image, ImageOps

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_DIMENSION = 1024
JPEG_QUALITY = 85


class InvalidImageError(Exception):
    pass


def validate_image_upload(content_type: str, size_bytes: int, max_size_mb: int) -> None:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise InvalidImageError(
            f"Unsupported file type '{content_type}'. Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}"
        )
    max_bytes = max_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise InvalidImageError(f"File too large. Max allowed size is {max_size_mb}MB")


def process_profile_photo(file_bytes: bytes) -> tuple[bytes, str]:
    """
    Fixes EXIF orientation, converts to RGB, downsizes if needed,
    and re-encodes as JPEG. Returns (processed_bytes, content_type).
    """
    try:
        image = Image.open(io.BytesIO(file_bytes))
    except Exception as exc:
        raise InvalidImageError("Could not read image file") from exc

    image = ImageOps.exif_transpose(image)  # fix rotation from phone cameras

    if image.mode != "RGB":
        image = image.convert("RGB")

    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION))

    output = io.BytesIO()
    image.save(output, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return output.getvalue(), "image/jpeg"