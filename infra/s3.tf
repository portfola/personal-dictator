# Documents bucket
resource "aws_s3_bucket" "documents" {
  bucket = "${var.project}-documents"
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket                  = aws_s3_bucket.documents.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Audio cache bucket
resource "aws_s3_bucket" "audio_cache" {
  bucket = "${var.project}-audio-cache"
}

resource "aws_s3_bucket_public_access_block" "audio_cache" {
  bucket                  = aws_s3_bucket.audio_cache.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle: auto-delete audio cache after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "audio_cache" {
  bucket = aws_s3_bucket.audio_cache.id
  rule {
    id     = "expire-audio"
    status = "Enabled"
    filter {}
    expiration { days = 30 }
  }
}

# Frontend bucket (private — served via CloudFront)
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project}-frontend"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Allow CloudFront OAC to read frontend bucket
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}
