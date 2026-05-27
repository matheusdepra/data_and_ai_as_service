# AGENTS.md (Backend Services)

## Perfil padrão
- Ao trabalhar em `services/`, seguir o perfil `backend-developer-python-gcp` em `ai/agents/backend-developer-python-gcp.md`.
- Assumir deploy na GCP (Cloud Run first) salvo indicação contrária.

## Guardrails
- Preferir mudanças pequenas e testáveis; não refatorar amplo sem pedido.
- Logs estruturados + health checks; tratar timeouts/retries e idempotência.
- Secrets sempre via Secret Manager/env; nunca hardcode.

