# Dativerso Identity API

Serviço de identidade (multi-tenant) para o Dativerso.

Status: **deprecated**. A implementacao canonica do `identity-api` no MVP passou a ser Node.js, ver `services/identity_api_node`.

Responsabilidades (MVP):
- validar Firebase ID token (OIDC/JWKS)
- resolver `tenant_id` e `role` via Firestore (membership store)
- permitir convites (Admin) e bootstrap operacional de tenant/admin

Docs:
- `docs/api/identity-api.md`
- `docs/decisions/0001-auth-membership-firebase-firestore.md`
