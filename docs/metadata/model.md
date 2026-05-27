# Metadata Store (MVP)

## Objetivo
Manter o estado do pipeline por `ingestion_id`, com rastreabilidade (artefatos), erros, e base para UI futura.

## Opcao escolhida (MVP)
BigQuery como metadata store (serverless e simples de operar no inicio).

Dataset sugerido:
- `dv_{env}_meta`

## Tabelas

### `ingestions`
Chave: (`tenant_id`, `ingestion_id`)

Campos sugeridos:
- `tenant_id` STRING (required)
- `ingestion_id` STRING (required)
- `status` STRING (required) - ver `docs/pipeline/ingestion-contract.md`
- `source` STRING
- `dataset` STRING
- `landed_gcs_uri` STRING
- `original_filename` STRING
- `content_type` STRING
- `size_bytes` INT64
- `checksum_sha256` STRING
- `received_at` TIMESTAMP
- `landed_at` TIMESTAMP
- `bronze_started_at` TIMESTAMP
- `bronze_ready_at` TIMESTAMP
- `silver_started_at` TIMESTAMP
- `silver_ready_at` TIMESTAMP
- `updated_at` TIMESTAMP

### `artifacts`
Chave: (`tenant_id`, `ingestion_id`, `layer`, `artifact_id`)

Campos sugeridos:
- `tenant_id` STRING (required)
- `ingestion_id` STRING (required)
- `layer` STRING (required) - `landing|quarantine|bronze|silver|gold`
- `artifact_id` STRING (required) - ex.: `gcs_generation` ou uuid
- `gcs_uri` STRING
- `bq_table` STRING (quando aplicavel)
- `created_at` TIMESTAMP

### `ingestion_errors`
Chave: (`tenant_id`, `ingestion_id`, `created_at`)

Campos sugeridos:
- `tenant_id` STRING (required)
- `ingestion_id` STRING (required)
- `stage` STRING (ex.: `upload|router|bronze|silver`)
- `reason_code` STRING
- `message` STRING
- `details_json` STRING
- `created_at` TIMESTAMP

## Padrao de escrita (idempotencia)
- `ingestions`: `MERGE` por (`tenant_id`, `ingestion_id`) para atualizar status/timestamps.
- `artifacts`: `INSERT` apenas (sem update) para auditoria.
- `ingestion_errors`: `INSERT` apenas.

## Evolucao futura
Se precisarem baixa latencia/alta taxa de updates para UI:
- Migrar `ingestions` para Firestore (ou Spanner), mantendo BigQuery como historico/analytics.

