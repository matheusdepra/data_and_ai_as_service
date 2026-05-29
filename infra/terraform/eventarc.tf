locals {
  enable_eventarc_trigger = local.enable_ingestion_router
  # Eventarc trigger location must match the bucket location:
  # - bucket_location = "US"  -> trigger location = "us"
  # - bucket_location = "EU"  -> trigger location = "eu"
  # - bucket_location = "us-central1" -> trigger location = "us-central1"
  eventarc_location = lower(var.bucket_location)
}

# Routes Cloud Storage finalize events -> Cloud Run service ingestion-router.
resource "google_eventarc_trigger" "landing_finalize" {
  count      = local.enable_eventarc_trigger ? 1 : 0
  name       = "${local.name_prefix}-landing-finalize"
  location   = local.eventarc_location
  depends_on = [google_project_service.required]

  matching_criteria {
    attribute = "type"
    value     = "google.cloud.storage.object.v1.finalized"
  }

  matching_criteria {
    attribute = "bucket"
    value     = google_storage_bucket.landing.name
  }

  destination {
    cloud_run_service {
      service = google_cloud_run_v2_service.ingestion_router[0].name
      region  = var.region
    }
  }

  service_account = google_service_account.ingestion_router.email
}
