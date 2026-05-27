# Env files

Use um arquivo local (nao-versionado) para guardar URLs e IDs do ambiente, ex.: `env/.env.dev`.

Workflow sugerido:
1. Gere/atualize com Terraform: `./scripts/print_endpoints.sh`
2. Carregue no shell: `source scripts/load_env.sh env/.env.dev`

O template versionado fica em `env/.env.example`.

