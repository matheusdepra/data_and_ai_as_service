# Upload Flow Frontend Tasks

## Contexto

Fonte principal:
- `docs/design/upload/03-upload-dataset.md`
- `docs/frontend/frontend-guidelines.md`
- `docs/design/ui-ux-specs.md`

Objetivo:
- Ajustar a tela de upload existente para o fluxo de 3 estados:
  - Waiting for Upload
  - Analyzing Dataset
  - Review AI Understanding
- Reaproveitar design system e componentes existentes.
- Usar APIs funcionais reais e mockar apenas o que ainda nao existir.

## Checklist

- [x] Ler docs obrigatorios e spec de upload.
- [x] Mapear implementacao atual da tela e APIs disponiveis.
- [x] Implementar estado 1 (Waiting for Upload) com dropzone/selecionar arquivo e painel de ajuda.
- [x] Integrar envio real com API (`uploadFile`) e manter tenancy/token conforme fluxo atual.
- [x] Implementar estado 2 (Analyzing Dataset) com progresso e descobertas mockadas.
- [x] Implementar estado 3 (Review AI Understanding) com metadados editaveis e recomendacoes mockadas.
- [x] Garantir navegacao a partir da Home sem quebrar rotas existentes.
- [x] Validar build/typecheck.
- [x] Atualizar checklist com resultado final e observacoes de validacao.

## Resultado

- Arquivo principal alterado: `web/src/ui/pages/UploadPage.tsx`.
- Fluxo ajustado para 3 estados conforme spec de `docs/design/upload/03-upload-dataset.md`.
- API real mantida no envio (`uploadFile`) com `jwt` de `getJwt()`.
- Etapas de analise/entendimento mockadas no frontend por enquanto.
- Validacao executada: `npm run build` (ok).
- Validacao visual no browser nao executada nesta etapa.

## Refinamento Visual 2026-05-31

- [x] Aproximar estado `Review AI Understanding` da referencia `03b-upload-reference.png`.
- [x] Adicionar resumo superior do arquivo (nome, rows, columns, size, acao replace).
- [x] Reestruturar card principal para `AI Analysis` com badge de confidence e campos em layout mais proximo da spec.
- [x] Trocar `tags` de campo texto unico para chips editaveis com acao `Add tag`.
- [x] Reforcar painel lateral `AI Assistant` com bloco de analise, findings e acoes recomendadas no estado review.
- [x] Manter integracao real de upload e preservar mocks apenas onde backend ainda nao fornece dados de analise.
- [x] Rodar `npm run build` apos refinamento.

## Upload -> Processing Sem Colar Protocolo 2026-05-31

- [x] Adicionar rota canonica `/processing/:ingestionId`.
- [x] Atualizar `UploadPage` para abrir Processing pelo `ingestion_id` atual (sem input manual).
- [x] Preservar `/track` como alias temporario com redirecionamento de `?ingestion_id=`.
- [x] Implementar nova tela `Processing` com polling de `getIngestionDetail` (2.5s) e cleanup no unmount.
- [x] Mapear estados V1 (`processing`, `failed`, `ready`) com timeline e painel lateral.
- [x] Exibir `ingestion_id` como suporte opcional, sem friccao de navegacao.
- [ ] Validar visual final no navegador local com referencia `docs/design/processing/04a` e `04b`.
- [ ] Rodar `npm run build` apos implementacao do fluxo Processing.
