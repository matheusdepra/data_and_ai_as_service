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

Nota de evolucao:
- o payload de `overview` representa a camada **derivada** automaticamente.
- refinamentos semanticos feitos por usuario/agente devem ser armazenados separadamente e aplicados por overlay controlado.

### `GET /v1/ingestions/{ingestion_id}/overview/semantic`
Retorna os refinamentos semanticos persistidos para o overview da ingestao.

Objetivo:
- permitir que UI/agentes leiam correcoes de negocio feitas por humano ou IA
- manter separacao entre fatos tecnicos derivados e interpretacao semantica editavel

Response (200):
```json
{
  "tenant_id": "acme",
  "ingestion_id": "uuid",
  "base_version": "2026-05-31T20:18:00Z",
  "updated_at": "2026-05-31T20:25:10Z",
  "updated_by": {
    "sub": "user-123",
    "email": "ana@acme.com",
    "type": "user"
  },
  "semantic": {
    "dataset_header": {
      "classification": "Commercial / Marketing",
      "tags": ["Marketing", "Campaigns", "Leads"]
    },
    "ai_understanding": {
      "summary": "This dataset supports marketing campaign analysis and audience segmentation."
    },
    "business_description": {
      "business_area": "Marketing",
      "domain": "Campaign Performance",
      "data_type": "Master Data",
      "typical_usage": ["Campaign analytics", "Audience segmentation", "Performance reporting"]
    },
    "terms": ["Campaign", "Audience", "Lead Source"]
  }
}
```

### `PATCH /v1/ingestions/{ingestion_id}/overview/semantic`
Aplica refinamentos semanticos parciais no overview para a ingestao do tenant autenticado.

Objetivo:
- aceitar correcoes do usuario como:
  - "isso nao e CRM, e Marketing"
  - "refine a descricao"
  - "ajuste os termos de negocio"
- persistir apenas campos permitidos da camada semantica

Headers:
- `Authorization: Bearer <token>`
- `x-api-key: <api_key>` quando via gateway
- `If-Match: <base_version>` opcional, recomendado

Body exemplo:
```json
{
  "patch": {
    "dataset_header": {
      "classification": "Commercial / Marketing",
      "tags": ["Marketing", "Campaigns", "Leads"]
    },
    "business_description": {
      "business_area": "Marketing",
      "domain": "Campaign Performance",
      "typical_usage": ["Campaign analytics", "Audience segmentation", "Performance reporting"]
    },
    "terms": ["Campaign", "Audience", "Lead Source"]
  },
  "reason": "User clarified that the dataset belongs to marketing instead of CRM."
}
```

Regras:
- permitido apenas para o mesmo `tenant_id` do token.
- usuario precisa ter role compativel para edicao.
- o backend deve rejeitar campos fora do allowlist semantico.
- o patch e parcial; objetos fazem merge por chave.
- listas como `tags`, `terms` e `typical_usage` substituem o array inteiro.

Campos permitidos:
- `dataset_header.classification`
- `dataset_header.tags`
- `ai_understanding.summary`
- `business_description.business_area`
- `business_description.domain`
- `business_description.data_type`
- `business_description.typical_usage`
- `terms`

Campos proibidos:
- `summary.rows`
- `summary.columns`
- `summary.size_bytes`
- `summary.language`
- `summary.created_date`
- `quality.*`
- `schema.*`
- `preview_rows`
- `technical_summary.*`
- `relationships[*].confidence`
- qualquer outro campo tecnico derivado do dataset

Erro esperado para patch invalido:
```json
{
  "error": "invalid_patch",
  "message": "Patch contains fields outside the allowed semantic scope.",
  "invalid_paths": ["quality.overall_score", "schema.columns[0].inferred_type"]
}
```

### `POST /v1/ingestions/{ingestion_id}/overview/semantic/preview`
Opcional na implementacao inicial, mas recomendado.

Objetivo:
- validar e aplicar overlay do patch sem persistir
- permitir preview de mudancas antes da confirmacao do usuario

Uso esperado:
- agente gera proposta
- UI mostra diff/preview
- usuario confirma
- frontend chama `PATCH /overview/semantic`

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

## Contrato com `ai_assistant_api`
- `ingestion-api` continua sendo a fonte de verdade para contexto confiavel do dataset.
- para a tela `Dataset Overview`, o backend conversacional deve buscar contexto a partir de:
  - `GET /v1/ingestions/{ingestion_id}`
  - `GET /v1/ingestions/{ingestion_id}/overview`
  - `GET /v1/ingestions/{ingestion_id}/overview/semantic`
- o frontend nao deve montar nem enviar por conta propria fatos tecnicos do dataset como fonte de verdade para a IA.
- refinamentos semanticos aprovados pela conversa devem ser persistidos por:
  - `POST /v1/ingestions/{ingestion_id}/overview/semantic/preview`
  - `PATCH /v1/ingestions/{ingestion_id}/overview/semantic`
