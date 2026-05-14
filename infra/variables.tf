variable "aws_region" {
  default = "us-east-2"
}

variable "project" {
  default = "personal-dictator"
}

variable "lambda_memory" {
  default = 512
}

variable "lambda_timeout" {
  default = 30
}

variable "github_repo" {
  description = "GitHub repo (owner/name) allowed to assume the deploy role via OIDC"
  default     = "portfola/personal-dictator"
}
