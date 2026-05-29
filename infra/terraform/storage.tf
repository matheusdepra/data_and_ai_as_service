resource "google_storage_bucket" "landing" {
  name                        = local.bucket_landing
  location                    = var.bucket_location
  uniform_bucket_level_access = true
  depends_on                  = [google_project_service.required]

  # Versioning can help with forensic/debug, but increases storage costs.
  versioning {
    enabled = false
  }

  # TODO: lifecycle rules tuned per layer (docs/cost/guardrails.md)
}

resource "google_storage_bucket" "quarantine" {
  name                        = local.bucket_quarantine
  location                    = var.bucket_location
  uniform_bucket_level_access = true
  depends_on                  = [google_project_service.required]
  versioning { enabled = false }
}

resource "google_storage_bucket" "bronze" {
  name                        = local.bucket_bronze
  location                    = var.bucket_location
  uniform_bucket_level_access = true
  depends_on                  = [google_project_service.required]
  versioning { enabled = false }
}

resource "google_storage_bucket" "silver" {
  name                        = local.bucket_silver
  location                    = var.bucket_location
  uniform_bucket_level_access = true
  depends_on                  = [google_project_service.required]
  versioning { enabled = false }
}
