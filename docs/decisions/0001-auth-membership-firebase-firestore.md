# ADR 0001: Auth com Firebase + Membership Store no Firestore

Data: 2026-05-25

## Contexto
O Dativerso e multi-tenant (cada empresa e um Tenant). O usuario alvo do MVP e nao-tecnico, entao o login precisa ser simples (baixo suporte). Ao mesmo tempo, precisamos de:
- isolamento forte por tenant
- papeis (Admin/Viewer no inicio)
- convites
- revogacao de acesso imediata (quando necessario)

## Decisao
1. Usar **Firebase Auth** como provedor de identidade (OIDC), com fluxo **passwordless (email link / magic link)** para o MVP comercial.
2. Usar **Firestore** como **Membership store** (fonte de verdade) para resolver `tenant_id` e `role` por usuario a cada request autenticada.
3. Implementar o **identity-api** em **Node.js** (ver ADR 0002), mantendo o contrato estavel.

O JWT autentica a identidade (`sub`/`email`). O tenant e o papel sao autorizacao e ficam no store.

## Consequencias

### Positivas
- Troca de papel e revogacao sao imediatas (basta atualizar o Membership no Firestore).
- Convites e onboarding podem evoluir sem reemitir tokens.
- Evolui facil para permissoes por recurso (ex.: por "Colecao") no futuro.
- Infra segue "scale-to-zero" (Firestore e serverless).

### Negativas
- O backend precisa fazer lookup de Membership para cada request (ou cache curto).
- Precisamos modelar e operar dados de identidade (tenants/memberships/invites) no Firestore.

## Alternativas consideradas
- Custom claims no token (`tenant_id`/`role` no JWT):
  - mais simples no backend, mas revogacao/troca de papel nao e imediata sem estrategia adicional (token TTL curto, revogacao forcada, etc.).
- Cloud SQL para Membership:
  - custo fixo e operacao maior no MVP (nao alinhado a "gastar pouco").
- BigQuery como Membership store:
  - nao indicado para autorizacao online (latencia/custo/semantica).

## Referencias
- `docs/product/auth-tenancy.md`
- `docs/product/users-roles-invites.md`
- `docs/product/mvp-scope.md`
- `docs/decisions/0002-polyglot-python-for-data-node-for-platform.md`
