# Auth e Tenancy (MVP -> V1)

## Objetivo
Permitir que usuarios nao-tecnicos usem a plataforma com:
- isolamento por empresa (Tenant)
- papéis (Admin e Viewer no inicio)
- onboarding simples e seguro

Decisao registrada em:
- [../decisions/0001-auth-membership-firebase-firestore.md](../decisions/0001-auth-membership-firebase-firestore.md)

Para detalhes do modelo de usuarios/convites:
- [users-roles-invites.md](users-roles-invites.md)

## Termos
- **Tenant**: empresa/organizacao. Tudo pertence a um Tenant.
- **Usuario**: pessoa dentro de um Tenant.
- **Papel**: permissao do usuario dentro do Tenant.

## Requisitos funcionais (recorte para o Datalake MVP)
- Um usuario so ve recursos do seu Tenant.
- Um Tenant tem 1+ Admins e 0+ Viewers.
- Admin pode convidar pessoas do mesmo Tenant.
- Viewer so enxerga e acompanha ingestoes/datasets permitidos (no MVP: leitura geral do Tenant).
- Rate limit e auditoria de falhas de auth/authz (suporte e seguranca).

## Estrategia recomendada por fase

### Fase 0 (hoje / dev): token colado
**Quando usar:** desenvolvimento e demos internas.

- Frontend pede um token (JWT) e guarda localmente (apenas dev).
- Backend valida o JWT via JWKS (ou `unverified_jwt` em dev) e extrai claims minimos: `tenant_id` (obrigatorio) e `role` (opcional, ex.: `admin|viewer`).

Prós:
- implementacao rapida
- sem tela de cadastro/senha

Contras:
- nao e UX de produto
- sem gestao de usuarios

### Fase 1 (MVP comercial): login "passwordless" + convite
**Quando usar:** primeiro go-to-market com usuario nao-tecnico.

Recomendacao (MVP): **Firebase Auth** com "email link" (magic link) + convites.

Autorizacao:
- O JWT prova identidade (`sub`/`email`) via JWKS.
- `tenant_id` e `role` sao resolvidos via **Membership store** (Firestore).

Fluxo:
1. Admin cria Tenant (operacao interna ou self-serve simples).
2. Admin convida usuario por email.
3. Usuario clica no link, autentica e recebe token.
4. Plataforma cria/atualiza `Membership` no Firestore e passa a autorizar por `tenant_id`/`role`.

Prós:
- UX simples (sem senha)
- baixo suporte
- integra bem com Cloud Run/JWKS

Contras:
- precisa de um pequeno backend admin para convites e gestao de membership

#### Sobre "3 tentativas invalidas => lock 15 min"
Se autenticacao for delegada a um IdP (OIDC), lockout/brute-force protection tende a ser responsabilidade do provedor.

Mesmo assim, a plataforma deve implementar:
- rate limiting na API (IP/sub)
- auditoria de falhas e tentativas suspeitas

### Fase 2: SSO corporativo (SAML/OIDC)
**Quando usar:** clientes maiores.
- IdP do cliente (Google Workspace, Azure AD, Okta)
- mapeamento de grupos -> roles
- SCIM (futuro) para provisionamento

## Modelo de autorizacao (RBAC minimo)
Papeis:
- `admin`: convida/remova usuarios, ve tudo do Tenant, gerencia datasets e conectores
- `viewer`: ve e consome o que o admin liberou (no MVP pode ser "read-all do tenant")

Permissoes por recurso (futuro, nao-MVP):
- por dataset/fonte: `viewer` pode ter acesso somente a subconjunto.

## Claims no token (contrato)
Obrigatorio (MVP):
- `sub`: id do usuario no IdP
- `email` (ou equivalente)

Opcional:
- `role`

Nota: no MVP com Membership store, `tenant_id` e `role` nao precisam estar no token; ficam no Firestore.

## Como isso conversa com o Datalake atual
No Datalake MVP, o `tenant_id` ja determina:
- prefixo no GCS (`tenant_id=...`)
- dataset no BigQuery (`{env}_silver_{tenant_id}`)
- filtro de leitura do metadata store (por tenant)
