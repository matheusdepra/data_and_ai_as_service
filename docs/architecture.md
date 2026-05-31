# Dativerso Data Platform (GCP) - Arquitetura

## Objetivo
Entregar um Data Lake moderno com custo baixo (serverless / on-demand) para empresas pequenas, começando por ingestao via API REST (upload de arquivos) e evoluindo para transformacoes assistidas por IA e uma UI de enriquecimento (fase futura).

## Princípios
- Scale-to-zero: evitar VMs/servicos sempre ligados; preferir Cloud Run / Cloud Run Jobs / Eventarc / Pub/Sub / GCS / BigQuery.
- Idempotência: reprocessamento seguro por `ingestion_id`.
- Separacao por camadas (medallion) + quarantine para conter erro/risco.
- Multi-tenant: identificar `tenant_id` (derivado do token) e isolar dados (MVP: isolamento logico; evolucao: isolamento por IAM/dataset/bucket).

## Fluxo de Alto Nível (MVP)
1. Cliente chama API REST (upload).
2. API grava o arquivo em `GCS landing` e registra a ingestao (metadata).
3. Evento de `Object Finalize` no bucket landing dispara o pipeline.
4. Pipeline valida e roteia:
   - invalido/suspeito -> `GCS quarantine` + status `quarantined`
   - valido -> `GCS bronze` (normalizacao tecnica) + status `bronze_ready`
5. Bronze -> Silver:
   - transformacoes simples e materializacao em BigQuery (consumo inicial)
   - status `silver_ready`

## Componentes GCP (sugeridos)
- API de upload: Cloud Run (service) `ingestion-api`
- Storage: GCS buckets por ambiente e camada (landing/quarantine/bronze/silver)
- Eventos: Eventarc (GCS) -> Pub/Sub (opcional) -> Cloud Run `ingestion-router`
- Processamento: Cloud Run Jobs `bronzeify` e `silverize`
- Warehouse: BigQuery (datasets por tenant e camada, no MVP)
- Segredos: Secret Manager (se necessario)
- Observabilidade: Cloud Logging/Monitoring + Error Reporting (Cloud Run)

## Multitenancy (MVP)
No MVP, os clientes nao acessam diretamente o GCS/BigQuery; o acesso e mediado pela API Dativerso.
O isolamento e feito por:
- `tenant_id` obrigatorio no metadata e nos caminhos do GCS
- datasets BigQuery separados por tenant (recomendado) OU prefixo de tabela (alternativa)

Opcoes (ordem recomendada):
1. (Recomendado) BigQuery dataset por tenant: controle de acesso simples via IAM por dataset.
2. Tabelas com prefixo `{tenant_id}__...`: simples, mas isolamento e governanca ficam mais dificeis.
3. (Futuro) GCS prefix-level IAM via IAM Conditions, ou bucket por tenant quando o cliente precisar acesso direto.

## Artefatos por Camada
- Landing: bytes originais imutaveis (somente append via novos objetos)
- Quarantine: arquivos rejeitados + relatorio de erro
- Bronze: normalizacao tecnica + `manifest.json`
  - alvo: formatos colunares (Parquet) quando fizer sentido
  - implementacao inicial pode comecar como "copy + manifest" e evoluir para conversao
- Silver: dados prontos para analise (BigQuery como consumo inicial)

## Limites do MVP (intencionais)
- Tipos suportados: CSV, JSON (NDJSON preferivel, mas JSON arbitrario suportado), Parquet.
- Transformacoes: regras basicas (schema inference, casts, normalizacao de nomes, dedupe simples).
- UI: fora do escopo (apenas API + metadata).

## JSON arbitrario (MVP)
Para suportar JSON arbitrario sem "adivinhar" um modelo final cedo demais:
- Landing guarda o JSON original imutavel.
- Bronze normaliza para Parquet com uma coluna `payload` (JSON/string) + colunas `_dv_*` de lineage.
- Silver (BigQuery) materializa inicialmente a mesma estrutura (payload + lineage); mapeamentos/flattening ficam para fase de enriquecimento (assistido por IA/UI).

## AI Assistant API (P1/P2)
- Serviço backend-only em `services/ai_assistant_api/`, preparado para Cloud Run e futuro frontend React.
- Arquitetura limpa com camadas API, application, domain, infrastructure e core/config.
- Rotas FastAPI chamam apenas use cases; BigQuery, Vertex AI/Gemini, prompts, memória e contexto ficam atrás de portas/interfaces.
- O `tenant_id` deve continuar vindo de autenticação/membership, nunca do corpo da requisição. A implementação inicial usa provider mock apenas para desenvolvimento local.
- BigQuery é acessado somente por adapters/repositórios de infraestrutura e com espaço para governança de bytes, labels por tenant e validação de escopo.
- Vertex AI/Gemini é substituível por qualquer provider LLM que implemente a porta de domínio.
