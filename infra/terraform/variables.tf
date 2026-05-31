variable "project_id" {
  type        = string
  description = "GCP project id"
}

variable "region" {
  type        = string
  description = "GCP region for regional services (Cloud Run/Eventarc/Artifact Registry). Example: us-central1. Not BigQuery/GCS multi-region."
  validation {
    # Basic sanity: Cloud regions are like us-central1, europe-west1, southamerica-east1.
    condition     = can(regex("^[a-z]+-[a-z0-9-]+[0-9]$", var.region))
    error_message = "region must look like a Cloud region (e.g. us-central1), not a multi-region like US."
  }
}

variable "env" {
  type        = string
  description = "Environment: dev|stg|prod"
  validation {
    condition     = contains(["dev", "stg", "prod"], var.env)
    error_message = "env must be one of dev|stg|prod"
  }
}

variable "resource_suffix" {
  type        = string
  description = "Optional suffix appended to globally-unique resources like GCS buckets (e.g. project short name). Leave empty to use project_id."
  default     = ""
}

variable "bucket_location" {
  type        = string
  description = "Bucket location (ex.: US, southamerica-east1). Keep aligned with BigQuery dataset location."
  default     = "US"
}

variable "bq_location" {
  type        = string
  description = "BigQuery location (ex.: US, southamerica-east1). Keep aligned with bucket location."
  default     = "US"
}

# Ingestion API auth configuration (passed as env vars when ingestion_api_image is set)
variable "auth_mode" {
  type        = string
  description = "AUTH_MODE for ingestion-api: oidc_jwks|unverified_jwt"
  default     = "oidc_jwks"
  validation {
    condition     = contains(["oidc_jwks", "unverified_jwt"], var.auth_mode)
    error_message = "auth_mode must be one of oidc_jwks|unverified_jwt"
  }
}

variable "auth_tenant_claim" {
  type        = string
  description = "Token claim that contains tenant_id"
  default     = "tenant_id"
}

variable "auth_jwks_url" {
  type        = string
  description = "JWKS URL for OIDC JWT validation (required when auth_mode=oidc_jwks)"
  default     = ""
}

variable "auth_issuer" {
  type        = string
  description = "Expected issuer (required when auth_mode=oidc_jwks)"
  default     = ""
}

variable "auth_audience" {
  type        = string
  description = "Expected audience (required when auth_mode=oidc_jwks)"
  default     = ""
}

# Cloud Run invokers (IAM members)
variable "ingestion_api_invokers" {
  type        = list(string)
  description = "IAM members allowed to invoke ingestion-api (ex.: [\"allUsers\"] or [\"serviceAccount:...\"]). Empty = no additional invokers."
  default     = []
}

variable "grant_pubsub_token_creator" {
  type        = bool
  description = "If true, grants roles/iam.serviceAccountTokenCreator to the Pub/Sub service agent (only required for older projects)."
  default     = false
}

# Cloud Run images (optional; set when you are ready to deploy services/jobs)
variable "ingestion_api_image" {
  type        = string
  description = "Container image for ingestion-api (Cloud Run service). Empty disables resource creation."
  default     = ""
}

variable "ingestion_router_image" {
  type        = string
  description = "Container image for ingestion-router (Cloud Run service). Empty disables resource creation."
  default     = ""
}

variable "bronzeify_image" {
  type        = string
  description = "Container image for bronzeify (Cloud Run job). Empty disables resource creation."
  default     = ""
}

variable "silverize_image" {
  type        = string
  description = "Container image for silverize (Cloud Run job). Empty disables resource creation."
  default     = ""
}

variable "overviewify_image" {
  type        = string
  description = "Container image for overviewify (Cloud Run job). Empty disables resource creation."
  default     = ""
}

variable "identity_api_image" {
  type        = string
  description = "Container image for identity-api (Cloud Run service). Empty disables resource creation."
  default     = ""
}

variable "firebase_project_id" {
  type        = string
  description = "Firebase project id used to validate Firebase ID tokens (aud/iss)."
  default     = ""
}

variable "frontend_base_url" {
  type        = string
  description = "Base URL of the frontend (used to build invite login URLs)."
  default     = ""
}

variable "create_firestore_database" {
  type        = bool
  description = "If true, creates and manages the default Firestore database (only for greenfield projects). If Firestore already exists, keep false and import/manage separately."
  default     = false
}

variable "firestore_location_id" {
  type        = string
  description = "Firestore location id (e.g. nam5, southamerica-east1). Used only when create_firestore_database=true."
  default     = "nam5"
}

variable "enable_api_gateway" {
  type        = bool
  description = "If true, provisions a GCP API Gateway that routes to identity-api and ingestion-api."
  default     = false
}

variable "api_gateway_id" {
  type        = string
  description = "API Gateway gateway_id (must be unique within the project). If empty, a default based on env is used."
  default     = ""
}

variable "api_gateway_api_id" {
  type        = string
  description = "API Gateway api_id. If empty, a default based on env is used."
  default     = ""
}

variable "api_gateway_config_id" {
  type        = string
  description = "API Gateway api_config_id prefix. Terraform will append a unique suffix on each replacement to avoid 409 conflicts."
  default     = "v1"
}
