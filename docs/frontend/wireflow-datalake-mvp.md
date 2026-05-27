# Frontend (React) - Wireflow Datalake MVP

## Persona (MVP)
Usuario nao-tecnico (financeiro/operacao) que sobe arquivos recorrentes e precisa "ver que deu certo" e onde consumir.

## Telas (MVP)

### 1) Login (Fase 0/1)
Fase 0 (dev):
- campo para colar token

Fase 1:
- email + "Enviar link de acesso"
- tela de "verifique seu email"

### 2) Upload (Wizard simples)
Objetivo: reduzir erro e padronizar "Colecao" (dataset).

Passos:
1. Escolher `Colecao`:
   - selecionar existente (autocomplete)
   - ou criar nova (nome + descricao curta)
2. Upload do arquivo:
   - selecionar arquivo
   - mostrar validacoes simples (extensao/tamanho)
3. Confirmacao:
   - mostrar "Protocolo" (`ingestion_id`)
   - CTA: "Acompanhar processamento"

### 3) Acompanhar processamento
Objetivo: explicar status sem termos tecnicos, mas com rastreabilidade.

Componentes:
- Status atual (pill):
  - `Recebido` (landed)
  - `Preparando` (bronze_running)
  - `Bruto pronto` (bronze_ready)
  - `Pronto para uso` (silver_ready)
  - `Precisa de ajuste` (quarantined)
- Timeline:
  - upload recebido
  - arquivo bruto pronto
  - dados prontos para uso
- "Detalhes tecnicos" (accordion):
  - URIs GCS
  - tabela BigQuery
  - logs/erros (quando houver)

## Estados e mensagens (MVP)
- Sem token: "Voce precisa entrar para continuar."
- Upload ok: "Recebemos seu arquivo. Protocolo: ..."
- Quarantine: "Seu arquivo precisa de ajuste" + motivo + sugestao
- Em processamento: mostrar polling e "ultima atualizacao"

## Backlog de UI (P0)
- Upload com colecao guiada (existente vs nova)
- Tracking por ingestion_id com polling
- Visualizacao de artifacts (ao menos GCS bronze + BigQuery)

## Dependencias de backend (nao implementadas ainda)
- Endpoint "listar colecoes" (para autocomplete)
- Endpoint "listar ingestoes recentes" (para historico do usuario)
- Endpoint "criar colecao" (nome/descricao)

