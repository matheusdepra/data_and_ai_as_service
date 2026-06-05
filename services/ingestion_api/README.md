# ingestion-api (Cloud Run)

API REST para upload de arquivos (CSV/JSON/Parquet) com multitenancy por `tenant_id` derivado do token.

## Variaveis de ambiente
- `DV_ENV`: `dev|stg|prod`
- `GCS_LANDING_BUCKET`: nome do bucket landing (ex.: `dativerso-dev-dl-landing`)
- `AUTH_TENANT_CLAIM`: claim do token que contem o tenant (default: `tenant_id`)
- `AUTH_MODE`:
  - `oidc_jwks` (recomendado): valida JWT via JWKS
  - `unverified_jwt` (somente dev): decodifica sem validar assinatura (NAO usar em prod)
- `AUTH_JWKS_URL`: URL do JWKS (quando `AUTH_MODE=oidc_jwks`)
- `AUTH_ISSUER`: issuer esperado (quando `AUTH_MODE=oidc_jwks`)
- `AUTH_AUDIENCE`: audience esperado (quando `AUTH_MODE=oidc_jwks`)
- `BQ_META_DATASET`: dataset do metadata store (default: `dv_${DV_ENV}_meta`)

## Rodar local (exemplo)
Requisitos:
- Python `3.11+`
- este servico usa apenas `requirements.txt` e **nao** suporta `pip install -e '.[dev]'`

```bash
cd services/ingestion_api
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements.txt
export GCS_LANDING_BUCKET=dummy-local-bucket
export AUTH_MODE=unverified_jwt
uvicorn app.main:app --reload --port 8080
```

Health check:

```bash
curl http://localhost:8080/healthz
```

## Build (container)
O `Dockerfile` foi pensado para Cloud Run.
