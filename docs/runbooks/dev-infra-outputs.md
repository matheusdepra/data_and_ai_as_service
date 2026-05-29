# Infra Outputs (dev)

Data de referencia: 2026-05-27

## API Gateway

- `enabled`: `true`
- `default_hostname`: `dativerso-dev-gw-aoluhelr.uc.gateway.dev`
- `base_url`: `https://dativerso-dev-gw-aoluhelr.uc.gateway.dev`
- `gateway_name`: `projects/daas-mvp-472103/locations/us-central1/gateways/dativerso-dev-gw`

## Artifact Registry

- `artifact_registry_repo`: `dativerso-dev`

## Buckets

- `landing`: `gs://dativerso-dev-daas-mvp-472103-dl-landing`
- `bronze`: `gs://dativerso-dev-daas-mvp-472103-dl-bronze`
- `silver`: `gs://dativerso-dev-daas-mvp-472103-dl-silver`
- `quarantine`: `gs://dativerso-dev-daas-mvp-472103-dl-quarantine`

## Cloud Run / Jobs

- `identity_api`: `dativerso-dev-identity-api`
- `ingestion_api`: `dativerso-dev-ingestion-api`
- `ingestion_router`: `dativerso-dev-ingestion-router`
- `bronzeify_job`: `projects/daas-mvp-472103/locations/us-central1/jobs/dativerso-dev-bronzeify`
- `silverize_job`: `projects/daas-mvp-472103/locations/us-central1/jobs/dativerso-dev-silverize`

## BigQuery

- `meta_dataset`: `dv_dev_meta`

## Service Accounts

- `identity_api`: `sa-identity-api-dev@daas-mvp-472103.iam.gserviceaccount.com`
- `ingestion_api`: `sa-ingestion-api-dev@daas-mvp-472103.iam.gserviceaccount.com`
- `ingestion_router`: `sa-ingestion-router-dev@daas-mvp-472103.iam.gserviceaccount.com`
- `bronze_job`: `sa-bronze-job-dev@daas-mvp-472103.iam.gserviceaccount.com`
- `silver_job`: `sa-silver-job-dev@daas-mvp-472103.iam.gserviceaccount.com`

## Notas operacionais

- Gateway publico atual: `https://dativerso-dev-gw-aoluhelr.uc.gateway.dev`
- As rotas protegidas no gateway exigem:
  - `Authorization: Bearer <firebase_id_token>`
  - `x-api-key: <api_gateway_key>`
- A `API key` deve ser criada no mesmo projeto do gateway (`daas-mvp-472103`) ou em um projeto onde o managed service do gateway esteja habilitado
- O managed service do gateway segue o padrao `*.apigateway.daas-mvp-472103.cloud.goog` e pode exigir alguns minutos de propagacao apos o apply
- O upload continua entrando por `POST /v1/files`
- O acompanhamento de ingestao continua em `GET /v1/ingestions/{ingestion_id}`
