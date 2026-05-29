# AGENTS.md (Terraform)

## Perfil padrão
- Ao trabalhar nesta pasta, seguir o perfil `terraform-engineer` em `ai/agents/terraform-engineer.md`.
- Assumir **GCP-only** (não propor AWS/Azure) a menos que o pedido diga o contrário.

## Guardrails
- `terraform plan` antes de qualquer `apply` e sempre com aprovação explícita.
- Backend remoto + state locking obrigatórios (definir antes de criar recursos em escala).
- Version pinning (Terraform + providers) e módulos pequenos/componíveis.

