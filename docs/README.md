# Docs (Dativerso)

## Arquitetura
- [architecture.md](architecture.md)
- [project/status-2026-05-27.md](project/status-2026-05-27.md)

## API
- [api/ingestion-api.md](api/ingestion-api.md)
- [api/identity-api.md](api/identity-api.md)

## Data Lake
- [data-lake/medallion.md](data-lake/medallion.md)

## Pipeline
- [pipeline/ingestion-contract.md](pipeline/ingestion-contract.md)

## Metadata
- [metadata/model.md](metadata/model.md)

## Seguranca
- [security/iam.md](security/iam.md)

## Custos
- [cost/guardrails.md](cost/guardrails.md)
- [cost/auth-firestore-apigw-cost-notes.md](cost/auth-firestore-apigw-cost-notes.md)

## Runbooks
- [runbooks/bootstrap-tenant.md](runbooks/bootstrap-tenant.md)
- [runbooks/dev-infra-outputs.md](runbooks/dev-infra-outputs.md)
- [runbooks/manual-api-tests.md](runbooks/manual-api-tests.md)

## Backlog
- [backlog/mvp-phases.md](backlog/mvp-phases.md)

## Decisoes
- [decisions/README.md](decisions/README.md)
- [decisions/0001-auth-membership-firebase-firestore.md](decisions/0001-auth-membership-firebase-firestore.md)
- [decisions/0002-polyglot-python-for-data-node-for-platform.md](decisions/0002-polyglot-python-for-data-node-for-platform.md)
- [decisions/0003-api-gateway-gcp.md](decisions/0003-api-gateway-gcp.md)

## Produto
- [product/auth-tenancy.md](product/auth-tenancy.md)
- [product/users-roles-invites.md](product/users-roles-invites.md)
- [product/naming-friendly.md](product/naming-friendly.md)
- [product/mvp-scope.md](product/mvp-scope.md)
- [product/requirements.md](product/requirements.md)
- [product/requirements-full.md](product/requirements-full.md)

## Frontend
- [frontend/wireflow-datalake-mvp.md](frontend/wireflow-datalake-mvp.md)

## Implementacao (scaffold)
- `services/ingestion_api`: API REST (Cloud Run)
- `services/ingestion_router`: roteador de eventos (Eventarc -> Cloud Run)
- `jobs/bronzeify`: job de bronze/quarantine (Cloud Run Job)
- `jobs/silverize`: job de silver (Cloud Run Job)
- `infra/terraform`: IaC do baseline no GCP (buckets, meta BQ, IAM, Cloud Run/Eventarc opcionais)
- `web/`: frontend React (upload + acompanhar ingestao)
