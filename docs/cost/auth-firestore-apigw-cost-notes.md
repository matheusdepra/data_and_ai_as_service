# Cost Notes: Auth (Firebase/Identity Platform) + Firestore + API Gateway

Data: 2026-05-27

Objetivo: registrar uma regra de bolso de custos para o stack de identidade/plataforma do Dativerso, para referencias futuras.

Aviso: precos mudam por regiao/moeda e ao longo do tempo. Use as paginas oficiais como fonte final.

## Definicoes
- "users" aqui = **MAU (Monthly Active Users)**: usuarios que logaram no mes.
- Custos de Auth sao por MAU (na maioria dos metodos).
- Custos de Firestore sao por operacao (reads/writes/deletes) + storage.
- Custos de API Gateway sao por volume de chamadas (calls) + egress.

## 1) Auth (Firebase Auth / Identity Platform)

Para provedores "Tier 1" (email/social/anonymous), existe uma faixa gratuita ate ~50k MAU.

Regra pratica (MVP):
- 10 / 100 / 1.000 / 10.000 MAU: **tende a ser $0** (abaixo do free tier).

Pagina oficial:
- https://cloud.google.com/identity-platform/pricing

Observacao:
- Se usar phone auth/SMS ou MFA por SMS, o custo pode subir por mensagem enviada (nao e o caso do magic link).

## 2) Membership Store (Firestore)

Firestore cobra por:
- document reads
- document writes
- deletes
- storage

Existe free tier diario (ex.: 50k reads/dia, 20k writes/dia, 20k deletes/dia) e depois cobra por 100k operacoes.

Paginas oficiais:
- https://cloud.google.com/firestore/pricing
- https://docs.cloud.google.com/firestore/native/docs/billing-example

### Exemplo de estimativa (membership)
Hipotese simples e comum:
- cada usuario faz `GET /v1/me` 1 vez por dia
- isso gera 1 read em `memberships/{sub}` no Firestore

Entao:
- 10.000 users * 1 read/dia = 10.000 reads/dia => fica dentro do free tier => ~$0

Se o frontend fizer 10x por dia por usuario:
- 10.000 users * 10 reads/dia = 100.000 reads/dia
- 50.000 free + 50.000 pagos por dia
- custo aproximado: (50k / 100k) * (preco_por_100k_reads) por dia

### Como manter Firestore barato
- Cache curto no backend para `membership` (ex.: 1-5 minutos por `sub`).
- No frontend: chamar `/v1/me` 1 vez no load e reutilizar em memoria (evitar polling).
- Evitar listeners realtime para membership/invites (a menos que seja necessario).

## 3) API Gateway (GCP API Gateway)

API Gateway cobra por chamadas por mes (calls), com free tier inicial.

Regra pratica:
- ate ~2 milhoes calls/mes: $0
- acima disso: ~$3 por 1 milhao calls (ate 1B)

Pagina oficial:
- https://cloud.google.com/api-gateway/pricing

### Exemplo de estimativa (calls)
Se voce tiver:
- 10.000 users
- 200 calls/mes por user

Entao:
- calls/mes = 10.000 * 200 = 2.000.000 => tende a ficar no free tier => ~$0

Se tiver:
- 10.000 users
- 500 calls/mes por user

Entao:
- 5.000.000 calls/mes => 3.000.000 pagos => ~$9/mes (apenas calls; sem egress).

## Resumo (regra de bolso por MAU)

Assumindo:
- login via email link (sem SMS)
- Firestore: 1-10 reads/dia por user para membership
- API Gateway: 200-500 calls/mes por user

Entao para:
- 10 a 10.000 MAU: **Auth ~ $0**, **Firestore baixo**, **API Gateway $0 a poucos dolares**

O que normalmente explode custo primeiro:
- uso exagerado de Firestore (polling/reads desnecessarios, listeners, queries nao otimizadas)
- volume alto de calls no API Gateway (acima de 2M/mes) e egress

