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
- `ai_assistant_api_image`
- `ingestion_api_image`
- `ingestion_router_image`
- `bronzeify_image`
- `silverize_image`
- `overviewify_image`
- `identity_api_image` (Firebase Auth + Firestore membership)

Para o `identity-api`, configure tambem:
- `firebase_project_id`
- `frontend_base_url`

Para o `ai-assistant-api`, os defaults do Terraform agora assumem:
- `ai_assistant_llm_provider = "vertex_ai"`
- `ai_assistant_vertex_model_name = "gemini-2.5-flash"`

Esses valores podem ser sobrescritos em `terraform.tfvars`.

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
- `./scripts/build_push.sh 0.1.0 --only ai-assistant-api`
- `./scripts/build_push.sh --only identity-api --update-tfvars`

Sem informar tag, o script consulta o Artifact Registry por imagem, ignora tags nao semanticas como `dev` e usa a proxima versao numerica de cada servico.
Exemplo:
- `ai-assistant-api`: ultima tag `0.1.2` -> nova tag `0.1.3`
- `identity-api`: ultima tag `1.1` -> nova tag `1.2`
- `ingestion-api`: ultima tag `0.1.6` -> nova tag `0.1.7`

Se voce usar `--update-tfvars`, o script atualiza automaticamente as chaves de imagem correspondentes em `infra/terraform/terraform.tfvars` apos o push.

## Overview backend
O fluxo de overview do dataset usa um Cloud Run Job dedicado:
- `overviewify`

Quando `overviewify_image` estiver preenchida:
- o Terraform cria o job `overviewify`
- `ingestion-api` pode disparar `POST /v1/ingestions/{ingestion_id}/overview/run`
- `silverize` pode disparar automaticamente a analise apos `silver_ready`

Permissoes aplicadas:
- `ingestion-api` e `silverize` recebem permissao de `run.invoker` no job `overviewify`

## AI Assistant API
O backend conversacional/agêntico roda como servico separado:
- `ai-assistant-api`

Quando `ai_assistant_api_image` estiver preenchida:
- o Terraform cria o service `ai-assistant-api`
- o build script aceita `--only ai-assistant-api`
- a exposicao publica e opcional via `ai_assistant_api_invokers`

Nesta etapa, ele nao entra automaticamente no API Gateway publico. A integracao com `ingestion-api` deve acontecer por contrato de backend e auth consistente.
