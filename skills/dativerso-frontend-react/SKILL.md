---
name: dativerso-frontend-react
description: Use quando precisar planejar e desenhar o frontend do Dativerso em React (upload + acompanhar ingestao + artifacts), guiado por UX research (hipoteses, tarefas, criterios de sucesso) e alinhado ao ingestion-api e ao metadata store.
---

# Dativerso Frontend (React) + UX Workflow

## Quando usar
- O usuario quer definir UX/fluxos do produto (MVP) e/ou implementar UI em React para upload e tracking de ingestao.
- O usuario quer transformar o que existe no backend (ingestion-api + metadata em BigQuery) em uma experiencia guiada.

## Fontes do repo (ler antes de decidir UI)
- Contrato API: `docs/api/ingestion-api.md`
- Contrato de ingestao/estados: `docs/pipeline/ingestion-contract.md`
- Nomenclatura/camadas: `docs/data-lake/medallion.md`
- Perfil UX: `ai/agents/ux-researcher.md` (para perguntas, vieses, templates)

## Saidas esperadas (MVP)
- Wireflow (texto) com 2-3 telas: `Upload`, `Acompanhar`, (opcional) `Ingestoes recentes`.
- Lista de estados e mensagens (idle/loading/success/error) por tela.
- Checklist de instrumentacao (eventos/metricas) para medir ativacao e time-to-value.
- Backlog curto de frontend (P0/P1) com criterios de aceitacao.

## Passo a passo (planejamento primeiro)

### 1) Decisao de produto que precisa ser tomada agora (JTBD)
Perguntas minimas:
- Qual tarefa critica o usuario precisa completar no MVP?
  - Ex.: "subir um arquivo e ter um dataset consultavel no BigQuery"
- Qual e o sucesso?
  - Ex.: % uploads bem-sucedidos, TTV (upload -> silver_ready), taxa de quarantine, tempo por etapa
- Quais riscos nao podem acontecer?
  - Ex.: usuario nao encontra o `ingestion_id`, nao entende erro, duplica upload, perde rastreabilidade

### 2) Hipoteses e tarefas de teste (UX)
Defina 3 hipoteses maximas e 5 tarefas realistas.
Exemplo de tarefas:
- Fazer upload de um CSV com `dataset=olist` e encontrar o `ingestion_id`.
- Acompanhar ate `silver_ready` e identificar onde o dado foi parar (bucket/BigQuery).
- Entender um caso `quarantined` e o que corrigir no arquivo.

### 3) IA da informacao (IA = Information Architecture)
Modelo mental recomendado:
- "Uma ingestao" = `ingestion_id` + status + artifacts por camada.
Tela de tracking deve mostrar isso como timeline.

### 4) Wireflow (texto) recomendado
Upload:
- Inputs: arquivo, dataset, source
- Resultado: `ingestion_id` + CTA "Acompanhar"

Acompanhar:
- Campo `ingestion_id`
- Polling (com toggle)
- Timeline:
  - landed (GCS landing URI)
  - bronze_ready (GCS bronze + manifest)
  - silver_ready (BigQuery table)
  - quarantined (error.json)
- Errors list (reason_code/message)

### 5) Padroes de UI (React)
Padroes:
- Sem `useMemo/useCallback` por padrao (a menos que necessario).
- Polling com intervalo fixo (2-3s) + botao "pausar".
- Guardar token em `localStorage` apenas para dev.
- Mostrar sempre `tenant_id`, `ingestion_id`, `status` em destaque.

### 6) Integracao tecnica (minimo)
Endpoints MVP:
- `POST /v1/files` (multipart) -> retorna `ingestion_id`
- `GET /v1/ingestions/{ingestion_id}` -> retorna status + artifacts + errors

Notas:
- CORS: se o frontend chamar o Cloud Run diretamente, configurar CORS (ou proxy).
- Auth: em dev pode ser "colar token"; em prod preferir OIDC flow.

## Backlog (P0 / P1)
P0:
- Upload com feedback claro e retorno do `ingestion_id`
- Tracking com polling e timeline de artifacts
- Tratamento de erro (API 4xx/5xx) com mensagem acionavel

P1:
- Lista "ingestoes recentes" (precisa endpoint novo)
- Downloads/links clicaveis (GCS/BQ) quando usuario tiver acesso
- Ajuda contextual para `dataset/source` (naming e exemplos)

