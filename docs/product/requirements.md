# Requirements Document (Draft) - AI Data Platform

Status: **rascunho inicial** (versionado em 2026-05-25)

Este documento e a versao "completa" de requisitos. Para o recorte pratico do que entra na primeira entrega do Produto 1 (Datalake), veja:
- [mvp-scope.md](mvp-scope.md)

Se voce precisar do texto com mais fidelidade ao rascunho original (sem normalizacao), use:
- [requirements-full.md](requirements-full.md)

---

## Introduction

A **AI Data Platform** e uma plataforma SaaS composta por tres Modulos independentes que formam um ecossistema completo de dados e inteligencia artificial para empresas. Seu proposito central e **desmistificar o Machine Learning e torna-lo acessivel para resolver problemas de negocio**, conduzindo o usuario por cada decisao com linguagem clara, explicacoes contextuais e recomendacoes inteligentes, sem exigir conhecimento tecnico profundo de ML.

Os tres Modulos sao **contrataveis de forma independente**: um Tenant pode contratar apenas um, dois ou todos os tres Modulos. Quando dois ou mais Modulos sao contratados em conjunto, a plataforma habilita sincronismo automatico entre eles, eliminando a necessidade de duplicar configuracoes ou exportar e importar dados manualmente.

O Produto 1 (Datalake) e uma plataforma de Data Mesh e Data Catalog que centraliza dados de multiplas fontes em camadas Bronze, Silver e Gold, disponibilizando-os via APIs para consumo interno e externo. O Produto 2 (Agentes de IA) permite que usuarios criem agentes conversacionais e analiticos; quando o Datalake esta contratado, os Agentes consomem diretamente suas camadas, caso contrario o usuario cadastra suas proprias fontes de dados no Modulo. O Produto 3 (AutoML) oferece um fluxo guiado de ponta a ponta para criacao, treinamento, avaliacao e deploy de modelos de machine learning, com Guided UX que orienta o usuario em cada etapa; quando o Datalake esta contratado, o AutoML sincroniza diretamente com suas camadas, caso contrario o usuario cadastra suas proprias fontes de dados no Modulo.

---

## Glossary

- **Plataforma**: O sistema SaaS AI Data Platform como um todo.
- **Datalake**: O repositorio centralizado de dados da empresa, organizado em camadas Bronze, Silver e Gold.
- **Camada Bronze**: Camada de dados brutos, ingeridos diretamente das fontes sem transformacao.
- **Camada Silver**: Camada de dados limpos e padronizados, resultado do processamento da camada Bronze.
- **Camada Gold**: Camada de dados agregados e prontos para consumo analitico e por modelos de IA.
- **Conector**: Componente responsavel por estabelecer e manter a conexao entre uma fonte de dados externa e o Datalake.
- **Pipeline ETL**: Processo de Extracao, Transformacao e Carga que move dados entre as camadas do Datalake.
- **Agente**: Entidade de IA configurada pelo usuario para responder perguntas e gerar analises com base em dados do Datalake.
- **Skill**: Capacidade especifica atribuida a um Agente, como geracao de graficos, execucao de calculos ou consultas SQL.
- **View**: Visao consolidada de dados de multiplas tabelas ou fontes, criada pelo usuario para alimentar um Agente.
- **Experimento**: Sessao de treinamento de modelo de ML criada pelo usuario no modulo AutoML.
- **Dataset**: Conjunto de dados selecionado pelo usuario para treinar um Experimento.
- **Target**: Variavel dependente que o modelo de ML deve prever.
- **Pipeline de Preparacao**: Sequencia de transformacoes aplicadas ao Dataset antes do treinamento.
- **Estrategia de Validacao**: Metodo de divisao e validacao cruzada dos dados durante o treinamento (ex.: KFold, Stratified).
- **Modelo**: Algoritmo de ML treinado dentro de um Experimento.
- **Deploy**: Processo de publicacao de um Modelo treinado como servico acessivel via API.
- **Usuario**: Pessoa autenticada que utiliza a Plataforma.
- **Tenant**: Organizacao ou empresa que contrata e utiliza a Plataforma.
- **RFC**: Protocolo de integracao com sistemas SAP via Remote Function Call.
- **AutoML**: Modulo de criacao automatizada de modelos de machine learning (Produto 3).
- **PCA**: Principal Component Analysis, tecnica de reducao de dimensionalidade.
- **LDA**: Linear Discriminant Analysis, tecnica de reducao de dimensionalidade supervisionada.
- **Guided UX**: Experiencia de uso guiada, na qual a plataforma conduz o usuario passo a passo pelo fluxo, fornecendo contexto, recomendacoes e explicacoes em linguagem de negocio em cada etapa.
- **Tooltip Contextual**: Elemento de interface que exibe, ao passar o cursor ou tocar em um icone de ajuda, uma explicacao em linguagem simples sobre um termo tecnico ou acao disponivel.
- **Recomendacao Inteligente**: Sugestao proativa gerada pela plataforma com base na analise dos dados do usuario, indicando a acao ou configuracao mais adequada para o contexto atual e apresentando a justificativa da recomendacao.
- **Modulo**: Cada um dos tres produtos independentes da Plataforma (Datalake, Agentes de IA, AutoML), contratavel separadamente pelo Tenant.
- **Curador**: Usuario responsavel por uma fonte de dados no Datalake, com autoridade para aprovar ou rejeitar solicitacoes de acesso e revogar acessos concedidos.
- **Catalogo de Dados**: Repositorio centralizado de metadados das fontes de dados do Datalake, incluindo documentacao automatica de schemas, tipos de campos, exemplos de valores e estatisticas basicas.
- **Solicitacao de Acesso**: Pedido formal realizado por um Usuario ou sistema para consumir uma fonte de dados do Datalake via API, sujeito a aprovacao do Curador responsavel.
- **Pasta de Rede**: Diretorio compartilhado acessivel via caminho UNC em uma rede local ou corporativa, utilizado como fonte de dados monitorada pela Plataforma.
- **Contratacao de Dado**: Processo pelo qual um Usuario ou sistema solicita e obtem autorizacao para consumir uma fonte de dados especifica do Datalake via API.
- **Connector Agent**: Componente de software leve instalado na rede local do cliente que estabelece uma conexao de saida (outbound-only) segura e criptografada com a Plataforma SaaS, permitindo que fontes de dados em rede privada sejam acessadas sem expor a rede interna a internet.
- **Score de Qualidade**: Indicador calculado automaticamente pela Plataforma para cada fonte de dados, composto por metricas de completude (nulos), unicidade (duplicatas) e consistencia (anomalias).
- **Data Drift**: Mudanca na distribuicao estatistica dos dados de entrada de um Modelo em producao em relacao a distribuicao dos dados utilizados no treinamento.
- **Prompt Injection**: Tecnica de ataque em que um usuario mal-intencionado insere instrucoes disfarçadas para manipular o comportamento do modelo e acessar dados nao autorizados.
- **Rate Limiting**: Mecanismo de controle que limita o numero de requisicoes em um determinado periodo.
- **LGPD**: Lei Geral de Protecao de Dados Pessoais (Lei n 13.709/2018).

---

## Requirements

### Requirement 1: Autenticacao e Gestao de Tenants

**User Story:** Como administrador de uma empresa, quero criar e gerenciar minha conta na Plataforma, para que minha organizacao tenha acesso isolado e seguro aos seus dados e recursos.

#### Acceptance Criteria

1. THE Plataforma SHALL autenticar o Usuario por meio de credenciais de e-mail e senha ou por provedor de identidade OAuth 2.0.
2. WHEN um Usuario tenta acessar um recurso de outro Tenant, THE Plataforma SHALL negar o acesso e retornar uma mensagem de erro de autorizacao.
3. THE Plataforma SHALL associar todos os recursos criados (Datalake, Agentes, Experimentos) ao Tenant do Usuario autenticado.
4. WHEN um Usuario realiza tres tentativas consecutivas de autenticacao com credenciais invalidas, THE Plataforma SHALL bloquear temporariamente o acesso por 15 minutos e notificar o Usuario por e-mail.
5. THE Plataforma SHALL permitir que o administrador do Tenant convide novos Usuarios por e-mail, atribuindo papeis de acesso (administrador, analista, visualizador).
6. THE Plataforma SHALL permitir que o Tenant contrate cada Modulo (Datalake, Agentes de IA, AutoML) individualmente, habilitando apenas as funcionalidades do Modulo contratado.
7. THE Plataforma SHALL controlar o acesso as funcionalidades de cada Modulo com base no plano contratado pelo Tenant, impedindo o uso de funcionalidades de Modulos nao contratados.

---

### Requirement 2: Conexao de Fontes de Dados ao Datalake

**User Story:** Como analista de dados, quero conectar diferentes fontes de dados ao Datalake, para que todos os dados da empresa estejam centralizados em um unico repositorio.

> **Escopo:** Este requisito aplica-se ao Produto 1 (Datalake) quando contratado.

#### Acceptance Criteria

1. THE Datalake SHALL suportar conexao com as seguintes fontes: arquivos Excel (.xlsx, .xls, .csv), APIs REST via configuracao de endpoint e autenticacao, bancos de dados relacionais (PostgreSQL, MySQL, SQL Server, Oracle) via string de conexao, e sistemas SAP via RFC.
2. WHEN o Usuario configura um novo Conector, THE Datalake SHALL validar as credenciais e a conectividade com a fonte antes de salvar a configuracao.
3. IF a validacao de um Conector falhar, THEN THE Datalake SHALL exibir uma mensagem de erro descritiva indicando a causa da falha (credenciais invalidas, host inacessivel, permissao negada).
4. THE Datalake SHALL armazenar os dados ingeridos de cada Conector na Camada Bronze sem aplicar transformacoes.
5. WHEN um Conector e configurado com frequencia de sincronizacao, THE Datalake SHALL executar a ingestao automaticamente no intervalo definido pelo Usuario.
6. THE Datalake SHALL registrar o timestamp de cada execucao de ingestao, o volume de registros processados e o status (sucesso ou falha) em um log de auditoria acessivel ao Usuario.
7. WHERE o Conector suportar ingestao incremental, THE Datalake SHALL ingerir apenas os registros novos ou modificados desde a ultima execucao bem-sucedida.
8. WHEN uma sincronizacao de um Conector nao for concluida dentro do intervalo configurado mais uma tolerancia de 20%, THE Datalake SHALL emitir um alerta de "fonte desatualizada" exibindo o tempo de atraso, notificando o Curador responsavel por e-mail e registrando o evento no log de auditoria.
9. WHEN o schema de uma fonte de dados sofrer alteracao em relacao ao schema registrado na ultima ingestao bem-sucedida, THE Datalake SHALL detectar a mudanca, suspender automaticamente o Pipeline ETL daquela fonte, notificar o Curador com a descricao detalhada das mudancas detectadas e exigir confirmacao explicita do Curador antes de retomar o processamento.

---

### Requirement 3: Pipeline ETL e Camadas do Datalake

**User Story:** Como engenheiro de dados, quero que os dados sejam processados automaticamente nas camadas Bronze, Silver e Gold, para que os consumidores sempre acessem dados limpos e prontos para analise.

#### Acceptance Criteria

1. THE Datalake SHALL organizar os dados em tres camadas distintas: Bronze (dados brutos), Silver (dados limpos e padronizados) e Gold (dados agregados e prontos para consumo).
2. WHEN novos dados sao ingeridos na Camada Bronze, THE Pipeline ETL SHALL iniciar automaticamente o processamento para a Camada Silver aplicando as regras de limpeza e padronizacao configuradas pelo Usuario.
3. WHEN o processamento da Camada Silver e concluido, THE Pipeline ETL SHALL iniciar automaticamente o processamento para a Camada Gold aplicando as regras de agregacao configuradas pelo Usuario.
4. IF uma etapa do Pipeline ETL falhar, THEN THE Pipeline ETL SHALL registrar o erro com detalhes da etapa, o volume de registros afetados e o timestamp, e SHALL notificar o Usuario responsavel pelo Pipeline.
5. THE Datalake SHALL manter o historico de versoes dos dados na Camada Gold, permitindo que o Usuario consulte o estado dos dados em qualquer ponto no tempo dos ultimos 30 dias.
6. THE Pipeline ETL SHALL processar o volume de dados de cada execucao sem degradar a disponibilidade das camadas Silver e Gold para consultas simultaneas.
7. WHEN o Usuario solicita a reprocessamento de um Pipeline ETL, THE Datalake SHALL reprocessar os dados desde a Camada Bronze ate a Camada Gold aplicando as regras vigentes.
8. THE Datalake SHALL calcular e exibir no Catalogo de Dados um Score de Qualidade por fonte e exibir como indicador visual.

---

### Requirement 4: Criacao e Configuracao de Views

**User Story:** Como analista de dados, quero criar Views consolidando dados de multiplas tabelas do Datalake, para que os Agentes de IA tenham acesso a informacoes organizadas e contextualizadas.

#### Acceptance Criteria

1. THE Plataforma SHALL permitir que o Usuario crie uma View selecionando tabelas das camadas Silver ou Gold do Datalake e definindo joins, filtros e colunas a serem incluidas.
2. WHEN o Usuario salva uma View, THE Plataforma SHALL validar a consulta subjacente e exibir uma previa com ate 100 registros antes de confirmar o salvamento.
3. IF a consulta de uma View contiver erros, THEN THE Plataforma SHALL exibir uma mensagem descritiva indicando a linha e o tipo do erro.
4. THE Plataforma SHALL atualizar automaticamente os dados de uma View sempre que os dados das tabelas de origem na Camada Gold forem atualizados.
5. THE Plataforma SHALL permitir que o Usuario associe uma View a um ou mais Agentes como fonte de dados primaria.
6. THE Plataforma SHALL permitir que o Usuario edite ou exclua uma View existente, e WHEN uma View associada a um Agente ativo for excluida, THE Plataforma SHALL notificar o Usuario e desassociar a View do Agente antes de concluir a exclusao.

---

### Requirement 5: Criacao e Configuracao de Agentes de IA

**User Story:** Como analista de negocios, quero criar Agentes de IA configurados com os dados da minha empresa, para que eu possa obter respostas e analises sem precisar escrever codigo.

#### Acceptance Criteria

1. THE Plataforma SHALL permitir que o Usuario crie um Agente definindo nome, descricao, fontes de dados e Skills habilitadas.
2. THE Plataforma SHALL disponibilizar Skills para graficos, SQL em linguagem natural, calculos/agregacoes e resumos textuais.
3. WHEN o Usuario envia uma mensagem ao Agente, THE Agente SHALL responder em ate 30 segundos ou indicar que nao pode atender.
4. WHEN o Agente gera um grafico, THE Agente SHALL exibir inline e permitir exportacao em PNG e CSV.
5. THE Agente SHALL manter o contexto das ultimas 20 mensagens.
6. IF o Agente nao encontrar dados suficientes, THEN THE Agente SHALL informar dados faltantes e sugerir fontes alternativas.
7. THE Plataforma SHALL registrar todas as interacoes com cada Agente em um historico por ate 90 dias.
8. THE Plataforma SHALL permitir publicar um Agente como widget incorporavel (iframe/SDK JS).
9. WHERE o Modulo Datalake estiver contratado, THE Plataforma SHALL permitir selecionar Views ou tabelas das camadas Bronze/Silver/Gold como fontes do Agente.
10. WHERE o Modulo Datalake nao estiver contratado, THE Plataforma SHALL permitir cadastrar fontes diretamente no Modulo de Agentes (uploads, APIs, DBs, pasta de rede, SAP).
11. WHEN uma Pasta de Rede monitorada sofrer alteracao, THE Plataforma SHALL detectar e atualizar automaticamente.
12. THE Plataforma SHALL permitir combinar multiplas fontes em um unico Agente.
13. WHEN publicar widget, THE Plataforma SHALL exigir restricao de acesso (dominios, JWT, ou ambos).
14. THE Plataforma SHALL disponibilizar feedback por resposta (positivo/negativo + comentario).
15. WHEN o contexto atingir 80% do limite de tokens, THE Agente SHALL notificar e oferecer iniciar nova conversa preservando contexto essencial.

---

### Requirement 6: Selecao de Dados para Experimentos AutoML

**User Story:** Como cientista de dados, quero selecionar dados para iniciar um Experimento de ML, para que eu nao precise exportar e reimportar dados manualmente.

#### Acceptance Criteria

1. WHERE o Modulo Datalake estiver contratado, THE AutoML SHALL permitir selecionar dataset de tabelas ou Views em Bronze/Silver/Gold.
2. WHERE o Modulo Datalake nao estiver contratado, THE AutoML SHALL permitir cadastrar fontes diretamente (uploads, APIs, DBs, pasta de rede, SAP).
3. WHEN o Usuario seleciona um Dataset, THE AutoML SHALL exibir previa com primeiras 50 linhas e total de registros.
4. WHERE Datalake estiver contratado, THE AutoML SHALL sincronizar o Dataset com o estado atual da camada no inicio do Experimento.
5. THE AutoML SHALL permitir filtros de linha antes de iniciar o Experimento.
6. WHEN o Dataset tiver mais de 10.000.000 de registros, THE AutoML SHALL exibir aviso de volume e tempo estimado.

---

### Requirement 7: Configuracao do Objetivo e Tipo de Predicao

**User Story:** Como cientista de dados, quero descrever o objetivo do meu modelo e selecionar o tipo de predicao.

#### Acceptance Criteria

1. THE AutoML SHALL permitir descricao textual do objetivo com ate 500 caracteres.
2. THE AutoML SHALL permitir selecionar tipo de predicao: Regressao, Classificacao ou Clusterizacao.
3. WHEN Regressao ou Classificacao, THE AutoML SHALL exibir selecao de Target.
4. WHEN Clusterizacao, THE AutoML SHALL ocultar Target e configurar metricas compativeis.
5. THE AutoML SHALL listar Targets compativeis com o tipo de predicao.
6. IF Target tiver mais de 50% nulos, THEN THE AutoML SHALL exibir aviso e pedir confirmacao.
7. THE AutoML SHALL exibir descricoes em linguagem de negocio para cada tipo de predicao.

---

### Requirement 8: Analise Estatistica Automatica do Dataset

**User Story:** Como cientista de dados, quero visualizar automaticamente as estatisticas descritivas do Dataset.

#### Acceptance Criteria

1. WHEN o Usuario avanca para analise estatistica, THE AutoML SHALL calcular e exibir estatisticas por coluna.
2. THE AutoML SHALL exibir histogramas para colunas numericas.
3. THE AutoML SHALL concluir calculos para ate 1.000.000 de registros em no maximo 60 segundos.
4. THE AutoML SHALL destacar colunas com mais de 20% nulos como candidatas para tratamento.
5. THE AutoML SHALL exibir resumo geral do Dataset.
6. THE AutoML SHALL exibir Tooltip Contextual para cada estatistica.

---

### Requirement 9: Data Preparation - Transformacoes de Colunas

**User Story:** Como cientista de dados, quero aplicar transformacoes interativas nas colunas do Dataset.

#### Acceptance Criteria

1. THE AutoML SHALL exibir tabela interativa com uma linha por coluna e estatisticas/resumos.
2. THE AutoML SHALL disponibilizar acoes de transformacao por coluna (tipo, nulos, remover coluna, outliers, renomear, replace, z-score, dummies).
3. WHEN aplicar transformacao, THE AutoML SHALL atualizar imediatamente a previa sem reprocessar o Dataset completo.
4. THE AutoML SHALL manter historico ordenado de transformacoes e permitir desfazer a ultima.
5. THE AutoML SHALL disponibilizar analises (correlacao, countplot, barchart).
6. THE AutoML SHALL disponibilizar tecnicas de reducao de dimensionalidade (PCA, Kernel PCA, LDA, selecao por importancia).
7. WHEN aplicar reducao, THE AutoML SHALL exibir variancia explicada/importancia para auxiliar escolha.
8. THE AutoML SHALL serializar o Pipeline de Preparacao como etapas reproduziveis para inferencia.
9. THE AutoML SHALL garantir round-trip de serializacao do pipeline.
10. WHEN acionar Toolbox, THE AutoML SHALL explicar impacto em linguagem de negocio antes de aplicar.
11. WHEN detectar problemas, THE AutoML SHALL exibir Recomendacao Inteligente com justificativa.

---

### Requirement 10: Estrategia de Treinamento e Validacao

**User Story:** Como cientista de dados, quero configurar estrategia de validacao cruzada e divisao de dados.

#### Acceptance Criteria

1. THE AutoML SHALL disponibilizar estrategias: KFold, Stratified KFold, Group KFold e Hold-Out.
2. WHEN Classificacao desbalanceada, THE AutoML SHALL recomendar Stratified KFold com justificativa.
3. THE AutoML SHALL permitir proporcao treino/teste 60/40 a 90/10 (padrao 70/30).
4. THE AutoML SHALL permitir habilitar/desabilitar shuffle (padrao habilitado).
5. THE AutoML SHALL permitir numero de folds 3 a 20 (padrao 5).
6. WHEN aceitar recomendacao, THE AutoML SHALL pre-preencher parametros recomendados.
7. THE AutoML SHALL exibir descricoes em linguagem de negocio de cada estrategia.

---

### Requirement 11: Selecao de Modelos e Tipo de Execucao

**User Story:** Como cientista de dados, quero selecionar algoritmos e nivel de otimizacao.

#### Acceptance Criteria

1. THE AutoML SHALL disponibilizar catalogo de algoritmos por tipo de predicao.
2. THE AutoML SHALL permitir "executar todos" ou selecionar subconjunto.
3. THE AutoML SHALL disponibilizar execucoes: Rapida, Otimizada e Customizada.
4. WHEN Rapida, THE AutoML SHALL exibir tempo estimado.
5. WHEN Otimizada, THE AutoML SHALL exibir tempo estimado e iteracoes maximas.
6. THE AutoML SHALL permitir cancelar experimento preservando resultados concluidos.
7. THE AutoML SHALL exibir descricoes simplificadas e indicador de complexidade por algoritmo.
8. THE AutoML SHALL aplicar timeout maximo configuravel (30 min a 24h; padrao 4h) e preservar parcial.

---

### Requirement 12: Configuracao de Metricas de Avaliacao

**User Story:** Como cientista de dados, quero definir metricas principal e secundaria.

#### Acceptance Criteria

1. THE AutoML SHALL disponibilizar metricas para Regressao (R2, RMSE, MAE, MAPE).
2. THE AutoML SHALL disponibilizar metricas para Classificacao (Acuracia, F1, AUC-ROC, Precisao, Recall).
3. THE AutoML SHALL disponibilizar metricas para Clusterizacao (Silhouette, Davies-Bouldin, Calinski-Harabasz).
4. THE AutoML SHALL permitir selecionar metrica principal e opcional secundaria.
5. THE AutoML SHALL usar metrica principal para ranking.
6. WHEN Classificacao desbalanceada, THE AutoML SHALL recomendar F1 weighted com justificativa.
7. THE AutoML SHALL exibir explicacoes em linguagem de negocio para cada metrica.
8. WHEN avancar, THE AutoML SHALL exibir Recomendacao Inteligente da metrica mais adequada.

---

### Requirement 13: Tela de Resultados do Experimento

**User Story:** Como cientista de dados, quero visualizar resultados comparativos.

#### Acceptance Criteria

1. WHEN concluir, THE AutoML SHALL exibir lista ranqueada por metrica principal.
2. THE AutoML SHALL exibir por modelo: algoritmo, scores, indicador visual, tempo.
3. WHEN selecionar modelo, THE AutoML SHALL exibir resumo (pipeline, hiperparametros, matriz de confusao/ROC/residuos/importancia).
4. THE AutoML SHALL exibir matriz de correlacao entre metricas.
5. THE AutoML SHALL permitir exportar resultados em CSV.
6. THE AutoML SHALL garantir invariancia de ranking.
7. THE AutoML SHALL exibir recomendacao textual do modelo vencedor com justificativa.

---

### Requirement 14: Deploy de Modelos Treinados

**User Story:** Como cientista de dados, quero fazer deploy com um clique.

#### Acceptance Criteria

1. WHEN acionar deploy, THE AutoML SHALL provisionar endpoint REST em ate 5 minutos.
2. THE AutoML SHALL gerar interface web de simulacao.
3. THE AutoML SHALL disponibilizar documentacao OpenAPI 3.0.
4. THE AutoML SHALL aplicar Pipeline de Preparacao em inferencia.
5. WHEN requisicao invalida, THE AutoML SHALL retornar HTTP 422 com mensagem descritiva.
6. THE AutoML SHALL registrar requisicoes (timestamp, payload, predicao, latencia).
7. THE AutoML SHALL permitir apenas um deploy ativo por experimento e substituir ao novo deploy.
8. THE AutoML SHALL disponibilizar API Key para consumo e permitir regeneracao.
9. THE AutoML SHALL permitir exportar modelo (ONNX, pickle/joblib) + pipeline.
10. THE AutoML SHALL monitorar data drift e alertar quando ultrapassar threshold.

---

### Requirement 15: Historico e Rastreabilidade de Experimentos

**User Story:** Como cientista de dados, quero acessar historico e reproduzir.

#### Acceptance Criteria

1. THE AutoML SHALL manter historico (nome, datas, tipo, dataset, configs, modelos, status deploy).
2. THE AutoML SHALL permitir clonar experimento com configuracoes editaveis.
3. THE AutoML SHALL permitir comparar dois experimentos lado a lado.
4. THE AutoML SHALL reter dados de experimentos por no minimo 12 meses.
5. WHEN excluir experimento com deploy ativo, THE AutoML SHALL avisar e pedir confirmacao.
6. THE AutoML SHALL permitir agendamento de retreinamento e comparar antes de substituir.

---

### Requirement 16: Integracao entre os Tres Produtos

**User Story:** Como usuario com multiplos Modulos, quero compartilhamento transparente.

#### Acceptance Criteria

1. WHERE Datalake+Agentes, THE Plataforma SHALL disponibilizar camadas como fontes para Agentes.
2. WHERE Datalake+AutoML, THE Plataforma SHALL disponibilizar camadas como fontes para AutoML.
3. WHERE Datalake+Agentes, WHEN camadas atualizam, THE Plataforma SHALL refletir nas Views associadas a Agentes.
4. WHERE Datalake+AutoML, WHEN camadas atualizam, THE Plataforma SHALL refletir nos Datasets de Experimentos em tempo real.
5. WHERE AutoML+Agentes, THE Plataforma SHALL permitir usar Modelo do AutoML como Skill do Agente.
6. THE Plataforma SHALL exibir painel unificado por Tenant com status de Conectores/Pipelines/Agentes/Deploys.
7. IF qualquer componente falhar, THEN THE Plataforma SHALL exibir alerta com descricao e timestamp.
8. THE Plataforma SHALL disponibilizar Central de Notificacoes in-app com filtros e configuracao de email.

---

### Requirement 17: Experiencia Guiada e Onboarding

**User Story:** Como usuario, quero ser conduzido com contexto e linguagem acessivel.

#### Acceptance Criteria

1. THE AutoML SHALL exibir barra de progresso persistente por etapas.
2. WHEN avancar, THE AutoML SHALL exibir resumo da etapa anterior e o que vem a seguir.
3. THE AutoML SHALL exibir Tooltip Contextual para termos tecnicos.
4. WHEN tentar avancar com pendencias, THE AutoML SHALL exibir checklist em linguagem de negocio.
5. WHERE habilitar modo assistido, THE AutoML SHALL aplicar recomendacoes e pedir confirmacao.
6. THE AutoML SHALL disponibilizar Glossario Interativo pesquisavel.

---

### Requirement 18: Catalogo de Fontes e Documentacao Automatica

**User Story:** Como analista, quero cadastrar fontes e gerar documentacao automaticamente.

> **Escopo:** Aplica-se ao Produto 1 (Datalake).

#### Acceptance Criteria

1. THE Datalake SHALL permitir cadastrar metadados (nome, descricao, curador, data, camada, tags, dominio).
2. WHEN cadastrar/atualizar fonte, THE Datalake SHALL gerar documentacao (schema, tipos, exemplos, estatisticas basicas).
3. THE Datalake SHALL disponibilizar documentacao via interface web do Catalogo.
4. THE Datalake SHALL disponibilizar documentacao via endpoint autenticado (JSON).
5. IF falhar, THEN THE Datalake SHALL registrar erro e notificar curador.

---

### Requirement 19: Workflow de Autorizacao e Curadoria

**User Story:** Como Curador, quero controlar quem consome minha fonte via API.

> **Escopo:** Aplica-se ao Produto 1 (Datalake).

#### Acceptance Criteria

1. THE Datalake SHALL permitir criar Solicitacao de Acesso com justificativa.
2. WHEN criada, THE Datalake SHALL notificar Curador por email e alerta in-app.
3. THE Datalake SHALL permitir Curador aprovar/rejeitar com justificativa em rejeicao.
4. WHEN aprovar, THE Datalake SHALL provisionar acesso a API com nivel definido.
5. WHEN rejeitar, THE Datalake SHALL notificar solicitante por email com justificativa.
6. THE Datalake SHALL permitir revogar acesso com efeito imediato.
7. THE Datalake SHALL disponibilizar painel por fonte com acessos ativos e niveis.
8. IF tentar consumir sem autorizacao, THEN THE Datalake SHALL retornar HTTP 403 e registrar auditoria.

---

### Requirement 20: Disponibilizacao via API com Controle de Acesso

**User Story:** Como consumidor, quero acessar fontes Gold via API REST autenticada.

> **Escopo:** Aplica-se ao Produto 1 (Datalake).

#### Acceptance Criteria

1. WHEN promover para Gold, THE Datalake SHALL disponibilizar endpoint REST autenticado.
2. THE Datalake SHALL autenticar por API Key vinculada ao consumidor autorizado.
3. THE Datalake SHALL suportar filtros, paginacao e selecao de campos via query params.
4. THE Datalake SHALL gerar documentacao OpenAPI 3.0 com exemplos.
5. IF parametros invalidos, THEN THE Datalake SHALL retornar HTTP 422 com mensagem descritiva.
6. THE Datalake SHALL registrar requisicoes em log de auditoria.
7. THE Datalake SHALL aplicar rate limiting por API Key (padrao 1000 req/min) e retornar HTTP 429 + Retry-After.

---

### Requirement 21: Gestao de Modulos Contratados

**User Story:** Como admin, quero visualizar e gerenciar Modulos ativos.

#### Acceptance Criteria

1. THE Plataforma SHALL disponibilizar painel com status de cada Modulo (ativo / nao contratado).
2. THE Plataforma SHALL permitir ativar/desativar Modulos pelo painel.
3. WHEN navegar para Modulo nao contratado, THE Plataforma SHALL exibir tela descritiva + CTA.
4. IF acessar Modulo nao contratado, THEN THE Plataforma SHALL exibir tela descritiva sem bloquear outras areas.
5. WHEN desativar Modulo, THE Plataforma SHALL preservar dados/configs por 30 dias e notificar.

---

### Requirement 22: Connector Agent On-Premise

**User Story:** Como admin de TI, quero instalar um agente leve na rede local para conectar fontes internas.

> **Escopo:** Obrigatorio quando usar Pasta de Rede como fonte.

#### Acceptance Criteria

1. THE Plataforma SHALL disponibilizar instalador para Windows (64-bit) e Linux (Debian/Red Hat).
2. WHEN instalar, THE Plataforma SHALL gerar token unico por Tenant para vincular o agente.
3. THE Connector Agent SHALL estabelecer apenas conexoes de saida na porta 443.
4. THE Connector Agent SHALL criptografar trafego com TLS 1.3.
5. WHEN conexao cair, THE Connector Agent SHALL reconectar com backoff exponencial sem perder dados pendentes.
6. THE Plataforma SHALL exibir status do agente (conectado/desconectado/erro) + ultimo timestamp.
7. WHEN configurar Pasta de Rede, THE Plataforma SHALL exigir agente conectado antes de permitir salvamento.
8. THE Connector Agent SHALL monitorar arquivo e detectar alteracoes por hash.
9. THE Connector Agent SHALL armazenar localmente dados coletados de forma temporaria e criptografada ate confirmacao.
10. THE Plataforma SHALL permitir revogar token do agente com efeito imediato.
11. FOR ALL dados transmitidos, THE Plataforma SHALL garantir confidencialidade de transito.
12. THE Plataforma SHALL suportar multiplos agentes por Tenant e associacao por fonte.

---

### Requirement 23: Log de Auditoria Centralizado

**User Story:** Como admin, quero um log de auditoria unificado.

#### Acceptance Criteria

1. THE Plataforma SHALL manter log por Tenant cobrindo autenticacao, gestao de acessos, operacoes de dados, gestao de Agentes, gestao de Experimentos e operacoes administrativas.
2. THE Plataforma SHALL registrar: timestamp UTC, ator, tipo de evento, Modulo, recurso, IP de origem e resultado.
3. THE Plataforma SHALL disponibilizar UI com filtros por periodo/Modulo/tipo/Usuario/resultado.
4. THE Plataforma SHALL reter log por no minimo 12 meses.
5. THE Plataforma SHALL permitir exportar log filtrado em CSV e JSON.
6. IF tentar acessar sem papel admin, THEN THE Plataforma SHALL negar e registrar a tentativa.

---

### Requirement 24: Conformidade com LGPD e Direitos do Titular

**User Story:** Como admin, quero suportar direitos do titular conforme LGPD.

#### Acceptance Criteria

1. THE Plataforma SHALL permitir registrar/gerenciar solicitacoes (exclusao, portabilidade, correcao, acesso) com status e prazo.
2. WHEN exclusao, THE Plataforma SHALL identificar registros do titular em todas as camadas/datasets e pedir confirmacao antes de excluir.
3. THE Plataforma SHALL permitir exportar dados do titular em JSON estruturado.
4. THE Plataforma SHALL registrar em auditoria operacoes relacionadas a direitos do titular.
5. THE Plataforma SHALL disponibilizar ROPA simplificado com fontes, finalidades e Usuarios com acesso.

---

### Requirement 25: Seguranca contra Prompt Injection e Ataques ao Modelo de Linguagem

**User Story:** Como admin, quero proteger Agentes de IA contra prompt injection e abusos.

#### Acceptance Criteria

1. THE Plataforma SHALL sanitizar mensagens e neutralizar padroes conhecidos de prompt injection.
2. THE Agente SHALL operar com system prompt imutavel restringindo escopo a fontes/skills autorizadas.
3. WHEN detectar tentativa, THE Plataforma SHALL bloquear, responder genericamente e registrar auditoria.
4. THE Plataforma SHALL aplicar limite maximo de caracteres por mensagem (padrao 2000; configuravel 500 a 5000).
5. THE Agente SHALL recusar solicitacoes fora do escopo e nao revelar existencia de outras fontes.
6. THE Plataforma SHALL aplicar rate limiting por usuario final (padrao 60 msgs/h) e informar tempo de espera.
7. THE Plataforma SHALL monitorar uso anomalo e alertar admin do Tenant.
8. THE Plataforma SHALL garantir que historico de conversas nao vaze entre usuarios sem autorizacao.
9. FOR ALL interacoes, THE Plataforma SHALL garantir que o modelo nao tenha acesso direto a credenciais, apenas a dados autorizados.
