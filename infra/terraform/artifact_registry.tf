resource "google_artifact_registry_repository" "containers" {
  location      = var.region
  repository_id = "dativerso-${var.env}"
  description   = "Dativerso containers (${var.env})"
  format        = "DOCKER"

  depends_on = [google_project_service.required]
}

