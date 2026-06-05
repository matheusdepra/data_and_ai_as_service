# AI Assistant API

Backend-only FastAPI service for future React clients that need chat interactions with an LLM, reusable prompt templates, explicit context injection, BigQuery-ready data access, and future tool/agent expansion.

## Architecture

The service follows clean architecture boundaries:

- `app/api/`: FastAPI routers and dependency wiring only. Routes call application use cases and do not talk directly to BigQuery, LLM providers, or persistence.
- `app/application/`: orchestration services and use cases. `SendChatMessageUseCase` resolves authenticated user context and delegates to `ChatService`.
- `app/domain/`: provider-agnostic models and ports for LLMs, prompts, chat history, BigQuery execution, context retrieval, and auth context resolution.
- `app/infrastructure/`: replaceable adapters, including mock providers for local development plus skeleton adapters for Google BigQuery and Vertex AI/Gemini.
- `app/core/`: environment configuration, structured JSON logging, and error handling.

Request flow for `POST /api/v1/chat/messages`:

1. API route validates the request and calls `SendChatMessageUseCase`.
2. The use case resolves `UserContext` through the auth port. `tenant_id` is not accepted from the request body.
3. `ChatService` retrieves explicit context, renders the selected prompt template, loads recent memory, calls the LLM provider with final assembled messages, and persists the user/assistant exchange.
4. The response returns the answer, prompt key, context sources, model metadata, and latency.

## Endpoints

- `GET /health`
- `POST /api/v1/chat/messages`

Example request:

```json
{
  "session_id": "abc123",
  "user_id": "user-001",
  "message": "What were the sales by month?",
  "prompt_key": "data_analyst",
  "context": {
    "dataset": "sales",
    "tables": ["orders", "customers"],
    "filters": {
      "year": 2025
    }
  }
}
```

Example response with the default mock LLM:

```json
{
  "session_id": "abc123",
  "answer": "Mock answer: ...",
  "used_prompt_key": "data_analyst",
  "used_context_sources": ["bigquery:sales.orders", "bigquery:sales.customers"],
  "metadata": {
    "model": "mock-llm",
    "latency_ms": 12,
    "provider": "mock"
  }
}
```

## Configuration

Configuration uses Pydantic Settings with the `CHAT_` environment prefix.

| Variable | Default | Description |
| --- | --- | --- |
| `CHAT_ENVIRONMENT` | `local` | Environment name for logs/config. |
| `CHAT_LOG_LEVEL` | `INFO` | Python logging level. |
| `CHAT_LLM_PROVIDER` | `mock` | `mock` or `vertex_ai`. |
| `CHAT_GCP_PROJECT_ID` | unset | Required for BigQuery and Vertex AI adapters. |
| `CHAT_GCP_LOCATION` | `us-central1` | Vertex AI location. |
| `CHAT_VERTEX_MODEL_NAME` | `gemini-1.5-flash` | Gemini model name. |
| `CHAT_BIGQUERY_MAX_BYTES_BILLED` | unset | Optional BigQuery cost guardrail. |
| `CHAT_MOCK_TENANT_ID` | `dev-tenant` | Local mock tenant. Replace auth before prod. |
| `CHAT_INGESTION_API_BASE_URL` | unset | Base URL used to fetch trusted dataset overview context from `ingestion_api`. |
| `CHAT_INGESTION_API_TIMEOUT_SECONDS` | `15` | Timeout for context requests to `ingestion_api`. |

TODO before production deployment:

- Replace `MockAuthUserContextProvider` with Firebase/JWKS validation plus Firestore membership lookup.
- Configure least-privilege Cloud Run service account IAM for BigQuery and Vertex AI.
- Add production timeouts, retries/backoff, tracing, rate limits, and query governance.
- Persist chat memory in a tenant-scoped durable store rather than in-memory storage.

## Local development

Requisitos:
- Python `3.11+`
- para `Dataset Copilot`, o `ingestion_api` precisa estar rodando e acessivel por `CHAT_INGESTION_API_BASE_URL`
- para usar LLM real, configure credenciais GCP locais e use `CHAT_LLM_PROVIDER=vertex_ai`

```bash
cd services/ai_assistant_api
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -e '.[dev]'
export CHAT_INGESTION_API_BASE_URL=http://localhost:8080
export CHAT_LLM_PROVIDER=mock
uvicorn app.main:app --reload --port 8081
```

Para testar com Vertex AI/Gemini em vez do mock:

```bash
export CHAT_LLM_PROVIDER=vertex_ai
export CHAT_GCP_PROJECT_ID=your-gcp-project
export CHAT_GCP_LOCATION=us-central1
export CHAT_VERTEX_MODEL_NAME=gemini-1.5-flash
```

Ordem recomendada para testar o Dataset Copilot localmente:
1. Subir `services/ingestion_api` na porta `8080`
2. Subir `services/ai_assistant_api` na porta `8081`
3. Apontar o frontend para `VITE_API_BASE_URL=http://localhost:8080` e `VITE_AI_ASSISTANT_API_BASE_URL=http://localhost:8081`

Health check:

```bash
curl http://localhost:8081/health
```

Call the API:

```bash
curl -s http://localhost:8081/health
curl -s -X POST http://localhost:8081/api/v1/chat/messages \
  -H 'content-type: application/json' \
  -H 'x-dev-tenant-id: dev-tenant' \
  -d '{"session_id":"abc123","user_id":"user-001","message":"What were the sales by month?","prompt_key":"data_analyst","context":{"dataset":"sales","tables":["orders"],"filters":{"year":2025}}}'
```

## Tests

```bash
cd services/ai_assistant_api
pytest
```

## Cloud Run container

```bash
cd services/ai_assistant_api
docker build -t ai-assistant-api .
docker run --rm -p 8080:8080 -e PORT=8080 ai-assistant-api
```

The Dockerfile uses `python:3.12-slim`, installs the Python package from `pyproject.toml`, and starts Uvicorn on the Cloud Run `PORT`.
