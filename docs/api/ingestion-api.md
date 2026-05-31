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
  - `dataset` (default: `default`) — no P0 representa o `collection_slug` da coleção.

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


### `GET /v1/ingestions`
Lista ingestões recentes do tenant autenticado usando o read model de UI no Firestore.

Query params:
- `limit` (default `20`, máximo `100`)
- `collection` (opcional; normalizado como slug)
- `status` (opcional)

Response (200):
```json
{
  "items": [
    {
      "tenant_id": "acme",
      "ingestion_id": "uuid",
      "status": "silver_ready",
      "collection_slug": "vendas",
      "file": { "name": "vendas.csv", "gcs_uri": "gs://..." },
      "artifacts_summary": { "landing": "gs://...", "silver": "project.dataset.table" },
      "last_error": null,
      "updated_at": "2026-05-31T00:00:00Z"
    }
  ],
  "limit": 20
}
```

### `GET /v1/ingestions/{ingestion_id}`
Retorna status e artefatos.

Response (200):
- `ingestion_id`
- `tenant_id`
- `status`
- `artifacts[]` (landing/bronze/silver/quarantine)
- `errors[]` (se houver)

Observacoes do estado atual:
- o endpoint tambem mescla o read model do Firestore para a UI.
- campos como `collection_slug`, `file`, `artifacts_summary`, `stage`, `overview_status`, `overview_started_at`, `overview_ready_at`, `overview_error` e `technical_summary` podem aparecer em `ingestion`.
- `technical_summary` resume o schema final da Silver e inclui:
  - `row_count`
  - `bq_table`
  - `schema_original`
  - `schema_normalized`
  - `column_mappings`
  - `cast_report`
  - `normalization_warnings`

### `GET /v1/ingestions/{ingestion_id}/overview`
Retorna o status da analise de overview para a ingestao do tenant autenticado.

Response (200):
```json
{
  "status": "ready",
  "started_at": "2026-05-31T00:00:00Z",
  "ready_at": "2026-05-31T00:00:10Z",
  "error": null,
  "overview": {
    "dataset_header": {},
    "ai_understanding": {},
    "summary": {},
    "schema": {},
    "preview_rows": [],
    "quality": {},
    "business_description": {},
    "terms": [],
    "relationships": []
  }
}
```

Regras:
- `status` segue `pending | running | ready | failed`.
- quando o payload ainda nao estiver pronto, a API retorna apenas o status resumido.
- o payload e derivado do BigQuery Silver + heuristicas deterministicas no backend; o frontend nao infere esses dados por conta propria.

### `POST /v1/ingestions/{ingestion_id}/overview/run`
Dispara ou re-dispara a analise de overview para uma ingestao `silver_ready`.

Regras MVP:
- permitido apenas para o mesmo `tenant_id` do token.
- a ingestao precisa estar em `silver_ready`.
- se ja existir overview `running`, a chamada retorna o status atual sem duplicar trabalho util.
- o backend agenda um Cloud Run Job dedicado (`overviewify`) com `tenant_id`, `ingestion_id` e a tabela Silver resolvida.

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
- `overview_status` quando a operacao tocar a etapa de overview
