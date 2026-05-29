# Dativerso Web (React + Vite)

Frontend inicial para:
- login por magic link com Firebase Auth
- validacao de sessao e membership (`/v1/me`)
- upload de arquivo
- acompanhar status de uma ingestao (`ingestion_id`)

## Config
Copie `web/.env.local.example` para `web/.env.local` e ajuste:
```bash
VITE_API_BASE_URL=https://SEU_API_GATEWAY_URL
VITE_API_KEY=...
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=daas-mvp-472103
VITE_FIREBASE_APP_ID=...
```

## Rodar
```bash
cd web
npm install
npm run dev
```

## Observacoes
- O login usa email link do Firebase Auth.
- Depois da autenticacao, o frontend guarda o ID token em `localStorage` para o fluxo MVP.
- O gateway atual exige `Authorization: Bearer <id_token>` e `x-api-key`.
- Se o backend nao estiver com CORS preparado para o frontend, o browser vai bloquear as chamadas.
