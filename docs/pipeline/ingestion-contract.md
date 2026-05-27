# Contrato de Ingestao (MVP)

## Conceitos
- `ingestion_id`: identificador imutavel para reprocessamento/idempotencia.
- `artifact`: um arquivo/resultado produzido em uma camada (landing/bronze/silver).
- `tenant_id`: identificador do cliente.

## Autenticacao e tenant_id
- A API autentica o cliente via token (ex.: JWT/OIDC).
- `tenant_id` e extraido do token (claim) e nao deve ser fornecido pelo cliente via header/body.
- Claim recomendado: `tenant_id` (alternativas comuns: `tid`), definido como configuracao do servico.
- Se o token nao contiver o claim esperado, a request deve falhar (HTTP 401/403).

## Geração do ingestion_id
Recomendado (deterministico):
- `ingestion_id = sha256(bucket + object_name + generation)`

Alternativa:
- `ingestion_id = uuidv7()` na API e gravar como parte do path.

## Estados (state machine)
- `received`: request aceita pela API (ainda nao persistido no lake)
- `landed`: arquivo gravado em landing
- `quarantined`: rejeitado e movido para quarantine (com motivo)
- `bronze_running` -> `bronze_ready` | `bronze_failed`
- `silver_running` -> `silver_ready` | `silver_failed`

## Manifest (bronze)
Arquivo: `manifest.json`
Campos minimos:
- `tenant_id`
- `source`
- `dataset`
- `ingestion_id`
- `original`: `{ filename, content_type, size_bytes, checksum_sha256 }`
- `detected_format`: `csv|json|parquet`
- `schema_inferred`: lista de colunas + tipos (quando aplicavel)
- `row_count` (quando aplicavel)
- `created_at`

## Suporte a formatos (MVP)
Formatos aceitos na API:
- `csv`
- `json` (NDJSON preferivel, mas JSON arbitrario suportado)
- `parquet`

Normalizacao para Bronze:
- CSV: normaliza encoding/delimitador (quando aplicavel). Alvo: converter para Parquet.
- Parquet: valida schema basico e copia para Bronze (sem reinterpretar colunas).
- JSON:
  - Se for NDJSON (um objeto por linha): cada linha vira um registro.
  - Se o JSON for um array no topo: cada elemento vira um registro (quando possivel).
  - Caso contrario: gerar 1 registro com coluna `payload` contendo o JSON original (para posterior mapeamento).

## Quarantine (erro)
Arquivo: `error.json`
Campos minimos:
- `tenant_id`
- `ingestion_id`
- `reason_code` (ex.: `unsupported_format`, `invalid_csv`, `malicious`, `too_large`)
- `message`
- `created_at`

## Idempotencia e reprocessamento
Regras:
- Um `ingestion_id` nao deve gerar duplicatas em silver.
- Reprocessamento deve ser seguro:
  - strategy A: sobrescrever particao alvo (por `ingestion_id` ou `dt`) com `WRITE_TRUNCATE` controlado
  - strategy B: `MERGE` no BigQuery com chaves + `_dv_ingestion_id`

Recomendacao MVP:
- Silver em BigQuery particionado por data de ingestao e com coluna `_dv_ingestion_id`.
- Reprocessamento por `ingestion_id` executa `DELETE WHERE _dv_ingestion_id = ...` + `INSERT`.

## Observabilidade minima
Cada etapa deve logar:
- `tenant_id`, `ingestion_id`, `stage`, `status`, `duration_ms`, `error` (se houver)
