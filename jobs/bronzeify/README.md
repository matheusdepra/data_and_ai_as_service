# bronzeify (Cloud Run Job)

Entrada: um objeto em `GCS landing`.

Saida (MVP):
- copia o arquivo para `GCS bronze` (mesma estrutura de path, trocando `landing/` por `bronze/`)
- cria `manifest.json` no mesmo prefixo
- se invalido: copia para `GCS quarantine` + `error.json`

## Variaveis de ambiente
- `DV_ENV`
- `BQ_META_DATASET`
- `GCS_LANDING_BUCKET`
- `GCS_BRONZE_BUCKET`
- `GCS_QUARANTINE_BUCKET`
- `DV_TENANT_ID`
- `DV_INGESTION_ID`
- `DV_GCS_BUCKET`
- `DV_GCS_OBJECT`
- `DV_GCS_GENERATION` (opcional)

