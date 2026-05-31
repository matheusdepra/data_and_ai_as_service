# Login Frontend Tasks

## Contexto

Fonte principal:
- `docs/frontend/auth-login-flow.md`
- `docs/design/login/00-login.md`
- `docs/design/login/00-login.reference.png`

Decisoes fechadas:
- Fluxo principal: magic link.
- Destino pos-login: `/home`.
- Login por senha: exibido colapsado e desabilitado (placeholder).
- Persistencia de auth/session: `sessionStorage`.

## Checklist

### 1. Preparacao
- [x] Revisar docs obrigatorios de projeto e frontend/auth.
- [x] Registrar tarefa em `ai/tasks/frontend/login.md` antes de editar codigo.

### 2. Sessao e contrato de auth
- [x] Criar tipo `AuthSession` com `idToken`, `sub`, `email`, `tenant_id`, `role`, `issued_at`.
- [x] Centralizar leitura/escrita de sessao em utilitario unico.
- [x] Migrar persistencia de auth de `localStorage` para `sessionStorage`.
- [x] Manter armazenamento temporario do e-mail pendente para magic link em `sessionStorage`.

### 3. Fluxo de login (UI + comportamento)
- [x] Atualizar `/login` para copy/layout conforme spec de login.
- [x] Manter envio real do magic link com `sendSignInLinkToEmail`.
- [x] Exibir secao de senha colapsada e desabilitada.
- [x] Atualizar `/login/check-email` com estado de sucesso e acoes `Resend Link` e `Use Another Email`.
- [x] Atualizar `/login/complete` para concluir link com `signInWithEmailLink` e resolver `/v1/me`.
- [x] Redirecionar para `/home` apos sessao validada.

### 4. Guardrails de tenancy e erros
- [x] Garantir que `tenant_id` nunca e pedido no formulario.
- [x] Garantir que contexto de tenant/role vem de `/v1/me`.
- [x] Ajustar mensagens de erro para nao expor detalhes sensiveis.

### 5. Regressao e validacao
- [x] Validar que `/upload` e `/track` continuam lendo token/sessao corretamente.
- [x] Rodar `npm run build` no `web/`.
- [x] Registrar o que foi validado visualmente e o que ficou pendente.

## Verificacao 2026-05-30

Validado:
- `npm run build` concluiu com sucesso em `web/`.
- Fluxo de auth migrou para `sessionStorage` com tipo `AuthSession`.
- `/login/complete` agora resolve `/v1/me` e persiste contexto de tenant/role antes de redirecionar para `/home`.
- `/upload` e `/track` continuam consumindo `getJwt()` (agora vindo de sessao centralizada).

Pendente:
- Validacao visual no browser (desktop/mobile) nao foi executada nesta sessao porque nao havia ferramenta de navegador in-app exposta entre as ferramentas disponiveis.
