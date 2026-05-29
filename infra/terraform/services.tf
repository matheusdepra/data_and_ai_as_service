locals {
  required_services = toset([
    "iam.googleapis.com",
    "storage.googleapis.com",
    "bigquery.googleapis.com",
    "firestore.googleapis.com",
    "run.googleapis.com",
    "apigateway.googleapis.com",
    "servicemanagement.googleapis.com",
    "servicecontrol.googleapis.com",
    "apikeys.googleapis.com",
    "eventarc.googleapis.com",
    "pubsub.googleapis.com",
    "artifactregistry.googleapis.com",
  ])
}

resource "google_project_service" "required" {
  for_each = local.required_services

  service            = each.value
  disable_on_destroy = false
}
