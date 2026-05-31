# Dataset Overview Semantic Refinement API

Status: Draft  
Version: 1.0  
Scope: contrato tecnico para leitura e escrita dos refinamentos semanticos do `Dataset Overview`

## 1. Objetivo

Permitir que a UI e o agente `dataset-overview-agent`:

- leiam a camada semantica atual do overview
- proponham refinamentos permitidos
- persistam correcoes de negocio feitas pelo usuario
- preservem a separacao entre:
  - fatos tecnicos derivados do dataset
  - interpretacao semantica editavel

## 2. Principio central

O overview passa a ter duas camadas:

1. `derived overview`
   - gerado automaticamente pelo pipeline/backend
2. `semantic refinements`
   - ajustes feitos por usuario/agente em campos permitidos

Regra:

```text
camada derivada nao e sobrescrita;
camada refinada e aplicada por overlay controlado.
```

## 3. Endpoints propostos

### 3.1 Ler a camada semantica refinada

```text
GET /v1/ingestions/{ingestion_id}/overview/semantic
```

Retorna:

- snapshot refinado atual
- origem de cada campo relevante
- metadata de auditoria

Exemplo de response:

```json
{
  "tenant_id": "acme",
  "ingestion_id": "uuid",
  "base_version": "2026-05-31T20:18:00Z",
  "updated_at": "2026-05-31T20:25:10Z",
  "updated_by": {
    "sub": "user-123",
    "email": "ana@acme.com",
    "type": "user"
  },
  "semantic": {
    "dataset_header": {
      "classification": "Commercial / Marketing",
      "tags": ["Marketing", "Campaigns", "Leads"]
    },
    "ai_understanding": {
      "summary": "This dataset supports marketing campaign analysis and audience segmentation."
    },
    "business_description": {
      "business_area": "Marketing",
      "domain": "Campaign Performance",
      "data_type": "Master Data",
      "typical_usage": ["Campaign analytics", "Audience segmentation", "Performance reporting"]
    },
    "terms": ["Campaign", "Audience", "Lead Source"]
  }
}
```

### 3.2 Persistir refinamento semantico

```text
PATCH /v1/ingestions/{ingestion_id}/overview/semantic
```

Objetivo:

- aplicar mudancas parciais nos campos permitidos
- manter operacao idempotente
- rejeitar campos fora do allowlist

Headers:

- `Authorization: Bearer <token>`
- `x-api-key: <api_key>` quando via gateway
- `If-Match: <base_version>` opcional, recomendado para controle otimista

Body exemplo:

```json
{
  "patch": {
    "dataset_header": {
      "classification": "Commercial / Marketing",
      "tags": ["Marketing", "Campaigns", "Leads"]
    },
    "business_description": {
      "business_area": "Marketing",
      "domain": "Campaign Performance",
      "typical_usage": ["Campaign analytics", "Audience segmentation", "Performance reporting"]
    },
    "terms": ["Campaign", "Audience", "Lead Source"]
  },
  "reason": "User clarified that the dataset is used by the marketing team instead of CRM."
}
```

Response exemplo:

```json
{
  "ok": true,
  "tenant_id": "acme",
  "ingestion_id": "uuid",
  "base_version": "2026-05-31T20:18:00Z",
  "updated_at": "2026-05-31T20:25:10Z",
  "updated_by": {
    "sub": "user-123",
    "email": "ana@acme.com",
    "type": "user"
  },
  "semantic": {
    "dataset_header": {
      "classification": "Commercial / Marketing",
      "tags": ["Marketing", "Campaigns", "Leads"]
    },
    "business_description": {
      "business_area": "Marketing",
      "domain": "Campaign Performance",
      "typical_usage": ["Campaign analytics", "Audience segmentation", "Performance reporting"]
    },
    "terms": ["Campaign", "Audience", "Lead Source"]
  }
}
```

### 3.3 Preview de refinamento sem persistencia

Opcional, mas recomendado para uso por agente/coordenador:

```text
POST /v1/ingestions/{ingestion_id}/overview/semantic/preview
```

Objetivo:

- validar patch
- aplicar overlay em memoria
- devolver resultado sem persistir

Uso ideal:

- UI mostra “proposta de mudanca”
- usuario confirma
- depois chama `PATCH`

## 4. Campos permitidos

Allowlist de patch:

```yaml
dataset_header:
  - classification
  - tags
ai_understanding:
  - summary
business_description:
  - business_area
  - domain
  - data_type
  - typical_usage
terms:
  - replace_full_list
dataset_knowledge:
  - title
  - description
  - business_area
  - domain
```

Notas:

- `dataset_header.name` nao deve ser alterado por este endpoint por padrao
- `relationships` podem receber notas semanticas no futuro, mas nao nesta v1
- `suggested_outputs` devem continuar derivados ou armazenados separadamente

## 5. Campos proibidos

O backend deve rejeitar patch em:

- `summary.rows`
- `summary.columns`
- `summary.size_bytes`
- `summary.language`
- `summary.created_date`
- `quality.*`
- `schema.*`
- `preview_rows`
- `technical_summary.*`
- `relationships[*].confidence`
- qualquer campo fora do allowlist

Erro esperado:

```json
{
  "error": "invalid_patch",
  "message": "Patch contains fields outside the allowed semantic scope.",
  "invalid_paths": ["quality.overall_score", "schema.columns[0].inferred_type"]
}
```

## 6. Semantica de merge

### 6.1 Regra geral

O `PATCH` deve ser semantico e parcial.

Regras:

- objetos: merge por chave
- arrays semanticos curtos:
  - `tags`
  - `terms`
  - `typical_usage`
  substituem a lista inteira

### 6.2 Overlay na leitura

Ao servir:

```text
GET /v1/ingestions/{ingestion_id}/overview
```

o backend pode futuramente retornar:

- `overview.base`
- `overview.semantic`
- `overview.resolved`

Ou, no MVP:

- manter `GET /overview` como hoje
- adicionar `GET /overview/semantic`
- frontend faz merge local

Recomendacao:

1. curto prazo: frontend faz merge local
2. medio prazo: backend devolve `resolved overview`

## 7. Modelo de armazenamento

## 7.1 Firestore recomendado

Estrutura proposta:

```text
tenants/{tenant_id}/ingestions/{ingestion_id}/derived/overview
tenants/{tenant_id}/ingestions/{ingestion_id}/derived/overview_semantic
tenants/{tenant_id}/ingestions/{ingestion_id}/derived/overview_semantic_history/{event_id}
```

### Documento `overview_semantic`

Campos sugeridos:

```yaml
base_version:
updated_at:
updated_by:
reason:
semantic:
  dataset_header:
  ai_understanding:
  business_description:
  terms:
```

### Colecao `overview_semantic_history`

Append-only para auditoria:

```yaml
created_at:
created_by:
reason:
patch:
base_version:
resolved_after_patch:
```

## 7.2 BigQuery opcional

Se houver necessidade analitica/auditoria pesada:

- espelhar historico em tabela BigQuery
- nao usar BQ como store primario dessa escrita interativa

## 8. Autorizacao

Regras obrigatorias:

- `tenant_id` sempre resolvido pela autenticacao
- `ingestion_id` precisa pertencer ao mesmo tenant
- usuario precisa ter role compativel

Sugestao de role:

- `admin`: pode editar
- `editor`: pode editar
- `viewer`: nao pode editar

Erros:

- `401` token invalido
- `403` sem membership ou role insuficiente
- `404` ingestao inexistente no tenant

## 9. Concorrencia e versionamento

## 9.1 Controle otimista

Cada documento `overview_semantic` deve manter:

- `base_version`
- `updated_at`

O cliente pode mandar:

- `If-Match`

Se a versao divergir:

```json
{
  "error": "version_conflict",
  "message": "Semantic overview changed since the client loaded it.",
  "current_version": "2026-05-31T20:25:10Z"
}
```

## 9.2 Resolucao de conflito

No MVP:

- rejeitar conflito
- cliente recarrega e reaplica

## 10. Auditoria

Toda escrita deve registrar:

- `tenant_id`
- `ingestion_id`
- `updated_by.sub`
- `updated_by.email`
- `updated_by.type`
- `reason`
- `patch`
- `created_at`

Logs estruturados tambem devem incluir:

- `screen=dataset_overview`
- `operation=overview_semantic_patch`

## 11. Integracao com agente

## 11.1 Fluxo recomendado

1. agente recebe contexto da tela
2. agente gera proposta de refinamento
3. UI mostra preview
4. usuario confirma
5. frontend chama `PATCH /overview/semantic`
6. backend persiste e devolve snapshot refinado

## 11.2 Modo coordenado

Quando houver coordenador:

- `dataset-overview-agent` monta patch permitido
- `coordinator-agent` decide se persiste
- backend continua validando allowlist e tenancy

## 12. Recomendacao de implementacao

Fase 1:

- `GET /overview/semantic`
- `PATCH /overview/semantic`
- storage em Firestore
- history append-only
- frontend faz merge local

Fase 2:

- `POST /overview/semantic/preview`
- `GET /overview` com `resolved overview`
- controles de conflito melhores

## 13. Fora de escopo desta API

- alteracao de schema fisico
- recalculo de quality score
- update de preview rows
- execucao SQL arbitraria
- criacao de workspace/assets
- mudancas cross-dataset
