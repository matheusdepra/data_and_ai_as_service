# Delete em cascade de ingestao

## Objetivo
Permitir que o usuario abandone uma ingestao pela tela de `Ingestions`, acionando uma exclusao em cascade que remova os artefatos e metadados associados dentro do mesmo `tenant_id`.

## Checklist
- [x] Ler AGENTS.md e docs obrigatorios.
- [x] Mapear o fluxo atual de `ingestions`, metadata e read model.
- [x] Implementar endpoint backend para delete em cascade com validacao por `tenant_id`.
- [x] Expor acao de delete na tela de `Ingestions` com confirmacao explicita.
- [x] Atualizar documentacao da API para o novo endpoint e comportamento.
- [x] Rodar validacoes locais aplicaveis.
- [x] Atualizar checklist final com o estado real.

## Validacao
- `PYTHONPYCACHEPREFIX=/private/tmp/dativerso-pycache python3 -m py_compile services/ingestion_api/app/*.py`: passou.
- `npm run build` em `web/`: passou.
