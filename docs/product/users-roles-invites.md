# Usuarios, Papeis e Convites (MVP -> V1)

Este documento detalha o "minimo viavel" de identidade para um SaaS multi-tenant do Dativerso, com foco no Produto 1 (Datalake).

## Objetivo (MVP)
- permitir login simples para usuario nao-tecnico
- isolar dados por Tenant (empresa)
- permitir que um Admin convide outras pessoas
- suportar pelo menos dois papeis: `admin` e `viewer`

Decisao registrada em:
- [../decisions/0001-auth-membership-firebase-firestore.md](../decisions/0001-auth-membership-firebase-firestore.md)

## Entidades (modelo mental)

### Tenant
- id: `tenant_id` (string estavel, ex.: `acme`)
- nome exibido: "Empresa"
- modulos contratados (futuro)

### Usuario
- id do provedor de identidade: `sub` (OIDC)
- email

### Membership (Usuario <-> Tenant)
No MVP, um usuario pertence a exatamente um Tenant.
- `tenant_id`
- `sub`
- `role`: `admin|viewer`
- status: `active|disabled` (futuro)

### Invite
Convite e um artefato temporario para onboarding.
- `invite_id`
- `tenant_id`
- `email`
- `role`
- `expires_at` (ex.: 7 dias)
- `created_by` (sub do admin)
- `status`: `pending|accepted|revoked|expired`

## Papeis (RBAC)

### admin
Pode:
- convidar/remover usuarios do tenant
- ver tudo do tenant
- (futuro) gerir Colecoes, conectores e politicas de acesso por recurso

### viewer
Pode:
- ver status/historico de ingestoes do tenant
- consumir dados liberados

Nota: o papel `analyst` pode aparecer depois, mas comecar com 2 papeis reduz suporte e ambiguidade.

## Fluxos (MVP)

### 1) Onboarding de Tenant (operacional)
MVP: criacao de Tenant e primeiro Admin pode ser operacao interna (console/backoffice).
Depois (V1): self-serve com verificacao de dominio/email.

Bootstrap (MVP):
- criar `tenants/{tenant_id}` no Firestore
- criar `memberships/{sub}` do primeiro admin (ou criar um invite para o email do admin e deixar o "primeiro login" aceitar)

### 2) Convite (Admin -> Usuario)
1. Admin informa email + papel.
2. Plataforma cria `Invite` e envia email.
3. Usuario abre o link e autentica (OIDC).
4. Plataforma marca invite como `accepted` e cria `Membership`.

### 3) Login
- Usuario autentica no IdP e recebe um JWT.
- Backend valida JWT (JWKS) e resolve `tenant_id` + `role` consultando `Membership` no Firestore (com cache curto opcional).

No MVP, a opcao B costuma ser mais simples para iterar papeis sem reemitir tokens.

## Tokens e claims (contrato)
Obrigatorio:
- `sub` (id do usuario no IdP)
- `email` (ou equivalente)

Opcional:
- `role`

## Protecao contra brute force / lockout
Se o login for delegada a um IdP (OIDC), a protecao contra tentativas (lockout, captcha, throttling) deve ser tratada pelo proprio provedor.

Independente do IdP, a API do Dativerso deve ter:
- rate limiting por IP e por `sub` quando autenticado
- auditoria de falhas de autenticacao/autorizacao

## Auditoria (eventos minimos)
Registrar por tenant:
- invite_created / invite_accepted / invite_revoked / invite_expired
- user_role_changed
- user_disabled / user_enabled
- auth_failed / auth_succeeded (opcional, dependendo do IdP)

## Firestore (schema sugerido)
Objetivo: conseguir resolver `tenant_id` e `role` por `sub` de forma barata e rapida.

Colecoes sugeridas (MVP):
- `tenants/{tenant_id}`
- `memberships/{sub}` (1 tenant por usuario no MVP)
- `invites/{invite_id}`
- `invite_index_by_email/{email}` (apenas para invites pendentes; 1 por email)

Campos minimos:
- Tenant: `tenant_id`, `display_name`, `created_at`
- Membership: `tenant_id`, `sub`, `email`, `role`, `created_at`, `updated_at`
- Invite: `invite_id`, `tenant_id`, `email`, `role`, `expires_at`, `created_by`, `status`
  - quando `status=pending`, manter tambem `invite_index_by_email/{email}` -> `{invite_id, tenant_id, role, expires_at}`

Indice/lookup:
- lookup principal: `memberships/{sub}` (direto).
- convite: lookup por doc id em `invite_index_by_email/{email}` (evita indices compostos).

Evolucao (futuro):
- se um usuario puder ter multiplos tenants: mover `memberships` para `tenants/{tenant_id}/memberships/{sub}` e adicionar um indice `user_index/{sub}` para listar tenants.
