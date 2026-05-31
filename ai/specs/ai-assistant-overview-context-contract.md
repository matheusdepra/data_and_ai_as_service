# AI Assistant API <-> Ingestion API

## Objective
- Definir o contrato entre `services/ai_assistant_api/` e `services/ingestion_api/` para o agente especializado da tela `Dataset Overview`.
- Preservar separação de responsabilidades:
  - `ingestion_api`: dono do read model e dos fatos do dataset.
  - `ai_assistant_api`: dono da conversa, orquestração agêntica, prompts, LLM e futuras ações semânticas.

## Principles
- `tenant_id` nunca vem livre do cliente para nenhum dos dois serviços.
- O cliente pode informar apenas o identificador de escopo funcional, por exemplo `ingestion_id`.
- O `ai_assistant_api` não deve confiar em contexto semântico ou técnico enviado pelo frontend como fonte de verdade.
- O contexto do chat deve ser reconstruído a partir de fontes confiáveis do backend.
- O agente de overview é estritamente dataset-scoped: um `tenant_id`, um `ingestion_id`, uma tela.

## Scope
- Tela `Dataset Overview`.
- Perguntas sobre overview, qualidade, termos, descrição de negócio e refinamentos semânticos permitidos.
- Não cobre workspace multi-dataset, execução de SQL livre ou automações cross-screen.

## Source of Truth

### `ingestion_api`
Responsável por:
- resolver escopo do dataset por `ingestion_id`
- retornar fatos técnicos do dataset
- retornar overview derivado
- retornar refinamentos semânticos persistidos
- persistir refinamentos semânticos aprovados

### `ai_assistant_api`
Responsável por:
- receber a mensagem do usuário
- resolver o perfil/agente correto para a tela
- montar o prompt final
- buscar contexto confiável do dataset
- chamar LLM/provider
- responder em linguagem natural
- quando aplicável, propor ou executar refinamentos semânticos via contrato explícito

## Trusted Context Contract

Para a tela `Dataset Overview`, o `ai_assistant_api` deve montar contexto chamando:

1. `GET /v1/ingestions/{ingestion_id}`
2. `GET /v1/ingestions/{ingestion_id}/overview`
3. `GET /v1/ingestions/{ingestion_id}/overview/semantic`

Todos sob o mesmo token do usuário, ou com autenticação service-to-service que preserve o mesmo `tenant_id` autorizado.

## Minimum Context Shape For Overview Agent

O `ai_assistant_api` deve consolidar um contexto interno com:
- `tenant_id`
- `user.role`
- `ingestion_id`
- `collection_slug`
- `ingestion.stage`
- `technical_summary`
- `overview.status`
- `overview.payload`
- `overview.semantic_overlay`

### `overview.payload`
Inclui, no mínimo:
- `dataset_header`
- `ai_understanding`
- `summary`
- `schema`
- `preview_rows`
- `quality`
- `business_description`
- `terms`
- `relationships`

### `overview.semantic_overlay`
Inclui apenas campos refináveis pelo usuário, por exemplo:
- `dataset_header.classification`
- `dataset_header.tags`
- `ai_understanding.summary`
- `business_description.business_area`
- `business_description.domain`
- `business_description.data_type`
- `business_description.typical_usage`
- `terms`

## Public Chat Contract

O contrato alvo do `ai_assistant_api` para essa tela deve evoluir para algo como:

### `POST /api/v1/chat/messages`

Request:
```json
{
  "session_id": "uuid-or-stable-session",
  "message": "Esse dataset e de marketing, nao de CRM",
  "agent_key": "dataset_overview",
  "scope": {
    "screen": "dataset_overview",
    "ingestion_id": "25e726a0-7243-44f0-bc9f-49e2c0272258"
  },
  "options": {
    "allow_mutations": true
  }
}
```

Rules:
- `agent_key=dataset_overview` seleciona o especialista correto.
- `scope.ingestion_id` é obrigatório para esse agente.
- `scope.screen` ajuda o coordenador futuro a validar roteamento.
- o frontend não manda `tenant_id`, `overview`, `schema` ou `quality` como fonte de verdade.

## Mutation Contract

Quando o usuário pedir correção semântica, o `ai_assistant_api` não altera diretamente o read model.
Ele deve:

1. interpretar a intenção
2. gerar patch candidato apenas em campos permitidos
3. opcionalmente chamar preview
4. persistir via `ingestion_api` somente quando permitido

### Preview
- `POST /v1/ingestions/{ingestion_id}/overview/semantic/preview`

### Persist
- `PATCH /v1/ingestions/{ingestion_id}/overview/semantic`

## Allowed User Outcomes In Overview
- explicar o dataset em linguagem de negócio
- resumir qualidade e avisos
- explicar termos-chave
- sugerir uso do dataset
- responder perguntas de overview
- propor refinamentos semânticos
- persistir refinamentos semânticos permitidos

## Forbidden Outcomes In Overview
- alterar `row_count`, `columns`, `schema`, `quality scores` ou fatos técnicos
- executar SQL arbitrário livre
- responder como assistente geral da plataforma
- atuar sobre outros datasets sem troca explícita de escopo
- criar artefatos/workspaces fora da tela

## Deployment / Runtime Notes
- `ai_assistant_api` deve ser serviço separado de Cloud Run.
- Ele não precisa estar atrás do mesmo API Gateway nesta primeira etapa.
- O serviço pode começar com invocação restrita e integração direta do frontend apenas depois da auth ficar alinhada.
- Para o merge com `master`, o importante é preservar:
  - a existência do serviço
  - seu nome/caminho final
  - a fronteira com `ingestion_api`

## Merge Guidance
- Ao integrar `dev` com `master`, preservar `services/ai_assistant_api/`.
- Não reabsorver esse serviço em `ingestion_api`.
- Se houver conflito entre UI mock e contrato backend, manter o contrato backend como referência e ajustar a UI depois.
