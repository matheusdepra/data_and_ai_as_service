# IAM e Seguranca (MVP)

## Objetivo
Garantir isolamento multi-tenant e principio de least privilege, mantendo operacao simples e custo baixo.

## Premissas do MVP
- Clientes nao acessam diretamente GCS/BigQuery.
- Apenas contas de servico Dativerso acessam o data plane.
- A API autentica via token e resolve `tenant_id` via membership; a request nao pode sobrescrever tenant via header/body.
- Jobs/funcoes do pipeline devem validar que bucket, path, metadata, `DV_TENANT_ID` e `DV_INGESTION_ID` apontam para o mesmo tenant/ingestao antes de processar.
- Usuarios finais nunca acessam buckets/datasets diretamente no MVP; acesso passa por API que valida membership e role.

## Contas de servico (sugestao)
- `sa-ingestion-api`: escreve em landing, escreve metadata
- `sa-ingestion-router`: leitura minima em landing (para metadados do evento), dispara jobs
- `sa-bronze-job`: le em landing, escreve em bronze/quarantine, escreve metadata
- `sa-silver-job`: le em bronze, escreve em BigQuery silver, escreve metadata

## Permissoes (alto nivel)
- GCS:
  - landing: write (api) + read (bronze)
  - quarantine: write (bronze)
  - bronze: write (bronze) + read (silver)
  - silver: opcional (se materializar no lake)
- BigQuery:
  - metadata dataset: read/write para pipeline
  - silver datasets (por tenant): write para `sa-silver-job`

## Evolucao (quando cliente precisar acesso direto)
Opcoes:
- Bucket por tenant (operacao simples; muitos buckets = gestao maior)
- Prefix access via IAM Conditions (mais complexo; bom para reduzir buckets)
- BigQuery dataset por tenant + IAM por dataset (recomendado para isolamento)
