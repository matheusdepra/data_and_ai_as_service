data "google_project" "current" {
  project_id = var.project_id
}

locals {
  # Eventarc documentation commonly requires granting roles/eventarc.eventReceiver to the Compute Engine default service account.
  compute_default_sa = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"

  # Cloud Storage service agent (used to publish Pub/Sub notifications for Cloud Storage events).
  storage_service_agent = "service-${data.google_project.current.number}@gs-project-accounts.iam.gserviceaccount.com"

  # Pub/Sub service agent (token creator role only needed for older projects; see docs).
  pubsub_service_agent = "service-${data.google_project.current.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "eventarc_event_receiver" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${local.compute_default_sa}"
}

# The service account used by the Eventarc trigger must be allowed to receive events.
resource "google_project_iam_member" "eventarc_event_receiver_router" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.ingestion_router.email}"
}

# Required for direct Cloud Storage events routed via Eventarc:
# Cloud Storage must be able to publish to Pub/Sub in this project.
resource "google_project_iam_member" "storage_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${local.storage_service_agent}"
}

# Optional: only needed if the Pub/Sub service agent was enabled on/before Apr 8, 2021.
resource "google_project_iam_member" "pubsub_token_creator" {
  count   = var.grant_pubsub_token_creator ? 1 : 0
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${local.pubsub_service_agent}"
}
