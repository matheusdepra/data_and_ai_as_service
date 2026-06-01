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
- [x] Integrar o chat do Overview com `services/ai_assistant_api`.
- [x] Fazer o `ai_assistant_api` buscar contexto confiavel no `ingestion_api`.
- [x] Rodar build/validacoes apos remover o mock do frontend.
- [x] Revisitar a tela de Overview com base na referencia visual atualizada.
- [x] Tornar as abas `Overview`, `Data`, `Schema`, `Insights` e `Lineage` funcionais.
- [x] Redistribuir os cards para evitar uma `Overview` longa e baguncada.
- [x] Manter `AI Understanding` e `Dataset Summary` como foco principal da aba `Overview`.
- [x] Garantir que o `Dataset Copilot` permaneça disponivel em todas as abas como componente separado.
- [x] Rodar build/validacoes apos a reorganizacao.
- [x] Aproximar o topo da tela da referencia visual, removendo o heading da pagina.
- [x] Mover `Last updated` para a barra superior ao lado das acoes.
- [x] Remover cards secundarios da coluna direita e deixar apenas o `Dataset Copilot` com mais destaque.
- [x] Rodar build/validacoes apos o refinamento visual do topo e da coluna direita.
- [x] Fundir hero do dataset com status e acoes na faixa superior, sem card branco destacado.
- [x] Subir o `Dataset Copilot` para compartilhar a primeira dobra com o hero do dataset.
- [x] Rodar build/validacoes apos reorganizar a primeira dobra.
- [x] Separar a composicao em tres blocos: hero no topo esquerdo, copilot na coluna direita e grid dinamico abaixo do hero.
- [x] Rodar build/validacoes apos ajustar o grid principal da pagina.
- [x] Simplificar o hero, mantendo apenas informacoes realmente uteis no topo.
- [x] Reprojetar o `Dataset Summary` para ficar mais responsivo e mais proximo da referencia visual.
- [x] Remover `Source` e `Table` do summary e usar icones/cores mais descritivos.
- [x] Reduzir o espacamento entre hero, tabs e o grid principal.
- [x] Corrigir regressao visual do `Dataset Summary`: valores estourando e cards altos demais.
- [x] Rodar build/validacoes apos estabilizar o summary.
- [x] Implementar formatacao compacta real para rows, language e created no Dataset Summary.
- [x] Ajustar cards do Dataset Summary para valores sem reticencias em desktop.
- [x] Reduzir vazio do AI Understanding sem apertar o conteudo.
- [x] Padronizar loading inicial para ocultar conteudo real enquanto skeleton aparece.
- [x] Reusar `LoadingState` compartilhado em telas que ainda tinham loader local.
- [x] Melhorar renderizacao das respostas do Dataset Copilot com markdown basico e tabelas.
- [x] Esconder prompts/contexto auxiliar do drawer quando a conversa tiver mensagens do usuario.
- [x] Enviar mensagem no drawer com Cmd/Ctrl + Enter.

## Validacao
- `npm run build` em `web/`: passou.
- `npm run build` em `web/` apos reorganizar as abas do Dataset Overview: passou.
- `npm run build` em `web/` apos refinar o topo e a coluna direita do Dataset Overview: passou.
- `npm run build` em `web/` apos reorganizar a primeira dobra do Dataset Overview: passou.
- `npm run build` em `web/` apos separar hero, copilot e grid dinamico em tres blocos: passou.
- `npm run build` em `web/` apos simplificar o hero e redesenhar o Dataset Summary: passou.
- `npm run build` em `web/` apos corrigir a regressao visual do Dataset Summary: passou.
- `npm run build` em `web/` apos aplicar formatacao compacta real no Dataset Summary: passou.
- `npm run build` em `web/` apos padronizar loading inicial: passou.
- `npm run build` em `web/` apos melhorar renderizacao do Dataset Copilot: passou.
- Validacao visual em browser: nao executada porque o navegador in-app/Browser nao estava exposto nas ferramentas desta sessao. A checagem ficou restrita a inspecao de codigo, referencia visual do PNG e build de producao.
- `PYTHONPYCACHEPREFIX=/private/tmp/dativerso-ai-assistant-pycache python3 -m py_compile $(find services/ai_assistant_api/app services/ai_assistant_api/tests -name '*.py' | sort)`: passou.
- `terraform -chdir=infra/terraform fmt cloudrun.tf`: passou.
- `git diff --check`: passou.
