# ingestion-router (Cloud Run)

Recebe eventos do Eventarc (GCS object finalized em landing) e dispara Cloud Run Jobs:
- `bronzeify` (sempre)
- `silverize` (futuro: apenas apos bronze ok, ou encadeamento controlado)

## Variaveis de ambiente
- `DV_ENV`
- `BQ_META_DATASET`
- `BRONZEIFY_JOB_NAME`: resource name do job (ex.: `projects/.../locations/.../jobs/...`)
- `SILVERIZE_JOB_NAME`: resource name do job (opcional)

## Contrato de input
Eventarc envia CloudEvents `google.cloud.storage.object.v1.finalized` com `data.bucket`, `data.name`, `data.generation`.

