# ADR 0003: Usar GCP API Gateway como Entrypoint

Data: 2026-05-25

## Contexto
O frontend nao deve conhecer URLs diferentes por servico (identity, ingestao etc.). Tambem queremos:
- um dominio unico (entrypoint)
- politicas centralizadas (auth, quotas/rate-limit no futuro)

## Decisao
Usar **GCP API Gateway** como entrypoint com roteamento por path para Cloud Run:
- `/v1/me`, `/v1/invites` -> `identity-api`
- `/v1/files`, `/v1/ingestions/*` -> `ingestion-api`

Autenticacao:
- o cliente envia `Authorization: Bearer <Firebase ID token>`
- o API Gateway valida o JWT (Firebase) e encaminha a requisicao ao backend
- no modelo atual do Gateway, as rotas publicas tambem exigem `x-api-key`

## Observacao importante (headers)
Quando um backend esta atras de API Gateway e usa `x-google-backend`, o `Authorization` original pode ser sobrescrito.
O Google recomenda consumir `X-Apigateway-Api-Userinfo`; `X-Forwarded-Authorization` fica apenas como fallback.

Consequencia:
- servicos (identity/ingestion) devem aceitar `X-Apigateway-Api-Userinfo` como fonte principal da identidade do usuario.
- `X-Forwarded-Authorization` continua suportado como fallback.

## Limitacoes operacionais relevantes
- API Gateway nao aceita `type: file` em OpenAPI 2.0; uploads multipart devem ser descritos com `type: string`.
- API Gateway nao aceita parametros de path que ocupam apenas parte do segmento (por isso `/v1/invites/{invite_id}/revoke` no lugar de `:revoke`).
- combinacoes de seguranca com API key + OAuth2 sao suportadas como `AND`; isso deve aparecer explicitamente no `security` do spec.

## Alternativas consideradas
- BFF (platform-api): melhor para agregacao de respostas, mas adiciona um servico.
- HTTP(S) LB: simplifica dominio, mas nao aplica autenticacao JWT via spec.

## Referencias
- `docs/api/identity-api.md`
- `docs/api/ingestion-api.md`
- `infra/terraform/api_gateway.tf`
