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

## Convenções (preencher)
- Estilo/formatter:
- Nomes (arquivos, funções, variáveis):
- Imports (ordem, aliases):

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
