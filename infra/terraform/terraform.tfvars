project_id      = "daas-mvp-472103"
env             = "dev"

# Cloud Run/Eventarc/Artifact Registry are regional. Use a Cloud Run region (not "US").
region          = "us-central1"

# BigQuery + GCS can be multi-region "US" (good default for cost/simplicity).
bq_location     = "US"
bucket_location = "US"

# Dev-only suggestion:
auth_mode = "unverified_jwt"

# When you deploy production auth, fill these:
auth_jwks_url = ""
auth_issuer   = ""
auth_audience = ""

# In dev, you can expose the API publicly (recommend restricting in prod).
ingestion_api_invokers = ["allUsers"]

# Container images (set after you push to Artifact Registry).
ingestion_api_image = "us-central1-docker.pkg.dev/daas-mvp-472103/dativerso-dev/ingestion-api:0.1.9"
ingestion_router_image = "us-central1-docker.pkg.dev/daas-mvp-472103/dativerso-dev/ingestion-router:0.1.4"
bronzeify_image = "us-central1-docker.pkg.dev/daas-mvp-472103/dativerso-dev/bronzeify:0.1.4"
silverize_image = "us-central1-docker.pkg.dev/daas-mvp-472103/dativerso-dev/silverize:0.1.4"
overviewify_image = "us-central1-docker.pkg.dev/daas-mvp-472103/dativerso-dev/overviewify:0.1.0"
identity_api_image = "us-central1-docker.pkg.dev/daas-mvp-472103/dativerso-dev/identity-api:0.1.8"
ai_assistant_api_image = "us-central1-docker.pkg.dev/daas-mvp-472103/dativerso-dev/ai-assistant-api:0.1.14"

enable_api_gateway = true
firebase_project_id = "daas-mvp-472103"
frontend_base_url = "http://localhost:5173"

# Firestore database bootstrap (one-time). Keep false after it exists.
create_firestore_database = false
firestore_location_id    = "nam5"

# Controla acesso do ai assistant API (deixe vazio para liberar, ou coloque o email do service account do frontend)
ai_assistant_api_invokers = ["allUsers"]

# Variaveis para AI Assistant
ai_assistant_llm_provider = "vertex_ai"
ai_assistant_vertex_model_name = "gemini-2.5-flash"
