# AI Assistant API Bootstrap

## Objetivo
Criar somente o backend de chat Data & AI, em Python/FastAPI, com arquitetura limpa, desacoplamento entre API/aplicação/domínio/infra, integrações preparadas para BigQuery e Vertex AI/Gemini e providers mock para desenvolvimento local. O serviço hoje vive em `services/ai_assistant_api/`.

## Checklist
- [x] Revisar AGENTS.md e referências obrigatórias em `docs/`.
- [x] Criar estrutura modular do backend sem frontend.
- [x] Implementar portas de domínio, serviços/use case e providers mock/GCP skeleton.
- [x] Adicionar schemas, logging estruturado, configuração por ambiente e tratamento de erros.
- [x] Adicionar Dockerfile, README e testes básicos.
- [x] Executar validações locais e atualizar este checklist com os resultados reais.

## Validação registrada
- `python -m pip install -e 'backend[dev]'`: passou.
- `python -m pytest services/ai_assistant_api/tests`: passou (5 testes).
- `python -m py_compile $(find services/ai_assistant_api/app services/ai_assistant_api/tests -name '*.py' | sort)`: passou.
- `git diff --check`: passou.
