# P0 Backend: ingestão real, coleções e read model

## Objetivo
Implementar o plano P0 para fechar `login -> /v1/me -> upload -> processamento -> tracking`, adicionando coleções por tenant, listagem de ingestões recentes, Firestore read model/timeline e ajustes de IaC/API Gateway sem Cloud Functions.

## Checklist
- [x] Identity API Node: criar/listar coleções por tenant no Firestore.
- [x] Ingestion API: tratar `dataset` como `collection_slug`, criar coleção stub e documento/timeline de ingestão no Firestore.
- [x] Ingestion API: adicionar `GET /v1/ingestions` com filtros por coleção/status/limit.
- [x] Router/jobs: atualizar Firestore e emitir logs estruturados nas transições principais.
- [x] Terraform/API Gateway: expor novas rotas e conceder Firestore aos service accounts de ingestão/router/jobs.
- [x] Docs/API: registrar contratos novos e papel do Firestore read model.
- [x] Validação: executar checks possíveis e atualizar este checklist com o resultado real.

## Validação executada
- `python -m py_compile services/ingestion_api/app/*.py services/ingestion_router/app/*.py jobs/bronzeify/src/*.py jobs/silverize/src/*.py`: passou.
- `node --check services/identity_api_node/src/server.js`: passou.
- `git diff --check`: passou.
- `terraform -chdir=infra/terraform validate`: não executou porque o binário `terraform` não está instalado no ambiente.
