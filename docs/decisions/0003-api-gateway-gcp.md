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

## Observacao importante (headers)
Quando um backend esta atras de API Gateway e usa `x-google-backend`, o `Authorization` original pode ser sobrescrito.
O token original do usuario costuma ficar em `X-Forwarded-Authorization`.

Consequencia:
- servicos (identity/ingestion) devem aceitar `X-Forwarded-Authorization` como fonte do token do usuario.

## Alternativas consideradas
- BFF (platform-api): melhor para agregacao de respostas, mas adiciona um servico.
- HTTP(S) LB: simplifica dominio, mas nao aplica autenticacao JWT via spec.

## Referencias
- `docs/api/identity-api.md`
- `docs/api/ingestion-api.md`
- `infra/terraform/api_gateway.tf`

