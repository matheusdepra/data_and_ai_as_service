# Identity API (MVP)

Status: draft (2026-05-25)

Servico responsavel por:
- autenticar (validar Firebase ID token)
- autorizar (resolver `tenant_id` e `role` via Firestore Membership store)
- convites (Admin)

Decisao: ver [../decisions/0001-auth-membership-firebase-firestore.md](../decisions/0001-auth-membership-firebase-firestore.md)

## Auth (Firebase)

### Tokens
O frontend usa **Firebase Auth** (magic link) e obtem:
- **ID token (JWT)**: enviado em toda chamada HTTP no header `Authorization: Bearer ...`
- **Refresh token**: usado **somente no client** (Firebase SDK) para renovar o ID token quando expirar

O backend **nao** aceita refresh token. Ele apenas valida o ID token (OIDC/JWKS).

Implementacao recomendada (MVP): Node.js com Firebase Admin SDK (o SDK valida ID tokens e faz cache internamente).

Nota (API Gateway):
- quando a API esta na frente do **GCP API Gateway**, o header `Authorization` pode ser sobrescrito (service-to-service auth).
- o backend deve priorizar `X-Apigateway-Api-Userinfo` e pode usar `X-Forwarded-Authorization` como fallback.
- no gateway publico, as chamadas tambem exigem `x-api-key`.

### Header
Todas as rotas (exceto `/healthz`) exigem:
```
Authorization: Bearer <firebase_id_token>
```

Via API Gateway:
```http
x-api-key: <gateway_api_key>
Authorization: Bearer <firebase_id_token>
```

## Membership (Firestore)

Regras (MVP):
- se existe `memberships/{sub}`, o usuario esta autorizado e o tenant/role vem dali
- se nao existe membership, a primeira chamada do usuario:
  - procura um invite pendente por `email`
    - implementacao: lookup em `invite_index_by_email/{email}`
  - se existir, aceita automaticamente e cria `memberships/{sub}`
  - se nao existir, retorna `403 no membership (invite required)`

Bootstrap (primeiro admin):
- criar `tenants/{tenant_id}` manualmente
- criar `invites` para o email do admin (ou criar `memberships/{sub}` diretamente)

Importante:
- "Invite" aqui e convite **para usar o SaaS** (Dativerso).
- Nao cria, altera, nem concede acesso a recursos do **GCP IAM**.

## Endpoints

### GET /healthz
Resposta:
```json
{ "ok": true }
```

### GET /v1/me
Retorna contexto resolvido (para o frontend e para outros servicos).

Resposta:
```json
{
  "sub": "firebase-sub",
  "email": "user@acme.com",
  "tenant_id": "acme",
  "role": "admin"
}
```

### POST /v1/invites (admin)
Cria um convite para um email.

Request:
```json
{
  "email": "new.user@acme.com",
  "role": "viewer"
}
```

Response (inclui `login_url` para onde voce direciona o usuario a entrar com magic link):
```json
{
  "invite_id": "uuid",
  "tenant_id": "acme",
  "email": "new.user@acme.com",
  "role": "viewer",
  "status": "pending",
  "created_by": "admin-sub",
  "created_at": "2026-05-25T00:00:00Z",
  "expires_at": "2026-06-01T00:00:00Z",
  "accepted_at": null,
  "revoked_at": null,
  "login_url": "https://app.dativerso.com/login"
}
```

### GET /v1/invites?status=pending (admin)
Lista convites do tenant (filtro opcional `status`).

### POST /v1/invites/{invite_id}/revoke (admin)
Revoga um convite pendente.

Nota:
- a rota publica via API Gateway usa `/v1/invites/{invite_id}/revoke`
- o backend tambem aceita o formato legado `/v1/invites/{invite_id}:revoke` por compatibilidade

## Configuracao (env vars)

Obrigatorio (prod):
- `FIREBASE_PROJECT_ID` (gera defaults de issuer/audience/JWKS)
- `FRONTEND_BASE_URL`

Opcional:
- `FIRESTORE_PROJECT_ID` (se diferente do projeto corrente)
- `AUTH_JWKS_URL` / `AUTH_ISSUER` / `AUTH_AUDIENCE` (override manual)
