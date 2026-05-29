resource "google_bigquery_dataset" "meta" {
  dataset_id = local.meta_dataset_id
  location   = var.bq_location

  # Default expiration intentionally unset for auditability.
  depends_on = [google_project_service.required]
}

resource "google_bigquery_table" "ingestions" {
  dataset_id = google_bigquery_dataset.meta.dataset_id
  table_id   = "ingestions"

  schema = file("${path.module}/schemas/ingestions.json")
}

resource "google_bigquery_table" "artifacts" {
  dataset_id = google_bigquery_dataset.meta.dataset_id
  table_id   = "artifacts"

  schema = file("${path.module}/schemas/artifacts.json")
}

resource "google_bigquery_table" "ingestion_errors" {
  dataset_id = google_bigquery_dataset.meta.dataset_id
  table_id   = "ingestion_errors"

  schema = file("${path.module}/schemas/ingestion_errors.json")
}
