# Runbook: Bootstrap Tenant (Firestore)

Data: 2026-05-27

Objetivo: criar o primeiro `tenant` e um primeiro convite de admin no **Firestore**, para que o usuario consiga entrar no SaaS Dativerso e ganhar `membership`.

Importante:
- Isso e **convite do SaaS**, nao tem relacao com acesso a GCP/IAM/Console.
- Firestore precisa estar criado (default database).

## Pre-requisitos
- `terraform apply` com `create_firestore_database=true` (para criar/gerenciar o Firestore) ou Firestore ja existente no projeto.
- `gcloud` configurado e com permissoes para escrever no Firestore.
- `jq` e `curl` instalados.

## Script
Usar:
- `scripts/bootstrap_tenant.sh`

Exemplo (apenas para validacao):
```bash
./scripts/bootstrap_tenant.sh \
  --tenant_id OLIST \
  --display_name "OLIST" \
  --admin_email mpandrade@ucs.br
```

Ele cria:
- `tenants/OLIST`
- `invites/<uuid>`
- `invite_index_by_email/mpandrade@ucs.br`

## Verificacao
1. Subir `identity-api`.
2. No frontend, autenticar com magic link usando o email do invite.
3. Chamar:
   - `GET /v1/me`

Resultado esperado:
- `membership` criado automaticamente no primeiro login (auto-accept do invite).
