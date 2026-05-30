# Medallion + Nomenclatura (Dativerso)

## Camadas
- `landing` (raw): arquivo original, imutavel
- `quarantine`: arquivos invalidos/suspeitos (evidence + motivo)
- `bronze`: normalizacao tecnica (formatos/encoding/estrutura) + manifest
- `silver`: dados limpos e utilizaveis (primeiro "valor" para consumo)
- `gold` (futuro): data marts/produtos (agregacoes/metricas/dimensoes)

## Buckets (por ambiente)
Convencao:
- `gs://dativerso-{env}-dl-landing`
- `gs://dativerso-{env}-dl-quarantine`
- `gs://dativerso-{env}-dl-bronze`
- `gs://dativerso-{env}-dl-silver`
- (futuro) `gs://dativerso-{env}-dl-gold`

`{env}`: `dev` | `stg` | `prod`

## Identidade do cliente (tenant)
`tenant_id` deve existir:
- no metadata store (ingestions/artifacts)
- no path do GCS
- no naming do BigQuery (dataset/tabela)

Formato recomendado (ASCII):
- `tenant_id`: slug estavel, ex.: `acme`, `loja_123`, `cliente_xyz`

Origem (MVP):
- `tenant_id` e resolvido pela API a partir do token do usuario e do Membership store. O cliente nao escolhe/override o tenant na request.
- Cada etapa do pipeline deve reconferir o escopo: o `tenant_id` e `ingestion_id` do path/metadata precisam bater com os valores recebidos pela funcao/job.
- Artefatos de tenants diferentes nunca podem ser lidos, copiados, transformados ou retornados na mesma operacao.

## Paths (GCS)
Usar sempre particao por data de ingestao + `ingestion_id` para idempotencia.

Landing (raw):
`landing/tenant_id={tenant_id}/source={source}/dataset={dataset}/ingestion_date=YYYY-MM-DD/{ingestion_id}/{original_filename}`

Quarantine:
`quarantine/tenant_id={tenant_id}/ingestion_date=YYYY-MM-DD/{ingestion_id}/{original_filename}`
`quarantine/tenant_id={tenant_id}/ingestion_date=YYYY-MM-DD/{ingestion_id}/error.json`

Bronze:
`bronze/tenant_id={tenant_id}/source={source}/dataset={dataset}/ingestion_date=YYYY-MM-DD/{ingestion_id}/`
- `data/part-00000.parquet` (alvo; opcional no inicio)
- `manifest.json`
- `stats.json` (opcional)

Silver (se mantiver no lake):
`silver/tenant_id={tenant_id}/domain={domain}/entity={entity}/dt=YYYY-MM-DD/part-*.parquet`

## BigQuery (consumo inicial)
Opcao recomendada: dataset por tenant e camada:
- `{env}_silver_{tenant_id}`
- `{env}_bronze_{tenant_id}` (opcional, se materializar bronze no BQ)

Tabelas:
- `{domain}__{entity}` (ex.: `finance__transactions`)

## Convenções de nomes (colunas)
- snake_case
- ASCII apenas
- sem espacos e sem acentos
- prefixos reservados: `_dv_*` para colunas de controle/lineage

Exemplos de colunas de controle:
- `_dv_ingestion_id`
- `_dv_ingested_at`
- `_dv_source`
- `_dv_original_filename`
- `_dv_row_hash` (quando aplicavel)

## JSON arbitrario
Quando o arquivo for JSON arbitrario (nao-NDJSON), a normalizacao inicial em bronze/silver deve preservar o payload:
- coluna `payload` (JSON/string) + colunas `_dv_*`
- mapeamentos (flatten/extracao de campos) sao feitos em fase posterior (assistidos por IA/UI)
