# Build/Push versioning per service

## Objetivo
Fazer o `scripts/build_push.sh` calcular a próxima versão semântica por serviço quando rodar sem tag manual, ignorando tags não semânticas como `dev`.

## Checklist
- [x] Registrar a tarefa.
- [x] Ajustar `build_push_cloudbuild.sh` para resolver tag por serviço.
- [x] Ajustar `build_push_docker.sh` para resolver tag por serviço.
- [x] Atualizar wrapper/docs para refletir o novo comportamento.
- [x] Validar sintaxe dos scripts atualizados.
- [ ] Adicionar `--update-tfvars` aos scripts de build/push.
- [x] Adicionar `--update-tfvars` aos scripts de build/push.
- [x] Atualizar docs para o novo fluxo de escrita automática no `terraform.tfvars`.
- [x] Validar sintaxe após a nova alteração.
