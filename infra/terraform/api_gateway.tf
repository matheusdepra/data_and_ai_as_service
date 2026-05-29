locals {
  enable_api_gateway = var.enable_api_gateway && local.enable_ingestion_api && local.enable_identity_api

  api_gateway_api_id    = var.api_gateway_api_id != "" ? var.api_gateway_api_id : "${local.name_prefix}"
  api_gateway_gateway_id = var.api_gateway_id != "" ? var.api_gateway_id : "${local.name_prefix}-gw"
  api_gateway_config_id = var.api_gateway_config_id != "" ? var.api_gateway_config_id : "v1"

  apigateway_service_agent = "service-${data.google_project.current.number}@gcp-sa-apigateway.iam.gserviceaccount.com"
}

resource "google_api_gateway_api" "dativerso" {
  provider = google-beta
  count    = local.enable_api_gateway ? 1 : 0

  api_id       = local.api_gateway_api_id
  display_name = "Dativerso API (${var.env})"
}

# API Gateway creates a managed service (*.apigateway.<project>.cloud.goog).
# When the gateway requires API keys, the consumer project of the key must have this
# managed service enabled as well. Since our API keys live in the same project for the MVP,
# enable it here to avoid manual post-deploy steps.
resource "google_project_service" "apigw_managed_service" {
  count = local.enable_api_gateway ? 1 : 0

  service            = google_api_gateway_api.dativerso[0].managed_service
  disable_on_destroy = false

  depends_on = [google_api_gateway_api.dativerso]
}

resource "google_api_gateway_api_config" "dativerso" {
  provider = google-beta
  count    = local.enable_api_gateway ? 1 : 0

  api                  = google_api_gateway_api.dativerso[0].api_id
  api_config_id_prefix = local.api_gateway_config_id

  openapi_documents {
    document {
      path = "openapi.yaml"
      contents = base64encode(
        templatefile("${path.module}/api_gateway/openapi.yaml.tftpl", {
          firebase_project_id = var.firebase_project_id != "" ? var.firebase_project_id : var.project_id
          identity_api_url    = google_cloud_run_v2_service.identity_api[0].uri
          ingestion_api_url   = google_cloud_run_v2_service.ingestion_api[0].uri
        })
      )
    }
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    google_project_service.required,
    google_project_service.apigw_managed_service,
  ]
}

resource "google_api_gateway_gateway" "dativerso" {
  provider = google-beta
  count    = local.enable_api_gateway ? 1 : 0

  gateway_id = local.api_gateway_gateway_id
  api_config = google_api_gateway_api_config.dativerso[0].id
  region     = var.region
}

# Allow API Gateway service agent to invoke private Cloud Run services.
resource "google_cloud_run_v2_service_iam_member" "apigw_invoker_identity" {
  count = local.enable_api_gateway ? 1 : 0

  name     = google_cloud_run_v2_service.identity_api[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${local.apigateway_service_agent}"
}

resource "google_cloud_run_v2_service_iam_member" "apigw_invoker_ingestion" {
  count = local.enable_api_gateway ? 1 : 0

  name     = google_cloud_run_v2_service.ingestion_api[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${local.apigateway_service_agent}"
}
