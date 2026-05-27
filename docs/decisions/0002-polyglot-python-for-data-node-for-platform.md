# ADR 0002: Node.js para Modulos de Plataforma; Python para Dados/IA/ML

Data: 2026-05-25

## Contexto
O Dativerso tem dois tipos de workload:
- **Dados/IA/ML**: ingestao, pipelines, transformacoes, treinamento/inferencia; onde Python costuma ser a melhor escolha por ecossistema (pandas/pyarrow/sklearn etc.).
- **Plataforma SaaS**: autenticacao, administracao, catalogo, UI APIs, integrações e serviços de produto; onde Node.js tende a acelerar entrega (time/web stack, SDKs, tipagem TS etc.).

## Decisao
- Usar **Python** somente onde ele e claramente superior: pipeline de dados e componentes de IA/ML.
- Usar **Node.js (preferencialmente TypeScript)** para autenticacao, administracao e demais modulos de plataforma.

## Consequencias
- O sistema passa a ser **poliglota**, exigindo padroes consistentes de:
  - logging, tracing e erros
  - contratos de API (OpenAPI) e versionamento
  - IAM/service accounts e deploy
- Migracoes devem preservar contratos e testes (principalmente `identity-api` e `ingestion-api`).

## Aplicacao imediata (MVP)
- `identity-api` deve ser implementado em Node.js, mantendo o contrato descrito em `docs/api/identity-api.md` e a decisao de membership store no Firestore.

## Referencias
- `docs/decisions/0001-auth-membership-firebase-firestore.md`
- `docs/api/identity-api.md`

