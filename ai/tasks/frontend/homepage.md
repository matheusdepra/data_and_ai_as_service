# Homepage Frontend Tasks

## Contexto

Fonte principal:
- `docs/frontend/frontend-guidelines.md`
- `docs/design/ui-ux-specs.md`
- `docs/design/home/02-home-screen.md`
- `docs/design/home/02-home reference.png`

Decisao atual:
- Manter **light theme** como padrao.
- Ignorar a direcao dark-first anterior.
- Manter a tela de login atual sem refactor neste ciclo.
- Construir a Home como **launchpad**, nao como dashboard operacional.

## Checklist

## Verificacao 2026-05-30

Status: implementacao base compila, mas a Home ainda esta distante da referencia visual `02-home reference.png`.

Validado:
- `npm run build` em `/web` conclui com sucesso.
- Referencia visual local revisada.
- Docs obrigatorios consultados: `docs/README.md`, `docs/architecture.md`, `docs/project/status-2026-05-27.md`, `docs/decisions/README.md`, `docs/frontend/frontend-guidelines.md`, `docs/design/ui-ux-specs.md`, `docs/design/home/02-home-screen.md`.

Bloqueio parcial:
- Validacao visual no browser nao foi concluida: servidor Vite subiu em `http://127.0.0.1:5173/`, mas o navegador in-app nao estava disponivel nesta sessao e nao ha Playwright/Puppeteer/Chromium instalado localmente.

Principais gaps frente a referencia atual:
- [x] Ajustar `PageShell` e `AppSidebar` para sidebar real de `280px`.
- [x] Trocar hero em card por header aberto com saudacao (`Welcome back, Matheus.`) e subtitulo (`What would you like to do today?`).
- [x] Reposicionar action cards como cards horizontais compactos (icone + texto + seta).
- [x] Renomear `Continue Working` para `Recent Projects` e exibir como lista em painel unico.
- [x] Refazer `Recent Activity` para painel pareado com projetos, timeline com icones e timestamp alinhado a direita.
- [x] Refazer `AI Suggestions` com cards e CTA primaria roxa.
- [x] Ajustar topnav: busca compacta + atalho `⌘ K` + sino com indicador + avatar com iniciais.
- [x] Ajustar sidebar footer para tenant selector + usuario.
- [ ] Revisar paleta/tokens usados no codigo: ainda existem muitos hex diretos em vez de tokens `dv-*`.
- [ ] Reduzir CSS legado em `web/src/ui/styles.css`.
- [x] Remover `web/src/ui/styles 2.css` (arquivo nao era importado).
- [ ] Validar responsividade desktop `1440x900` e mobile/tablet depois dos ajustes visuais.

### 1. Preparacao e leitura

- [x] Confirmar direcao visual principal como light theme.
- [x] Confirmar que login atual fica preservado para testes.
- [x] Registrar tarefas em `ai/tasks/frontend/homepage.md`.
- [x] Revisar imagem de referencia da Home no navegador/visualizador local.
- [x] Mapear arquivos atuais do `/web` impactados pela mudanca.

### 2. Fundacao tecnica

- [x] Definir estrategia de migracao da estrutura atual `src/ui` para arquitetura por feature.
- [x] Criar estrutura base:
  - [x] `src/app/router.tsx`
  - [x] `src/app/providers.tsx`
  - [x] `src/app/layout.tsx`
  - [x] `src/components/layout/`
  - [x] `src/components/ui/`
  - [x] `src/features/home/`
  - [x] `src/services/api/`
  - [x] `src/lib/`
  - [x] `src/types/`
- [x] Adicionar TailwindCSS.
- [x] Adicionar shadcn/ui.
- [x] Adicionar TanStack Query.
- [x] Adicionar Lucide React.
- [x] Preparar Zod e React Hook Form para forms futuros, sem aplicar onde nao for necessario.

### 3. Design system minimo

- [x] Centralizar tokens de design:
  - [x] primary `#6E5BFF`
  - [x] secondary `#5EC9FF`
  - [x] accent `#8B5CF6`
  - [x] background `#FFFFFF`
  - [x] surface `#F8F9FC`
  - [x] border `#E8EBF2`
  - [x] text primary `#101828`
  - [x] text secondary `#667085`
  - [x] success `#12B76A`
  - [x] warning `#F79009`
  - [x] error `#F04438`
- [x] Configurar tipografia Inter/fallbacks.
- [x] Criar componentes compartilhados:
  - [x] `AppSidebar`
  - [x] `TopNav`
  - [x] `Breadcrumbs`
  - [x] `PageShell`
  - [x] `ActionCard`
  - [x] `EmptyState`
  - [x] `LoadingState`
  - [x] `ErrorState`
  - [x] `ActivityTimeline`
  - [x] `SuggestionCard`

### 4. Layout autenticado

- [x] Implementar sidebar fixa com largura `280px`.
- [x] Incluir navegacao principal:
  - [x] Home
  - [x] Workspaces
  - [x] Datasets
  - [x] Catalog
  - [x] Sources
- [x] Remover itens proibidos da navegacao principal:
  - [x] Administration
  - [x] ETL
  - [x] Pipelines
  - [x] Jobs
  - [x] Infrastructure
- [x] Implementar area de usuario no rodape da sidebar:
  - [x] User Name
  - [x] Tenant
  - [x] Environment
  - [x] Profile Menu placeholder
- [x] Implementar top navigation:
  - [x] Breadcrumbs
  - [x] Search com placeholder `Search datasets, workspaces or ask Dativerso...`
  - [x] Notifications placeholder
  - [x] Profile action

### 5. Home feature

- [x] Criar `src/features/home/types.ts`.
- [x] Criar `src/features/home/mocks/home.mock.ts`.
- [x] Criar `src/features/home/services/home-service.ts` usando mock adapter.
- [x] Criar `src/features/home/hooks/use-home-data.ts` com TanStack Query.
- [x] Criar pagina Home fina, delegando UI para componentes.

### 6. Home UI

- [x] Implementar hero section:
  - [x] Titulo `What would you like to build today?`
  - [x] Subtitulo `Build datasets, analytics assets and dashboards with AI assistance.`
- [x] Implementar action cards:
  - [x] Upload Dataset
  - [x] Create Workspace
  - [x] Explore Catalog
- [x] Implementar `Continue Working`:
  - [x] Maximo de 5 workspaces
  - [x] Nome
  - [x] Descricao curta
  - [x] Ultima atualizacao
  - [x] CTA `Open Workspace`
- [x] Implementar `Recent Activity`:
  - [x] Timeline
  - [x] Maximo de 10 eventos
  - [x] Dataset uploaded
  - [x] Workspace created
  - [x] Dashboard generated
- [x] Implementar `Suggested Next Steps`:
  - [x] Relationship suggestion
  - [x] Workspace suggestion
  - [x] Asset suggestion
  - [x] Acoes `Review`, `Open`, `Dismiss`
- [x] Implementar empty state:
  - [x] Titulo `Welcome to Dativerso`
  - [x] Descricao conforme spec
  - [x] CTA `Upload Dataset`

### 7. Rotas e preservacao do login

- [x] Redirecionar `/` para `/home`.
- [x] Garantir que `/login`, `/login/check-email` e `/login/complete` continuem funcionando.
- [x] Aplicar layout autenticado apenas fora das rotas de login.
- [x] Manter upload/track existentes acessiveis, mesmo que visualmente sejam revisados depois.

### 8. Estados e qualidade

- [x] Implementar estados loading/success/empty/error na Home.
- [x] Garantir que mocks nao fiquem hardcoded nos componentes.
- [x] Garantir que componentes nao chamem `fetch` diretamente.
- [x] Garantir acessibilidade basica:
  - [x] HTML semantico
  - [x] botoes como `<button>`
  - [x] labels quando houver inputs
  - [x] focus states visiveis
- [x] Remover emojis e icones decorativos sem funcao.
- [ ] Evitar custom CSS fora do necessario.
  - [ ] Reduzir CSS legado em `web/src/ui/styles.css`.
  - [x] Remover ou arquivar `web/src/ui/styles 2.css` se nao for usado.

### 9. Validacao

- [x] Rodar `npm run build`.
- [ ] Validar no browser em viewport desktop minima `1440x900`.
- [ ] Validar que a Home permite:
  - [ ] entender proposito em ate 5 segundos
  - [ ] iniciar atividade em ate 10 segundos
  - [ ] voltar a trabalho ativo em ate 5 segundos
  - [ ] descobrir recomendacoes de IA naturalmente
- [x] Registrar APIs necessarias para substituir mocks.

## APIs candidatas para descoberta posterior

- [x] Home summary / launchpad state.
- [x] Recent workspaces.
- [x] Recent activity.
- [x] AI suggestions.
- [x] User context / tenant / environment para sidebar.
- [x] Global search.
