# MVP Scope (Datalake) - 2026-05-25

Este documento recorta o que e "MVP de verdade" para a primeira entrega do Dativerso (Produto 1: Datalake), considerando:
- usuario nao-tecnico
- baixo custo (serverless / sob demanda)
- foco em upload de arquivos recorrentes e visibilidade do processamento

Ele existe para evitar que o Requirements Document vire escopo infinito.

## Objetivo do MVP (Job To Be Done)
"Subir um arquivo (ex.: faturamento do mes) e ter uma versao **pronta para uso** para consulta e dashboards, com rastreabilidade e erro explicavel."

## Entregas MVP (P0)

### 1) Autenticacao e Tenancy (minimo)
- Isolamento por Tenant (empresa).
- Papeis: `admin` e `viewer`.
- Admin consegue convidar usuarios (mesmo Tenant).
- Implementacao alvo (MVP comercial): Firebase Auth (magic link) + Membership store no Firestore + `identity-api` em Node.js.

Nota: no MVP inicial podemos operar em "Fase 0" (token colado) para acelerar validacao e demos, mas a primeira versao comercial deve ser passwordless + convites.

### 2) Upload guiado de arquivos (CSV/JSON/Parquet)
- Upload via UI (fase 1) e API REST (ja existe).
- Identificacao de "Colecao" (nome amigavel para o que a infra chama de `dataset`): o usuario pode selecionar uma existente ou criar uma nova (nome + descricao curta).
- Resultado: um "Protocolo" (`ingestion_id`) copiavel para suporte.

### 3) Pipeline automatizado ate "Pronto para uso"
- Landing (GCS) -> Bronze (GCS) -> Silver (BigQuery).
- Quarentena (GCS) quando falhar validacao/parse, com mensagem acionavel.
- Idempotencia e retry (Eventarc/Cloud Run).

### 4) Visibilidade do que aconteceu (para nao-tecnico)
- Tela/endpoint para acompanhar status por `ingestion_id` (timeline simples).
- Mensagens com linguagem nao-tecnica e opcao "Detalhes tecnicos" (artefatos GCS/BQ + erros).

## Fora do MVP (nao fazer agora)
- Conectores (DBs/APIs/SAP/agent on-prem).
- Workflows de aprovacao/curadoria por dataset.
- Views e editor visual de joins.
- Agentes de IA e AutoML (Produtos 2 e 3).
- SSO corporativo (Okta/AzureAD) e SCIM.
- Data quality score completo (podemos manter metricas basicas internas, sem UI).
- Gold/Insights.

## Proximos incrementos (P1/P2)
- Historico de ingestoes recentes por Colecao.
- Sugestao automatica de "Colecao" a partir do nome do arquivo (ex.: `faturamento_marco.csv`).
- Regras guiadas para padronizacao (Silver): tipos, datas, separador, nomes de colunas, etc.
- Permissoes por Colecao (viewer pode ver apenas subconjunto).
