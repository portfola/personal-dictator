output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "api_gateway_url" {
  value = aws_apigatewayv2_api.main.api_endpoint
}

output "documents_bucket" {
  value = aws_s3_bucket.documents.bucket
}

output "audio_bucket" {
  value = aws_s3_bucket.audio_cache.bucket
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}
