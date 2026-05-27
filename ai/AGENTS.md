# AGENTS.md (AI Area)

## Objetivo
- Tudo relacionado a prompts, automações e artefatos de IA deve ficar aqui (ou ser referenciado daqui).

## Guardrails
- Não colocar credenciais reais em prompts/exemplos.
- Preferir artefatos versionados (templates, exemplos) em vez de texto solto em chats.

## Organização sugerida (opcional)
- `ai/prompts/`: prompts reutilizáveis (com placeholders).
- `ai/specs/`: specs e “playbooks” (checklists).
- `ai/evals/`: casos de teste e critérios de aceitação.

## Perfis de agente (opcional)
- Perfis no estilo “KIRO steering” podem ficar em `ai/agents/` como Markdown/YAML para referência.
- Para “invocar” um perfil, copie o objetivo + checklist dele para o pedido atual e forneça contexto do repo (cloud, envs, constraints, etc.).
- Perfis existentes: `ai/agents/terraform-engineer.md`, `ai/agents/cloud-architect-gcp.md`, `ai/agents/data-engineer-gcp.md`, `ai/agents/ux-researcher.md`.
- Perfis existentes: `ai/agents/backend-developer-python-gcp.md`.
