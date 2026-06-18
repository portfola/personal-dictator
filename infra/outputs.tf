output "app_url" {
  value = "https://${var.domain_name}"
}

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

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}
