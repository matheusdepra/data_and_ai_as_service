# Custos (GCP) - Guardrails

## Objetivo
Manter custo previsivel no modelo on-demand, evitando surpresas de BigQuery e Storage.

## GCS
- Lifecycle rules por camada:
  - landing/quarantine: transicionar para coldline/archive apos N dias
  - bronze: manter por periodo curto/medio (conforme necessidade de reprocessamento)
  - silver/gold (se houver no lake): conforme politica do produto
- Habilitar uniform bucket-level access.
- Ativar versionamento apenas se houver requisito (custa mais storage).

## BigQuery
- On-demand no inicio.
- Padrao de particionamento em tabelas silver:
  - particionar por data (`_dv_ingested_at` ou coluna de evento quando houver)
  - clustering por chaves de filtro/join (quando conhecido)
- Governanca de queries (futuro):
  - limites de bytes processados por projeto/dataset
  - views/semantic layer para consumo

## FinOps basico
- Budgets + alerts por projeto.
- Labels por ambiente/produto.

