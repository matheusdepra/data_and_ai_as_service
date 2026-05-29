# Manual API Tests (dev)

Data de referencia: 2026-05-27

## Base URL

```bash
export API_BASE_URL="https://dativerso-dev-gw-aoluhelr.uc.gateway.dev"
```

## Credenciais para testes

As rotas protegidas no gateway exigem:

```bash
export API_KEY="<api_gateway_key>"
export FIREBASE_ID_TOKEN="<firebase_id_token>"
```

Observacao:
- `FIREBASE_ID_TOKEN` e o token do usuario autenticado no Firebase Auth
- `API_KEY` e a chave do API Gateway

## 1. Health check

```bash
curl -i \
  -H "x-api-key: ${API_KEY}" \
  "${API_BASE_URL}/healthz"
```

Esperado:
- `200 OK`
- body:

```json
{"ok": true}
```

## 2. Contexto do usuario

```bash
curl -i \
  -H "x-api-key: ${API_KEY}" \
  -H "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  "${API_BASE_URL}/v1/me"
```

Esperado:
- `200 OK`
- body com:
  - `sub`
  - `email`
  - `tenant_id`
  - `role`

Se o usuario ainda nao tiver membership:
- `403`
- `detail: "no membership (invite required)"`

## 3. Criar invite (admin)

```bash
curl -i \
  -X POST \
  -H "x-api-key: ${API_KEY}" \
  -H "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"email":"novo.usuario@example.com","role":"viewer"}' \
  "${API_BASE_URL}/v1/invites"
```

Esperado:
- `200 OK`
- body com:
  - `invite_id`
  - `tenant_id`
  - `email`
  - `role`
  - `status`
  - `login_url`

## 4. Listar invites (admin)

```bash
curl -i \
  -H "x-api-key: ${API_KEY}" \
  -H "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  "${API_BASE_URL}/v1/invites?status=pending"
```

Esperado:
- `200 OK`
- lista JSON de invites

## 5. Revogar invite (admin)

```bash
export INVITE_ID="<invite_id>"

curl -i \
  -X POST \
  -H "x-api-key: ${API_KEY}" \
  -H "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  "${API_BASE_URL}/v1/invites/${INVITE_ID}/revoke"
```

Esperado:
- `200 OK`
- body do invite atualizado com `status: "revoked"`

## 6. Upload de arquivo

```bash
curl -i \
  -X POST \
  -H "x-api-key: ${API_KEY}" \
  -H "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  -F "file=@./sample.csv" \
  -F "source=upload" \
  -F "dataset=faturamento" \
  "${API_BASE_URL}/v1/files"
```

Esperado:
- `200 OK`
- body com:
  - `tenant_id`
  - `ingestion_id`
  - `status`
  - `gcs_uri_landing`

## 7. Consultar ingestao

```bash
export INGESTION_ID="<ingestion_id>"

curl -i \
  -H "x-api-key: ${API_KEY}" \
  -H "Authorization: Bearer ${FIREBASE_ID_TOKEN}" \
  "${API_BASE_URL}/v1/ingestions/${INGESTION_ID}"
```

Esperado:
- `200 OK`
- body com status e artefatos da ingestao

## Erros comuns

### 401 invalid token
- `FIREBASE_ID_TOKEN` expirado ou invalido
- renovar o token no frontend / Firebase SDK

### 403 no membership (invite required)
- usuario autenticou, mas ainda nao tem membership no Firestore
- criar invite para o email e fazer o primeiro login

### 403 admin role required
- usuario tem membership, mas nao tem `role=admin`

### 429 / problemas de gateway
- validar `x-api-key`
- conferir se a rota esta sendo chamada pelo hostname do gateway

### 403 `API ... is not enabled for the project`
- a `API key` foi aceita, mas o projeto consumidor dela ainda nao tinha o **managed service** do API Gateway habilitado
- neste repo, o Terraform agora tenta habilitar automaticamente o service `*.apigateway.<project>.cloud.goog`
- se acabou de aplicar, aguarde alguns minutos de propagacao
- para checagem manual:

```bash
gcloud services api-keys lookup "${API_KEY}"
gcloud services list --enabled --project daas-mvp-472103 | grep apigateway
```
