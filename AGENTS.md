# AGENTS.md (Steering)

## Objetivo
- Documentar “como trabalhamos aqui” para humanos e agentes (regras curtas, acionáveis e atuais).

## Escopo
- Este arquivo vale para o projeto inteiro.
- Regras mais específicas podem existir em subpastas via `subdir/AGENTS.md` (o mais específico vence).

## Stack (preencher)
- Linguagem/runtime:
- Gerenciador de dependências:
- Versões (ex.: Node 20 / Python 3.12):

## Comandos do dia a dia (preencher)
- Instalar:
- Rodar (dev):
- Testar:
- Lint/format:

## Estrutura do projeto (preencher)
- `docs/`: documentacao da plataforma e padroes. Comece por `docs/README.md`.
- `ai/`: prompts/artefatos de IA e perfis de agentes (ver `ai/AGENTS.md`).
- `ai/tasks/`: planos/checklists de trabalho dos agentes. Sempre que uma tarefa exigir plano, acompanhamento ou etapas, crie/atualize um Markdown aqui e marque os checks conforme avanca.

## Rotina obrigatoria ao iniciar conversa/tarefa
- Antes de planejar ou implementar, leia este `AGENTS.md` e o `AGENTS.md` mais especifico da area alterada, se existir.
- Consulte sempre `docs/README.md`, `docs/architecture.md`, `docs/project/status-2026-05-27.md` e `docs/decisions/README.md` antes de propor ou editar solucao.
- Leia tambem os docs da area tocada pela tarefa. Exemplos: frontend em `docs/frontend/` e `docs/design/`; APIs em `docs/api/`; produto/tenancy em `docs/product/`; dados em `docs/data-lake/`, `docs/pipeline/` e `docs/metadata/`; infra/seguranca/custos em `docs/runbooks/`, `docs/security/`, `docs/cost/` e `infra/terraform/AGENTS.md`.
- Use os documentos em `docs/` como fonte de padrao do projeto. Se a implementacao divergir do que esta documentado, atualize os docs ou registre a decisao antes de finalizar.
- Se a tarefa tiver plano, checklist, mais de uma etapa, acompanhamento de progresso ou pedido explicito de planejamento, crie/atualize um Markdown em `ai/tasks/` antes de seguir para codigo.
- Ao retomar trabalho existente, procure primeiro por tarefa relacionada em `ai/tasks/` e atualize o checklist em vez de criar plano duplicado.
- Durante a execucao, mantenha o Markdown de `ai/tasks/` alinhado ao progresso real: marque `[x]` apenas quando o item estiver concluido e verificado.
- Antes de finalizar, confirme se docs/testes/checklists afetados foram atualizados ou explique claramente por que nao se aplicam.

## Validacao visual e uso de navegador
- Para validar UI local, prefira o navegador in-app/Browser quando a sessao expuser essa capacidade.
- Nao confunda `web`/busca na internet com Browser/in-app browser: `web` serve para consultar fontes externas; validacao visual de localhost deve usar Browser, Playwright local ou outra renderizacao local.
- Se o navegador in-app nao estiver disponivel na sessao (`iab` nao exposto), registre isso claramente e use o melhor fallback verificavel: build/typecheck/lint, testes, inspecao de codigo, Playwright local se instalado, screenshots por ferramenta local se disponivel.
- Ao usar fallback no lugar de validacao visual real, informe no fechamento exatamente o que foi verificado e o que ficou sem validacao visual no browser.

## Convenções (preencher)
- Estilo/formatter:
- Nomes (arquivos, funções, variáveis):
- Imports (ordem, aliases):

## Planos e tarefas de agentes
- Planos operacionais e checklists devem ser versionados em `ai/tasks/`, nao em `tasks/` na raiz.
- Use subpastas por area quando fizer sentido, por exemplo `ai/tasks/frontend/`.
- Ao executar uma tarefa com checklist, atualize o arquivo conforme o progresso real: marque `[x]` apenas para itens efetivamente concluidos.
- Se o usuario pedir plano antes de implementacao, registre o plano em `ai/tasks/` antes de seguir para codigo.

## Guardrails (o que NÃO fazer)
- Multi-tenant é requisito obrigatório: `tenant_id` vem da autenticação/membership, nunca de input livre do cliente.
- APIs, jobs e funções devem validar que paths, metadados e artefatos pertencem ao mesmo `tenant_id` antes de ler, copiar, transformar ou expor dados.
- Usuário só pode acessar recursos do tenant onde possui membership e role compatível.
- Evitar refactors grandes sem pedido explícito.
- Não alterar API/contratos sem atualizar testes/docs.
- Não adicionar dependências novas sem justificar.
- Não commitar segredos (chaves, tokens, dumps).

## Como pedir “subagentes” para o Codex
- Diga explicitamente o objetivo e o escopo: “crie um subagente explorer para mapear X” / “worker para implementar Y”.
- Defina entregáveis: arquivos esperados, checklist, ou perguntas objetivas.
