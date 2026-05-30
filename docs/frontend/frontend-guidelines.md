# Frontend Engineering Guidelines

Use React with TypeScript and Vite.

Use TailwindCSS for styling and shadcn/ui for base components.

Do not use styled-components unless explicitly requested.

Use feature-based architecture.

Suggested structure:

src/
  app/
    router.tsx
    providers.tsx
    layout.tsx

  components/
    ui/
    layout/
    common/

  features/
    home/
    upload/
    ingestion/
    datasets/
    copilot/
    workspace/
    catalog/

  services/
    api/
    query-client.ts

  hooks/
  types/
  lib/
  utils/

Rules:

- Use TypeScript everywhere.
- Avoid any type unless strictly necessary.
- Keep pages thin.
- Put business logic inside hooks or feature services.
- Do not call fetch directly inside components.
- Use TanStack Query for API calls.
- Use React Hook Form + Zod for forms.
- Use TanStack Table for data grids.
- Use Recharts only for simple charts.
- Use Lucide React for icons.
- Do not use emojis in the UI.
- Do not hardcode mock data inside components.
- Create mock data in separate files under each feature.
- Every page must support loading, empty, error and success states.
- Components must be reusable and composable.
- Prefer composition over large components.
- Keep UI calm, clean and professional.

Styling rules:

- Use Tailwind utility classes.
- Use shadcn/ui components as base.
- Centralize colors as design tokens.
- Avoid custom CSS unless necessary.
- Avoid inline styles.
- Avoid excessive shadows, gradients and animations.
- Do not use glassmorphism or neon effects.

State management:

- Use local state for simple UI state.
- Use TanStack Query for server state.
- Avoid Redux for MVP.
- Use Zustand only if shared client state becomes necessary.

Data fetching:

- Create typed API clients.
- Define request/response types.
- Handle API errors consistently.
- Never assume backend fields that are not documented.

Accessibility:

- Use semantic HTML.
- Buttons must be buttons.
- Inputs must have labels.
- Dialogs and drawers must be keyboard accessible.
- Maintain visible focus states.

Performance:

- Lazy load large routes.
- Memoize expensive table/chart computations.
- Avoid unnecessary global state.
- Keep bundle size small. o 