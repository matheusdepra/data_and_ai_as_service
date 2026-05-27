# Backlog - MVP (Fases 1 a 3)

## Fase 1: Upload -> Landing
- Cloud Run `ingestion-api` com auth por token e extracao de `tenant_id` do claim.
- `POST /v1/files` grava em `GCS landing` (path com `tenant_id` + `ingestion_id`).
- Registrar linha em `dv_{env}_meta.ingestions` com status `landed`.
- Quotas/limites: tamanho maximo, formatos aceitos.

## Fase 2: Landing -> Bronze (+ Quarantine)
- Trigger `Object Finalize` em landing para `ingestion-router`.
- Validacoes:
  - extensao/tipo/assinatura basica
  - tamanho
  - parse CSV/JSON quando aplicavel
- Roteamento:
  - falha: copiar para quarantine + `error.json` + status `quarantined`
  - sucesso: converter/normalizar para bronze (Parquet + `manifest.json`) + status `bronze_ready`
- Observabilidade: logs por `tenant_id`/`ingestion_id`.

## Fase 3: Bronze -> Silver (BigQuery)
- `silverize` materializa no BigQuery:
  - tabelas por tenant em dataset `{env}_silver_{tenant_id}`
  - colunas `_dv_*` sempre presentes
- Para JSON arbitrario: silver inicial com `payload` + lineage.
- Reprocessamento por `ingestion_id` (delete+insert ou merge).

## "Definition of Done" (MVP)
- Um arquivo CSV/JSON/Parquet sobe e aparece em:
  - landing (original)
  - bronze (parquet + manifest) OU quarantine (com error)
  - silver no BigQuery (para arquivos validos)
- `GET /v1/ingestions/{ingestion_id}` retorna status e artefatos.
- Documentacao atualizada e consistente em `docs/`.

