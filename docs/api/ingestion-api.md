# API de Ingestao (MVP)

## Objetivo
Receber arquivos (CSV/JSON/Parquet) via REST, persistir em `GCS landing` e disparar o pipeline para Bronze/Silver.

## Autenticacao e tenant
- Autenticacao via token (ex.: JWT/OIDC).
- No MVP comercial (Firebase + Membership store), `tenant_id` e resolvido via `identity-api` (`GET /v1/me`) a partir do token do usuario.
- No modo dev/legado, `tenant_id` pode ser extraido de um claim do token (configuravel; recomendado: `tenant_id`).
- O cliente nao pode informar `tenant_id` via header/body/path.

Nota (API Gateway):
- quando a API esta na frente do **GCP API Gateway**, o backend deve priorizar `X-Apigateway-Api-Userinfo` e pode usar `X-Forwarded-Authorization` como fallback.
- no gateway publico, as chamadas tambem exigem `x-api-key`.

## Endpoints (proposta)

### `POST /v1/files`
Upload de arquivo.

Request:
- `Content-Type: multipart/form-data`
- Campo `file`: arquivo
- Campos opcionais:
  - `source` (default: `upload`)
  - `dataset` (default: `default`)

Response (201):
- `ingestion_id`
- `tenant_id`
- `gcs_uri_landing`
- `status` (inicialmente `landed`)
- `created_at`

Erros:
- 401/403: token invalido / claim ausente
- 413: arquivo muito grande
- 415: formato nao suportado

### `GET /v1/ingestions/{ingestion_id}`
Retorna status e artefatos.

Response (200):
- `ingestion_id`
- `tenant_id`
- `status`
- `artifacts[]` (landing/bronze/silver/quarantine)
- `errors[]` (se houver)

### `POST /v1/ingestions/{ingestion_id}:reprocess`
Reprocessa a partir do landing (ou da camada indicada, no futuro).

Regras MVP:
- permitido apenas para o mesmo `tenant_id` do token.
- reprocessamento idempotente por `ingestion_id`.

## Limites (MVP)
- Tamanho maximo por arquivo: definir (ex.: 200MB) e documentar.
- Tipos suportados:
  - `text/csv`, `application/csv`
  - `application/json`, `text/json`
  - `application/octet-stream` (parquet) com validacao de assinatura

## Observabilidade
Logs por request devem incluir:
- `tenant_id`
- `ingestion_id`
- `request_id` (trace)
