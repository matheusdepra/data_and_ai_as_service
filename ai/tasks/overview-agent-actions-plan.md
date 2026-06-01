# Plan: Dataset Overview Agent Actions

## Objective
- Evoluir o agente da tela `Dataset Overview` para:
  - persistir correções semânticas a partir do chat
  - chamar `PATCH /v1/ingestions/{ingestion_id}/overview/semantic` sozinho
  - executar análise/tabulação ad hoc no dado
- Manter escopo estrito da tela e impedir chamadas arbitrárias a APIs ou tools fora da allowlist.

## Scope
- Apenas o agente `dataset_overview`
- Apenas contexto de um `tenant_id` e um `ingestion_id`
- Apenas ferramentas explicitamente registradas para essa tela

## Non-Goals
- Não transformar o agente em assistente geral da plataforma
- Não liberar acesso livre a APIs HTTP
- Não permitir SQL livre sem governança
- Não coordenar outros agentes nesta etapa

## Recommendation
- Fase atual: implementar direto, sem framework agêntico pesado
- Motivo:
  - o serviço já existe em FastAPI com arquitetura limpa
  - o número de tools é pequeno e bem definido
  - o risco principal é governança/escopo, não orquestração complexa
- Ponto de evolução:
  - se o projeto crescer para múltiplos agentes, handoff e workflows longos, reavaliar ADK como camada de orquestração

## Allowed Tools For `dataset_overview`
- `get_overview_context`
  - lê `GET /v1/ingestions/{ingestion_id}`
  - lê `GET /v1/ingestions/{ingestion_id}/overview`
  - lê `GET /v1/ingestions/{ingestion_id}/overview/semantic`
- `preview_semantic_patch`
  - chama `POST /v1/ingestions/{ingestion_id}/overview/semantic/preview`
- `apply_semantic_patch`
  - chama `PATCH /v1/ingestions/{ingestion_id}/overview/semantic`
- `run_overview_query`
  - executa análise ad hoc somente sobre a tabela Silver do dataset atual, com guardrails

## Explicitly Forbidden
- qualquer chamada HTTP arbitrária fora dessas tools
- qualquer acesso a outro `ingestion_id`
- qualquer modificação de campos técnicos do dataset
- qualquer consulta SQL fora da tabela Silver resolvida para o dataset atual
- qualquer query sem limites de custo/linhas

## Tool Contracts

### 1. `preview_semantic_patch`
- Input:
  - `ingestion_id`
  - `reason`
  - `patch`
- Output:
  - patch normalizado
  - campos aplicáveis
  - payload resultante previsto

### 2. `apply_semantic_patch`
- Input:
  - `ingestion_id`
  - `reason`
  - `patch`
  - `if_match` opcional
- Output:
  - semantic overlay persistido
  - history entry
  - versão/base retornada

### 3. `run_overview_query`
- Input:
  - `ingestion_id`
  - `question`
  - `query_plan` estruturado gerado pelo backend
- Output:
  - resultado tabular pequeno
  - colunas
  - linhas
  - agregados básicos
  - metadados de custo/bytes

## Guardrails For Ad Hoc Analysis
- resolver sempre a tabela Silver a partir de `ingestion_api`
- permitir apenas `SELECT`
- bloquear DDL/DML
- limitar bytes faturáveis
- limitar linhas de saída
- limitar tempo
- preferir templates de consulta gerados pelo backend
- logar `tenant_id`, `ingestion_id`, `request_id`, bytes e latência

## Implementation Phases

### Phase 1: Semantic Actions
- [x] Criar camada de tool registry no `ai_assistant_api`
- [x] Implementar `preview_semantic_patch`
- [x] Implementar `apply_semantic_patch`
- [x] Ensinar o agente a diferenciar:
  - pergunta explicativa
  - sugestão de refinamento
  - pedido explícito de persistência
- [x] Exigir confirmação semântica clara antes de persistir automaticamente
- [x] Adicionar fallback com IA para inferir patch semântico quando a heurística não capturar bem a intenção
- [x] Fazer a resposta final ao usuário ser sempre redigida pela IA, usando o resultado interno da tool como contexto
- [x] Recuperar proposta pendente a partir do histórico recente da sessão, para não depender só de estado transitório em memória

### Phase 2: Ad Hoc Analysis
- [ ] Definir contrato backend para análise ad hoc dataset-scoped
- [ ] Implementar tool `run_overview_query`
- [ ] Resolver tabela Silver somente pelo backend
- [ ] Adicionar guardrails de SQL/custo/linhas
- [ ] Responder em formato legível para chat e tabela futura

### Phase 3: Frontend UX
- [ ] Mostrar quando a IA está sugerindo uma mudança semântica
- [ ] Mostrar quando a mudança foi apenas proposta vs persistida
- [ ] Exibir resultados tabulares simples para análise ad hoc
- [ ] Tratar erros de permissão, conflito de versão e falta de contexto

## Architecture Notes
- `ai_assistant_api` continua sendo o orquestrador
- `ingestion_api` continua dono da verdade de contexto e persistência semântica
- a análise ad hoc pode consultar BigQuery diretamente no `ai_assistant_api`, mas só depois de resolver o dataset atual via contexto confiável

## Validation
- [ ] Tests unitários das tools
- [ ] Tests de integração para preview/apply semantic
- [ ] Tests de integração para análise ad hoc com limites
- [ ] Validação manual no chat da tela `Dataset Overview`

## Validation Notes
- `PYTHONPYCACHEPREFIX=/private/tmp/dativerso-ai-assistant-pycache python3 -m py_compile $(find services/ai_assistant_api/app services/ai_assistant_api/tests -name '*.py' | sort)`: passou.
- `npm run build` em `web/`: passou.
- `git diff --check`: passou.
- Tests unitários adicionados para preview/confirm/apply em `services/ai_assistant_api/tests/unit/test_tool_service.py`, mas não executados nesta sessão porque `pytest` não está instalado no ambiente.
