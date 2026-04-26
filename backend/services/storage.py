import boto3, os, hashlib
from botocore.exceptions import ClientError

DOCUMENTS_BUCKET = os.getenv("DOCUMENTS_BUCKET")
AUDIO_BUCKET = os.getenv("AUDIO_BUCKET")
REGION = os.getenv("AWS_REGION_NAME", "us-east-1")

s3 = boto3.client("s3", region_name=REGION)


# --- Documents ---

def upload_document(filename: str, content: str) -> str:
    """Upload MD content to S3, return the S3 key."""
    key = f"documents/{filename}"
    s3.put_object(
        Bucket=DOCUMENTS_BUCKET,
        Key=key,
        Body=content.encode("utf-8"),
        ContentType="text/markdown",
    )
    return key

def fetch_document(s3_key: str) -> str:
    """Fetch MD content from S3, return as string."""
    response = s3.get_object(Bucket=DOCUMENTS_BUCKET, Key=s3_key)
    return response["Body"].read().decode("utf-8")

def delete_document(s3_key: str):
    s3.delete_object(Bucket=DOCUMENTS_BUCKET, Key=s3_key)


# --- Audio cache ---

def audio_cache_key(text: str) -> str:
    return f"audio/{hashlib.md5(text.encode()).hexdigest()}.mp3"

def audio_exists(cache_key: str) -> bool:
    try:
        s3.head_object(Bucket=AUDIO_BUCKET, Key=cache_key)
        return True
    except ClientError:
        return False

def upload_audio(cache_key: str, audio_bytes: bytes):
    s3.put_object(
        Bucket=AUDIO_BUCKET,
        Key=cache_key,
        Body=audio_bytes,
        ContentType="audio/mpeg",
    )

def get_audio_presigned_url(cache_key: str, expires_in: int = 3600) -> str:
    """Return a presigned URL so the browser streams audio directly from S3."""
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": AUDIO_BUCKET, "Key": cache_key},
        ExpiresIn=expires_in,
    )
