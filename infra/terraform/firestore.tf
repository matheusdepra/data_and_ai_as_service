locals {
  enable_firestore_db = var.create_firestore_database
}

# Firestore "default" database is a singleton per project.
# Creating it is a one-time action and location cannot be changed afterwards.
resource "google_firestore_database" "default" {
  count = local.enable_firestore_db ? 1 : 0

  name        = "(default)"
  location_id = var.firestore_location_id
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.required]
}

