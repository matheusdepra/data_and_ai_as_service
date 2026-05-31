# Migration Plan: `backend/` -> `services/ai_assistant_api/`

## Context
- O backend de chat/LLM veio da branch `dev` em uma pasta raiz `backend/`.
- O repositório hoje organiza runtime por domínio em `services/`, `jobs/`, `web/` e `infra/`.
- Para respeitar o padrão atual do projeto, o serviço deve ser absorvido como `services/ai_assistant_api/`, sem misturar suas responsabilidades com `services/ingestion_api/`.

## Goal
- Reposicionar o backend de Data & AI Chat para `services/ai_assistant_api/`.
- Preservar o serviço como backend separado, Cloud Run first, preparado para agentes por tela e futura coordenação.
- Deixar claro o contrato entre `ai_assistant_api` e `ingestion_api`, evitando dois backends concorrentes com responsabilidades sobrepostas.

## Scope
- Estrutura de pastas e naming do serviço.
- Imports, packaging, Dockerfile, README e testes.
- Documentação e arquitetura do repo.
- Impactos de deploy/IaC e integração futura com frontend e outros serviços.

## Out of Scope
- Implementar agora toda a integração real de chat com LLM.
- Unificar `ai_assistant_api` com `ingestion_api`.
- Redesenhar todos os prompts/agentes antes da migração estrutural.

## Decisions To Preserve
- `ingestion_api` continua dono de ingestão, timeline, read model e metadata operacional.
- `ai_assistant_api` vira o backend conversacional/agêntico.
- Chat dataset-scoped deve consultar contexto do dataset via contratos explícitos, não por acoplamento interno.
- `tenant_id` continua vindo de auth/membership; nunca do body livre do cliente.

## Proposed Target Layout
- `services/ai_assistant_api/`
- `services/ai_assistant_api/app/`
- `services/ai_assistant_api/tests/`
- `services/ai_assistant_api/Dockerfile`
- `services/ai_assistant_api/README.md`
- `services/ai_assistant_api/pyproject.toml`

## Work Plan
- [x] Confirmar que o nome oficial do serviço será `ai_assistant_api` em código, docs e deploy.
- [x] Mover `backend/` para `services/ai_assistant_api/` preservando código, testes e assets.
- [x] Ajustar caminhos, scripts, instruções de instalação e referências que assumem `backend/` na raiz.
- [x] Revisar `README` do serviço para refletir responsabilidades, limites e roadmap de agentes por tela.
- [x] Atualizar docs centrais (`docs/README.md`, `docs/architecture.md`) para referenciar `services/ai_assistant_api`.
- [x] Mapear impactos em Terraform/Cloud Run/CI e registrar o delta necessário antes de qualquer deploy.
- [x] Definir contrato de integração entre `ai_assistant_api` e `ingestion_api` para contexto de overview/dataset.
- [x] Validar imports e checks básicos locais após a migração.
- [x] Revisar o merge `dev` -> `master` à luz da nova localização para evitar apagar ou duplicar o serviço.

## Technical Notes
- O rename deve ser tratado como migração arquitetural leve, não como refactor funcional amplo.
- Onde houver referência textual a “backend Data & AI Chat”, preferir evoluir para “AI Assistant API”.
- Se existirem paths hardcoded em testes ou tooling, ajustar antes de considerar a migração concluída.
- Se o serviço passar a ser deployável por Terraform, seguir o mesmo padrão dos demais serviços em `services/`.

## Risks
- Perder histórico/conflito de merge se o move acontecer junto com outras mudanças grandes.
- Misturar responsabilidades entre `ai_assistant_api` e `ingestion_api`.
- Atualizar nome/pasta sem atualizar docs, scripts e deploy targets.
- Carregar para `master` um serviço renomeado sem decidir ainda o contrato entre chat e metadata.

## Validation
- [ ] `pytest` do serviço passa no novo caminho.
- [x] Compilação/imports Python passam no novo caminho.
- [x] `git diff --check` passa.
- [x] Docs centrais refletem a nova localização do serviço.
- [ ] Estratégia de merge entre `dev` e `master` revisada com base no novo layout.

## Validation Notes
- `PYTHONPYCACHEPREFIX=/private/tmp/dativerso-ai-assistant-pycache python3 -m py_compile $(find services/ai_assistant_api/app services/ai_assistant_api/tests -name '*.py' | sort)`: passou.
- `bash -n scripts/build_push_docker.sh scripts/build_push_cloudbuild.sh scripts/build_push.sh`: passou.
- `terraform -chdir=infra/terraform fmt cloudrun.tf iam.tf outputs.tf variables.tf`: passou.
- `git diff --check`: passou.
- `python3 -m pytest services/ai_assistant_api/tests`: não executou porque `pytest` não está instalado no ambiente atual.
- `terraform -chdir=infra/terraform validate`: não validou neste ambiente porque os plugins `google`/`google-beta` não carregaram localmente.

## Merge Guidance
- Fazer o merge a partir de uma branch de integração, não direto em `master`.
- Ordem recomendada:
  1. garantir commit do rename para `services/ai_assistant_api/`
  2. garantir commit do delta de Terraform/scripts/docs
  3. criar `integration/dev-master-ai-assistant`
  4. trazer `master` para dentro dessa branch
  5. resolver conflitos preservando `services/ai_assistant_api/` e removendo o path legado `backend/`
  6. validar `web`, `services/ingestion_api`, `services/ai_assistant_api` e `infra/terraform`
  7. só então mergear a branch de integração em `master`
