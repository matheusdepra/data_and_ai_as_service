# Dativerso Web (React)

Frontend inicial para:
- upload de arquivo
- acompanhar status de uma ingestao (`ingestion_id`)

## Config
Copie `web/.env.local.example` para `web/.env.local` e ajuste:
```bash
VITE_INGESTION_API_BASE_URL=https://SEU_INGESTION_API_URL
```

## Rodar
```bash
cd web
npm install
npm run dev
```

## Observacoes
- Em dev, o token JWT pode ser colado na UI e fica em `localStorage`.
- Se o `ingestion-api` nao tiver CORS liberado, o browser vai bloquear. Solucao MVP: permitir origem do frontend no Cloud Run ou colocar um reverse-proxy.
