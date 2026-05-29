# Auth Login Flow (MVP)

Data de referencia: 2026-05-28

## Objetivo

Criar um fluxo de login por magic link compreensivel para usuario nao tecnico, reduzindo tres ansiedades comuns:

- "Meu acesso deu certo?"
- "O que eu preciso fazer agora?"
- "Esse e-mail realmente me colocou na empresa certa?"

## Usuario alvo

- usuario de negocio
- pouca familiaridade com termos como token, tenant, provider ou JWT
- entra por convite e espera um fluxo parecido com produto SaaS corporativo

## Decisoes de UX

### 1. Login em tres etapas explicitas

- `Entrar`
- `Verifique seu e-mail`
- `Concluir acesso`

Motivo:
- reduz ambiguidade
- evita a sensacao de "cliquei e nada aconteceu"
- melhora recuperacao quando o usuario troca de dispositivo

### 2. Tela de sessao separada

Existe uma pagina `/session` com papel operacional.

Motivo:
- no MVP, precisamos confirmar rapidamente `email`, `tenant_id`, `role` e `token`
- isso ajuda produto, backend e QA sem poluir a tela principal de login

### 3. Tema light

Direcao visual:
- fundo quente e claro
- cards transluidos
- destaque azul-petroleo
- tom editorial/corporativo em vez de "console tecnico"

Motivo:
- reforca clareza e confianca
- conversa melhor com usuario nao tecnico
- reduz carga visual logo no primeiro contato

### 4. Linguagem direta

Evitar termos na interface principal:
- JWT
- claim
- Firestore
- tenant

Usar:
- e-mail de trabalho
- link de acesso
- sessao
- empresa

Excecao:
- a tela `/session` pode expor termos tecnicos porque ela e explicitamente operacional

## Fluxo resumido

1. usuario informa e-mail
2. frontend envia `sendSignInLinkToEmail`
3. usuario vai para "verifique seu e-mail"
4. abre o link
5. frontend executa `signInWithEmailLink`
6. frontend obtém `idToken`
7. chama `/v1/me`
8. backend resolve membership e auto-aceita invite no primeiro acesso
9. usuario segue para upload

## Riscos conhecidos

- sem configuracao correta de dominios autorizados do Firebase, o fluxo quebra
- sem API key do gateway, o login conclui localmente mas `/v1/me` falha
- sem invite/membership, o usuario autentica mas recebe `403`
