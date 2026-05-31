resource "google_service_account" "ingestion_api" {
  account_id   = "sa-ingestion-api-${var.env}"
  display_name = "Dativerso ingestion-api (${var.env})"
}

resource "google_service_account" "ingestion_router" {
  account_id   = "sa-ingestion-router-${var.env}"
  display_name = "Dativerso ingestion-router (${var.env})"
}

resource "google_service_account" "bronze_job" {
  account_id   = "sa-bronze-job-${var.env}"
  display_name = "Dativerso bronzeify job (${var.env})"
}

resource "google_service_account" "silver_job" {
  account_id   = "sa-silver-job-${var.env}"
  display_name = "Dativerso silverize job (${var.env})"
}

resource "google_service_account" "identity_api" {
  account_id   = "sa-identity-api-${var.env}"
  display_name = "Dativerso identity-api (${var.env})"
}

# GCS permissions (bucket-level for MVP simplicity)
resource "google_storage_bucket_iam_member" "landing_writer" {
  bucket = google_storage_bucket.landing.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.ingestion_api.email}"
}

resource "google_storage_bucket_iam_member" "landing_reader_bronze" {
  bucket = google_storage_bucket.landing.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.bronze_job.email}"
}

resource "google_storage_bucket_iam_member" "quarantine_writer" {
  bucket = google_storage_bucket.quarantine.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.bronze_job.email}"
}

resource "google_storage_bucket_iam_member" "bronze_writer" {
  bucket = google_storage_bucket.bronze.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.bronze_job.email}"
}

resource "google_storage_bucket_iam_member" "bronze_reader_bronze" {
  bucket = google_storage_bucket.bronze.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.bronze_job.email}"
}

resource "google_storage_bucket_iam_member" "bronze_reader_silver" {
  bucket = google_storage_bucket.bronze.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.silver_job.email}"
}

# BigQuery metadata store permissions
resource "google_bigquery_dataset_iam_member" "meta_editor_api" {
  dataset_id = google_bigquery_dataset.meta.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.ingestion_api.email}"
}

resource "google_bigquery_dataset_iam_member" "meta_editor_bronze" {
  dataset_id = google_bigquery_dataset.meta.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.bronze_job.email}"
}

resource "google_bigquery_dataset_iam_member" "meta_editor_silver" {
  dataset_id = google_bigquery_dataset.meta.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.silver_job.email}"
}

resource "google_bigquery_dataset_iam_member" "meta_editor_router" {
  dataset_id = google_bigquery_dataset.meta.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.ingestion_router.email}"
}

# BigQuery jobs are created at the project level; dataset roles are not enough for load/query jobs.
resource "google_project_iam_member" "bq_jobuser_api" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.ingestion_api.email}"
}

resource "google_project_iam_member" "bq_jobuser_router" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.ingestion_router.email}"
}

resource "google_project_iam_member" "bq_jobuser_bronze" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.bronze_job.email}"
}

resource "google_project_iam_member" "bq_jobuser_silver" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.silver_job.email}"
}

resource "google_project_iam_member" "bq_user_silver" {
  project = var.project_id
  role    = "roles/bigquery.user"
  member  = "serviceAccount:${google_service_account.silver_job.email}"
}

# Firestore (datastore) permissions for identity-api
resource "google_project_iam_member" "datastore_user_identity_api" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.identity_api.email}"
}

# Firestore read model permissions for ingestion services/jobs.
resource "google_project_iam_member" "datastore_user_ingestion_api" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.ingestion_api.email}"
}

resource "google_project_iam_member" "datastore_user_ingestion_router" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.ingestion_router.email}"
}

resource "google_project_iam_member" "datastore_user_bronze_job" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.bronze_job.email}"
}

resource "google_project_iam_member" "datastore_user_silver_job" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.silver_job.email}"
}

# Router needs to execute jobs (run.invoker on jobs) - wired in cloudrun.tf when jobs are enabled.

# Bronzeify can optionally trigger silverize after producing bronze artifacts.
resource "google_cloud_run_v2_job_iam_member" "bronze_run_silver" {
  count    = local.enable_silverize_job && local.enable_bronzeify_job ? 1 : 0
  name     = google_cloud_run_v2_job.silverize[0].id
  location = var.region
  role     = "roles/run.jobsExecutorWithOverrides"
  member   = "serviceAccount:${google_service_account.bronze_job.email}"
}
