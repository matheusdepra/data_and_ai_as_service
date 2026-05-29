# Terraform (GCP) - Dativerso Data Platform

Este diretorio provisiona o baseline do MVP:
- GCS buckets (landing/quarantine/bronze/silver)
- BigQuery dataset/tabelas de metadata
- Service accounts basicas
- (Opcional) Cloud Run services/jobs + Eventarc trigger (imagem via variavel)

## Requisitos
- Terraform >= 1.5
- Google provider (pinned em `versions.tf`)
- Credenciais com permissao de criar recursos no projeto GCP (ADC ou `GOOGLE_APPLICATION_CREDENTIALS`)

## Como usar (exemplo)
```bash
cd infra/terraform
terraform init
terraform plan -var="project_id=MY_PROJECT" -var="region=us-central1" -var="env=dev"
terraform apply -var="project_id=MY_PROJECT" -var="region=us-central1" -var="env=dev"
```

## Regiao vs Location (GCP)
- `region`: usado por Cloud Run/Eventarc/Artifact Registry. Ex.: `us-central1`. Nao use `US`.
- `bucket_location` e `bq_location`: podem ser multi-region `US` (recomendado no MVP).
- Para Cloud Storage triggers (Eventarc): a *location do trigger* precisa combinar com a location do bucket.
  - bucket `US` -> trigger `us`
  - bucket `EU` -> trigger `eu`

## IAM minimo para Storage -> Eventarc -> Cloud Run
O Terraform aplica os bindings essenciais para Storage triggers:
- `roles/eventarc.eventReceiver` para:
  - Compute Engine default SA (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`)
  - trigger SA (aqui: `sa-ingestion-router-*`)
- `roles/pubsub.publisher` para o Cloud Storage service agent:
  - `service-PROJECT_NUMBER@gs-project-accounts.iam.gserviceaccount.com`
- `roles/run.invoker` no service `ingestion-router` para a identidade do trigger

Opcional (projetos antigos): `grant_pubsub_token_creator=true` para Pub/Sub service agent.

## State (recomendado)
Nao rode em state local para ambientes compartilhados.
Use backend remoto com lock (GCS backend):
- copie `backend.tf.example` para `backend.tf` e configure o bucket de state
- rode `terraform init` novamente

## Variaveis principais
- `project_id` (obrigatorio)
- `region` (obrigatorio)
- `env` (`dev|stg|prod`)

## Buckets (unicidade global)
Buckets GCS sao globalmente unicos. Por padrao o nome inclui o `project_id` para evitar colisao.
Se precisar encurtar/padronizar, use `resource_suffix`.

## Cloud Run (deploy de imagens)
Os recursos de Cloud Run aceitam imagens prontas via variaveis (ex.: Artifact Registry).
Comece provisionando storage/bq/iam e depois configure as imagens:
- `ingestion_api_image`
- `ingestion_router_image`
- `bronzeify_image`
- `silverize_image`
- `identity_api_image` (Firebase Auth + Firestore membership)

Para o `identity-api`, configure tambem:
- `firebase_project_id`
- `frontend_base_url`

## API Gateway (entrypoint unico)
Opcionalmente, voce pode expor um entrypoint unico via **GCP API Gateway** (roteamento por path).
Habilite:
- `enable_api_gateway=true`

O hostname padrao sai no output `api_gateway.default_hostname`.

Para build/push local, use:
- `scripts/build_push_docker.sh` (ou `scripts/build_push.sh --docker`)
Sem Docker local (Cloud Build):
- `scripts/build_push_cloudbuild.sh` (ou `scripts/build_push.sh`)

Dica: para buildar apenas um servico:
- `./scripts/build_push.sh 0.1.0 --only identity-api`
