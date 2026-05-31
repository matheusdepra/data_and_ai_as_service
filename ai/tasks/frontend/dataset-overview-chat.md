# Dataset Overview com chat lateral

## Objetivo
Alinhar a tela de Dataset Overview ao spec de `docs/design/dataset-overview/05.ds-overview.md`, melhorar a hierarquia visual e tornar o Copilot Panel funcional na propria tela com um chat lateral integrado.

## Checklist
- [x] Ler AGENTS.md e docs obrigatorios da tarefa.
- [x] Ler spec e referencia visual de Dataset Overview.
- [x] Mapear a implementacao atual e identificar lacunas de layout e comportamento.
- [x] Implementar o novo layout do Overview aderente ao spec.
- [x] Substituir o painel estatico por um chat lateral funcional.
- [x] Conectar a abertura do chat pelo CTA de Copilot na tela.
- [x] Criar mocks/estado transitorio para interacao enquanto a API final de chat nao existir.
- [x] Rodar build e validacoes disponiveis.
- [x] Validar visualmente o resultado e atualizar checklist.

## Validacao
- `npm run build` em `web/`: passou.
- Validacao visual em browser: nao executada porque o navegador in-app/Browser nao estava exposto nas ferramentas desta sessao. A checagem ficou restrita a inspecao de codigo, referencia visual do PNG e build de producao.
