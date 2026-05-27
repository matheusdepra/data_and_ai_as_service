# silverize (Cloud Run Job)

Materializa dados em BigQuery (camada Silver).

Entrada (MVP):
- Um objeto em `GCS bronze` (ou landing, se chamado diretamente)

Saida:
- Tabela no BigQuery em dataset `{env}_silver_{tenant_id}` (cria se nao existir)
- Atualiza status `silver_ready` no metadata store

Nota: JSON arbitrario vira 1 registro com coluna `payload` (STRING) + `_dv_*`.

## Variaveis de ambiente
- `DV_ENV`
- `BQ_META_DATASET`
- `BQ_LOCATION` (opcional, default: `US`)
- `DV_TENANT_ID`
- `DV_INGESTION_ID`
- `DV_GCS_URI` (ex.: `gs://bucket/path/to/file`)
- `DV_SOURCE` (opcional)
- `DV_DATASET` (opcional) - usado no nome da tabela

