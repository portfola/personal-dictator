resource "aws_lambda_function" "api" {
  function_name = "${var.project}-api"
  role          = aws_iam_role.lambda.arn
  handler       = "main.handler"
  runtime       = "python3.12"
  memory_size   = var.lambda_memory
  timeout       = var.lambda_timeout

  # Deployed as a zip by GitHub Actions
  filename         = "${path.module}/../backend/lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/../backend/lambda.zip")

  environment {
    variables = {
      DOCUMENTS_BUCKET = aws_s3_bucket.documents.bucket
      AUDIO_BUCKET     = aws_s3_bucket.audio_cache.bucket
      DYNAMODB_TABLE   = aws_dynamodb_table.documents.name
      AWS_REGION_NAME  = var.aws_region
      # Secrets injected at deploy time by GitHub Actions via aws lambda update-function-configuration
      # ANTHROPIC_API_KEY, TOGETHER_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
    }
  }

  tags = { Project = var.project }

  # The Lambda's environment (incl. API-key secrets) is owned by the GitHub
  # Actions deploy, which sets it via update-function-configuration. Terraform
  # must not manage it, or `apply` would wipe the CI-injected secrets.
  lifecycle {
    ignore_changes = [environment, source_code_hash, filename]
  }
}

# Note: Lambda Function URL omitted — CloudFront routes to API Gateway, not directly to Lambda.
