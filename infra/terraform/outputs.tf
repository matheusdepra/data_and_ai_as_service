output "buckets" {
  value = {
    landing    = google_storage_bucket.landing.name
    quarantine = google_storage_bucket.quarantine.name
    bronze     = google_storage_bucket.bronze.name
    silver     = google_storage_bucket.silver.name
  }
}

output "meta_dataset" {
  value = google_bigquery_dataset.meta.dataset_id
}

output "service_accounts" {
  value = {
    ingestion_api    = google_service_account.ingestion_api.email
    ingestion_router = google_service_account.ingestion_router.email
    bronze_job       = google_service_account.bronze_job.email
    silver_job       = google_service_account.silver_job.email
    identity_api     = google_service_account.identity_api.email
  }
}

output "cloud_run" {
  value = {
    ingestion_api    = local.enable_ingestion_api ? google_cloud_run_v2_service.ingestion_api[0].name : null
    ingestion_router = local.enable_ingestion_router ? google_cloud_run_v2_service.ingestion_router[0].name : null
    identity_api     = local.enable_identity_api ? try(google_cloud_run_v2_service.identity_api[0].name, null) : null
    bronzeify_job    = local.enable_bronzeify_job ? google_cloud_run_v2_job.bronzeify[0].id : null
    silverize_job    = local.enable_silverize_job ? google_cloud_run_v2_job.silverize[0].id : null
    overviewify_job  = local.enable_overviewify_job ? google_cloud_run_v2_job.overviewify[0].id : null
  }
}

output "artifact_registry_repo" {
  value = google_artifact_registry_repository.containers.name
}

output "api_gateway" {
  value = {
    enabled          = local.enable_api_gateway
    gateway_name     = local.enable_api_gateway ? google_api_gateway_gateway.dativerso[0].name : null
    default_hostname = local.enable_api_gateway ? google_api_gateway_gateway.dativerso[0].default_hostname : null
  }
}
