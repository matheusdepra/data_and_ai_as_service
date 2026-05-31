locals {
  enable_ai_assistant_api = var.ai_assistant_api_image != ""
  enable_ingestion_api    = var.ingestion_api_image != ""
  enable_ingestion_router = var.ingestion_router_image != ""
  enable_bronzeify_job    = var.bronzeify_image != ""
  enable_silverize_job    = var.silverize_image != ""
  enable_overviewify_job  = var.overviewify_image != ""
  enable_identity_api     = var.identity_api_image != ""
}

resource "google_cloud_run_v2_service" "ai_assistant_api" {
  count      = local.enable_ai_assistant_api ? 1 : 0
  name       = "${local.name_prefix}-ai-assistant-api"
  location   = var.region
  depends_on = [google_project_service.required]

  template {
    service_account = google_service_account.ai_assistant_api.email
    containers {
      image = var.ai_assistant_api_image
      env {
        name  = "CHAT_ENVIRONMENT"
        value = var.env
      }
      env {
        name  = "CHAT_GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "CHAT_GCP_LOCATION"
        value = var.region
      }
      env {
        name  = "CHAT_LLM_PROVIDER"
        value = var.ai_assistant_llm_provider
      }
      env {
        name  = "CHAT_VERTEX_MODEL_NAME"
        value = var.ai_assistant_vertex_model_name
      }
      env {
        name  = "CHAT_INGESTION_API_BASE_URL"
        value = local.enable_ingestion_api ? google_cloud_run_v2_service.ingestion_api[0].uri : ""
      }
      env {
        name  = "CHAT_CORS_ORIGINS"
        value = jsonencode(compact([var.frontend_base_url]))
      }
    }
  }
}

resource "google_cloud_run_v2_service" "ingestion_api" {
  count      = local.enable_ingestion_api ? 1 : 0
  name       = "${local.name_prefix}-ingestion-api"
  location   = var.region
  depends_on = [google_project_service.required]

  template {
    service_account = google_service_account.ingestion_api.email
    containers {
      image = var.ingestion_api_image
      env {
        name  = "DV_ENV"
        value = var.env
      }
      env {
        name  = "GCS_LANDING_BUCKET"
        value = google_storage_bucket.landing.name
      }
      env {
        name  = "BQ_META_DATASET"
        value = google_bigquery_dataset.meta.dataset_id
      }
      env {
        name  = "AUTH_MODE"
        value = var.auth_mode
      }
      env {
        name  = "AUTH_TENANT_CLAIM"
        value = var.auth_tenant_claim
      }
      env {
        name  = "AUTH_JWKS_URL"
        value = var.auth_jwks_url
      }
      env {
        name  = "AUTH_ISSUER"
        value = var.auth_issuer
      }
      env {
        name  = "AUTH_AUDIENCE"
        value = var.auth_audience
      }
      env {
        name  = "IDENTITY_API_BASE_URL"
        value = local.enable_identity_api ? google_cloud_run_v2_service.identity_api[0].uri : ""
      }
      env {
        name  = "OVERVIEWIFY_JOB_NAME"
        value = local.enable_overviewify_job ? google_cloud_run_v2_job.overviewify[0].id : ""
      }
    }
  }
}

resource "google_cloud_run_v2_service" "ingestion_router" {
  count      = local.enable_ingestion_router ? 1 : 0
  name       = "${local.name_prefix}-ingestion-router"
  location   = var.region
  depends_on = [google_project_service.required]

  template {
    service_account = google_service_account.ingestion_router.email
    containers {
      image = var.ingestion_router_image
      env {
        name  = "DV_ENV"
        value = var.env
      }
      env {
        name  = "BQ_META_DATASET"
        value = google_bigquery_dataset.meta.dataset_id
      }
      env {
        name  = "GCS_BRONZE_BUCKET"
        value = google_storage_bucket.bronze.name
      }
      env {
        name  = "GCS_QUARANTINE_BUCKET"
        value = google_storage_bucket.quarantine.name
      }
      env {
        name  = "BRONZEIFY_JOB_NAME"
        value = local.enable_bronzeify_job ? google_cloud_run_v2_job.bronzeify[0].id : ""
      }
      env {
        name  = "SILVERIZE_JOB_NAME"
        value = local.enable_silverize_job ? google_cloud_run_v2_job.silverize[0].id : ""
      }
    }
  }
}

resource "google_cloud_run_v2_service" "identity_api" {
  count      = local.enable_identity_api ? 1 : 0
  name       = "${local.name_prefix}-identity-api"
  location   = var.region
  depends_on = [google_project_service.required]

  template {
    service_account = google_service_account.identity_api.email
    containers {
      image = var.identity_api_image
      env {
        name  = "DV_ENV"
        value = var.env
      }
      env {
        name  = "FIREBASE_PROJECT_ID"
        value = var.firebase_project_id
      }
      env {
        name  = "FRONTEND_BASE_URL"
        value = var.frontend_base_url
      }
      # Optional overrides; if empty, identity-api derives defaults from FIREBASE_PROJECT_ID.
      env {
        name  = "AUTH_MODE"
        value = "oidc_jwks"
      }
      env {
        name  = "AUTH_JWKS_URL"
        value = var.auth_jwks_url
      }
      env {
        name  = "AUTH_ISSUER"
        value = var.auth_issuer
      }
      env {
        name  = "AUTH_AUDIENCE"
        value = var.auth_audience
      }
    }
  }
}

# Invokers
resource "google_cloud_run_v2_service_iam_member" "ingestion_api_invokers" {
  for_each = local.enable_ingestion_api ? toset(var.ingestion_api_invokers) : toset([])

  name     = google_cloud_run_v2_service.ingestion_api[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = each.value
}

resource "google_cloud_run_v2_service_iam_member" "ai_assistant_api_invokers" {
  for_each = local.enable_ai_assistant_api ? toset(var.ai_assistant_api_invokers) : toset([])

  name     = google_cloud_run_v2_service.ai_assistant_api[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = each.value
}

resource "google_cloud_run_v2_service_iam_member" "ingestion_api_invoker_ai_assistant_api" {
  count = local.enable_ingestion_api && local.enable_ai_assistant_api ? 1 : 0

  name     = google_cloud_run_v2_service.ingestion_api[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.ai_assistant_api.email}"
}

resource "google_cloud_run_v2_service_iam_member" "identity_invoker_ingestion_api" {
  count = local.enable_ingestion_api && local.enable_identity_api ? 1 : 0

  name     = google_cloud_run_v2_service.identity_api[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.ingestion_api.email}"
}

# Eventarc uses this identity to invoke the router service; grant it explicitly.
resource "google_cloud_run_v2_service_iam_member" "router_invoker" {
  count    = local.enable_ingestion_router ? 1 : 0
  name     = google_cloud_run_v2_service.ingestion_router[0].name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.ingestion_router.email}"
}

resource "google_cloud_run_v2_job" "bronzeify" {
  count      = local.enable_bronzeify_job ? 1 : 0
  name       = "${local.name_prefix}-bronzeify"
  location   = var.region
  depends_on = [google_project_service.required]

  template {
    template {
      service_account = google_service_account.bronze_job.email
      containers {
        image = var.bronzeify_image
        env {
          name  = "DV_ENV"
          value = var.env
        }
        env {
          name  = "BQ_META_DATASET"
          value = google_bigquery_dataset.meta.dataset_id
        }
        env {
          name  = "GCS_LANDING_BUCKET"
          value = google_storage_bucket.landing.name
        }
        env {
          name  = "GCS_BRONZE_BUCKET"
          value = google_storage_bucket.bronze.name
        }
        env {
          name  = "GCS_QUARANTINE_BUCKET"
          value = google_storage_bucket.quarantine.name
        }
        env {
          name  = "SILVERIZE_JOB_NAME"
          value = local.enable_silverize_job ? google_cloud_run_v2_job.silverize[0].id : ""
        }
      }
    }
  }
}

resource "google_cloud_run_v2_job" "silverize" {
  count      = local.enable_silverize_job ? 1 : 0
  name       = "${local.name_prefix}-silverize"
  location   = var.region
  depends_on = [google_project_service.required]

  template {
    template {
      service_account = google_service_account.silver_job.email
      containers {
        image = var.silverize_image
        env {
          name  = "DV_ENV"
          value = var.env
        }
        env {
          name  = "BQ_META_DATASET"
          value = google_bigquery_dataset.meta.dataset_id
        }
        env {
          name  = "BQ_LOCATION"
          value = var.bq_location
        }
        env {
          name  = "GCS_BRONZE_BUCKET"
          value = google_storage_bucket.bronze.name
        }
        env {
          name  = "OVERVIEWIFY_JOB_NAME"
          value = local.enable_overviewify_job ? google_cloud_run_v2_job.overviewify[0].id : ""
        }
      }
    }
  }
}

resource "google_cloud_run_v2_job" "overviewify" {
  count      = local.enable_overviewify_job ? 1 : 0
  name       = "${local.name_prefix}-overviewify"
  location   = var.region
  depends_on = [google_project_service.required]

  template {
    template {
      service_account = google_service_account.silver_job.email
      containers {
        image = var.overviewify_image
        env {
          name  = "DV_ENV"
          value = var.env
        }
      }
    }
  }
}

# Allow router to execute jobs (when enabled)
resource "google_cloud_run_v2_job_iam_member" "router_run_bronze" {
  count    = local.enable_bronzeify_job && local.enable_ingestion_router ? 1 : 0
  name     = google_cloud_run_v2_job.bronzeify[0].id
  location = var.region
  # Router executes jobs with env overrides.
  role   = "roles/run.jobsExecutorWithOverrides"
  member = "serviceAccount:${google_service_account.ingestion_router.email}"
}

resource "google_cloud_run_v2_job_iam_member" "router_run_silver" {
  count    = local.enable_silverize_job && local.enable_ingestion_router ? 1 : 0
  name     = google_cloud_run_v2_job.silverize[0].id
  location = var.region
  role     = "roles/run.jobsExecutorWithOverrides"
  member   = "serviceAccount:${google_service_account.ingestion_router.email}"
}

resource "google_cloud_run_v2_job_iam_member" "silver_run_overview" {
  count    = local.enable_overviewify_job && local.enable_silverize_job ? 1 : 0
  name     = google_cloud_run_v2_job.overviewify[0].id
  location = var.region
  role     = "roles/run.jobsExecutorWithOverrides"
  member   = "serviceAccount:${google_service_account.silver_job.email}"
}

resource "google_cloud_run_v2_job_iam_member" "ingestion_api_run_overview" {
  count    = local.enable_overviewify_job && local.enable_ingestion_api ? 1 : 0
  name     = google_cloud_run_v2_job.overviewify[0].id
  location = var.region
  role     = "roles/run.jobsExecutorWithOverrides"
  member   = "serviceAccount:${google_service_account.ingestion_api.email}"
}
