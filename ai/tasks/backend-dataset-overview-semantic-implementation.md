# Implementacao backend de refinamentos semanticos do Dataset Overview

## Objetivo
Implementar na `ingestion_api` os endpoints e o armazenamento de refinamentos semanticos do overview, com validacao de escopo, role e historico append-only.

## Checklist
- [x] Ler docs e spec do contrato semantico.
- [x] Implementar validacao de patch allowlist.
- [x] Implementar persistencia `overview_semantic` no Firestore.
- [x] Implementar historico append-only de refinamentos.
- [x] Expor `GET /overview/semantic`.
- [x] Expor `PATCH /overview/semantic`.
- [x] Expor `POST /overview/semantic/preview`.
- [x] Aplicar guarda de role para escrita/preview.
- [x] Atualizar OpenAPI do API Gateway.
- [x] Rodar validacoes disponiveis.

## Validacao
- `PYTHONPYCACHEPREFIX=/private/tmp/dativerso-pycache python3 -m py_compile services/ingestion_api/app/*.py`: passou.
- `PYTHONPYCACHEPREFIX=/private/tmp/dativerso-pycache python3 -m py_compile services/ingestion_api/app/*.py services/ingestion_router/app/*.py jobs/bronzeify/src/*.py jobs/silverize/src/*.py`: passou.
- `git diff --check`: passou.
