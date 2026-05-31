# Backend overview + resume flow

## Objetivo
Implementar inferência real para Silver, geração de metadados de overview no backend, tela de overview real e listagem de ingestões para retomar o fluxo pelo `ingestion_id`.

## Checklist
- [x] Revisar contratos atuais de ingestion/read model/frontend e ajustar o plano de implementação.
- [x] Backend pipeline: adicionar normalização de schema, casts e manifest enriquecido no fluxo Bronze/Silver.
- [x] Backend overview: persistir status/payload no Firestore e expor APIs `GET/POST` do overview.
- [x] Infra: adicionar job/variáveis/IAM necessários para a etapa de overview.
- [x] Frontend: criar listagem real de ingestões e navegação por status.
- [x] Frontend: criar tela real de dataset overview com polling e retry.
- [x] Atualizar docs/checklist afetados.
- [x] Validar com checks locais e registrar limitações da validação end-to-end remota.

## Validacao registrada
- `python3 -m py_compile` nos apps/jobs Python afetados, incluindo `overviewify`.
- `npm run build` no frontend web.
- `bash -n` nos scripts de build/push.
- `terraform validate` em `infra/terraform`.

## Limitacoes
- A validacao end-to-end no ambiente `dev` ficou pendente nesta sessao porque nao havia credenciais/token do ambiente para executar `GET /v1/me`, upload real, polling do pipeline e abertura autenticada no browser.
- A validacao visual em browser local nao foi executada nesta sessao; o fechamento ficou sustentado por build do frontend, revisao de codigo e contratos.
