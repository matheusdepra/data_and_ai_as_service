# Nomenclatura amigavel (usuario nao-tecnico)

## Objetivo
Traduzir conceitos tecnicos (camadas, dataset, ingestion_id) para linguagem de negocio sem perder rastreabilidade.

## Proposta de nomes (UI)
- **Bronze** -> `Bruto`
  - texto: "Arquivo como chegou, sem tratamento."
- **Silver** -> `Pronto para uso`
  - texto: "Dados limpos e padronizados para consultas e dashboards."
- **Gold** -> `Insights`
  - texto: "Dados agregados e organizados para analise (futuro)."

## "Dataset" na UI
`Dataset` (tecnico) costuma confundir. Alternativas:
- `Colecao` (recomendado): uma colecao recorrente de arquivos do mesmo assunto
- `Fonte` (bom para conectores)
- `Pasta` (soa como storage; pode confundir com sync)

Recomendacao:
- UI: `Colecao`
- API/infra: manter `dataset` por enquanto

Exemplo:
- Colecao: `Faturamento`
- Upload: `faturamento_marco.csv`, `faturamento_abril.csv` ...

## Identificadores internos (nao mostrar como primario)
- `ingestion_id`: mostrar como "Protocolo" (copiavel) e usar para suporte/diagnostico
- `tenant_id`: nao expor como termo principal; usar "Empresa" / "Workspace"

