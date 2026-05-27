# Requirements Document (Full / Verbatim Draft)

Origem: colado pelo time em 2026-05-25. Este arquivo busca preservar o texto completo para referencia.

> Nota: pode conter repeticoes/trechos redundantes do rascunho original. Preferir este arquivo quando precisarmos de fidelidade de wording; preferir [requirements.md](requirements.md) para leitura rapida.

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
- **PCA**: Principal Component Analysis — tecnica de reducao de dimensionalidade.
- **LDA**: Linear Discriminant Analysis — tecnica de reducao de dimensionalidade supervisionada.
- **Guided UX**: Experiencia de uso guiada, na qual a plataforma conduz o usuario passo a passo pelo fluxo, fornecendo contexto, recomendacoes e explicacoes em linguagem de negocio em cada etapa.
- **Tooltip Contextual**: Elemento de interface que exibe, ao passar o cursor ou tocar em um icone de ajuda, uma explicacao em linguagem simples sobre um termo tecnico ou acao disponivel.
- **Recomendacao Inteligente**: Sugestao proativa gerada pela plataforma com base na analise dos dados do usuario, indicando a acao ou configuracao mais adequada para o contexto atual e apresentando a justificativa da recomendacao.
- **Modulo**: Cada um dos tres produtos independentes da Plataforma (Datalake, Agentes de IA, AutoML), contratavel separadamente pelo Tenant.
- **Curador**: Usuario responsavel por uma fonte de dados no Datalake, com autoridade para aprovar ou rejeitar solicitacoes de acesso e revogar acessos concedidos.
- **Catalogo de Dados**: Repositorio centralizado de metadados das fontes de dados do Datalake, incluindo documentacao automatica de schemas, tipos de campos, exemplos de valores e estatisticas basicas.
- **Solicitacao de Acesso**: Pedido formal realizado por um Usuario ou sistema para consumir uma fonte de dados do Datalake via API, sujeito a aprovacao do Curador responsavel.
- **Pasta de Rede**: Diretorio compartilhado acessivel via caminho UNC (Universal Naming Convention) em uma rede local ou corporativa, utilizado como fonte de dados monitorada pela Plataforma.
- **Contratacao de Dado**: Processo pelo qual um Usuario ou sistema solicita e obtem autorizacao para consumir uma fonte de dados especifica do Datalake via API.
- **Connector Agent**: Componente de software leve instalado na rede local do cliente que estabelece uma conexao de saida (outbound-only) segura e criptografada com a Plataforma SaaS, permitindo que fontes de dados em rede privada — como Pastas de Rede, bancos de dados locais e sistemas SAP — sejam acessadas sem expor a rede interna a internet.
- **Score de Qualidade**: Indicador calculado automaticamente pela Plataforma para cada fonte de dados, composto por metricas de completude (nulos), unicidade (duplicatas) e consistencia (anomalias), exibido como classificacao visual para auxiliar consumidores na avaliacao da confiabilidade dos dados.
- **Data Drift**: Mudanca na distribuicao estatistica dos dados de entrada de um Modelo em producao em relacao a distribuicao dos dados utilizados no treinamento, podendo indicar degradacao da qualidade das predicoes.
- **Prompt Injection**: Tecnica de ataque em que um usuario mal-intencionado insere instrucoes disfarçadas em mensagens para um Agente de IA com o objetivo de manipular o comportamento do modelo de linguagem subjacente, contornar restricoes de seguranca ou acessar dados nao autorizados.
- **Rate Limiting**: Mecanismo de controle que limita o numero de requisicoes ou mensagens que um usuario ou sistema pode enviar em um determinado periodo, protegendo a plataforma contra sobrecarga e abusos.
- **LGPD**: Lei Geral de Protecao de Dados Pessoais (Lei n 13.709/2018) — legislacao brasileira que regula o tratamento de dados pessoais por pessoas fisicas e juridicas.

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
9. WHEN o schema de uma fonte de dados sofrer alteracao (adicao, remocao ou renomeacao de coluna, ou mudanca de tipo de dado) em relacao ao schema registrado na ultima ingestao bem-sucedida, THE Datalake SHALL detectar a mudanca, suspender automaticamente o Pipeline ETL daquela fonte, notificar o Curador com a descricao detalhada das mudancas detectadas e exigir confirmacao explicita do Curador antes de retomar o processamento.

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
8. THE Datalake SHALL calcular e exibir no Catalogo de Dados um Score de Qualidade por fonte, composto por: percentual de nulos, percentual de campos com anomalias detectadas (outliers estatisticos) e percentual de registros duplicados. O Score SHALL ser atualizado a cada execucao do Pipeline ETL e exibido como indicador visual (excelente, bom, atencao, critico) para auxiliar os consumidores na avaliacao da confiabilidade da fonte antes de solicitar acesso.

---

### Requirement 4: Criacao e Configuracao de Views

**User Story:** Como analista de dados, quero criar Views consolidando dados de multiplas tabelas do Datalake, para que os Agentes de IA tenham acesso a informacoes organizadas e contextualizadas.

#### Acceptance Criteria

1. THE Plataforma SHALL permitir que o Usuario crie uma View selecionando tabelas das camadas Silver ou Gold do Datalake e definindo joins, filtros e colunas a serem incluidas.
2. WHEN o Usuario salva uma View, THE Plataforma SHALL validar a consulta subjacente e exibir uma previa com ate 100 registros antes de confirmar o salvamento.
3. IF a consulta de uma View contiver erros de sintaxe ou referencias a tabelas inexistentes, THEN THE Plataforma SHALL exibir uma mensagem de erro descritiva indicando a linha e o tipo do erro.
4. THE Plataforma SHALL atualizar automaticamente os dados de uma View sempre que os dados das tabelas de origem na Camada Gold forem atualizados pelo Pipeline ETL.
5. THE Plataforma SHALL permitir que o Usuario associe uma View a um ou mais Agentes como fonte de dados primaria.
6. THE Plataforma SHALL permitir que o Usuario edite ou exclua uma View existente, e WHEN uma View associada a um Agente ativo for excluida, THE Plataforma SHALL notificar o Usuario e desassociar a View do Agente antes de concluir a exclusao.

---

### Requirement 5: Criacao e Configuracao de Agentes de IA

**User Story:** Como analista de negocios, quero criar Agentes de IA configurados com os dados da minha empresa, para que eu possa obter respostas e analises sem precisar escrever codigo.

#### Acceptance Criteria

1. THE Plataforma SHALL permitir que o Usuario crie um Agente definindo nome, descricao, fontes de dados e Skills habilitadas.
2. THE Plataforma SHALL disponibilizar as seguintes Skills para atribuicao a Agentes: geracao de graficos (barras, linhas, pizza, dispersao), execucao de consultas SQL em linguagem natural, calculos e agregacoes sobre os dados, e geracao de resumos textuais de conjuntos de dados.
3. WHEN o Usuario envia uma mensagem ao Agente, THE Agente SHALL responder em ate 30 segundos com a informacao solicitada ou com uma mensagem indicando que a solicitacao nao pode ser atendida com os dados disponiveis.
4. WHEN o Agente gera um grafico, THE Agente SHALL exibir o grafico inline na interface de conversacao e disponibilizar a opcao de exportacao nos formatos PNG e CSV.
5. THE Agente SHALL manter o contexto das ultimas 20 mensagens da conversa para responder perguntas de acompanhamento sem que o Usuario precise repetir o contexto.
6. IF o Agente nao encontrar dados suficientes para responder a uma solicitacao, THEN THE Agente SHALL informar ao Usuario quais dados estao faltando e sugerir fontes alternativas disponiveis.
7. THE Plataforma SHALL registrar todas as interacoes com cada Agente em um historico acessivel ao Usuario por ate 90 dias.
8. THE Plataforma SHALL permitir que o Usuario publique um Agente como widget incorporavel em sistemas externos via iframe ou SDK JavaScript.
9. WHERE o Modulo Datalake estiver contratado, THE Plataforma SHALL permitir que o Usuario selecione como fontes de dados do Agente Views ou tabelas das camadas Bronze, Silver ou Gold do Datalake.
10. WHERE o Modulo Datalake nao estiver contratado, THE Plataforma SHALL permitir que o Usuario cadastre fontes de dados diretamente no Modulo de Agentes, suportando: upload de arquivos (Excel .xlsx, .xls e CSV), conexao com APIs REST externas via configuracao de endpoint e autenticacao, conexao com bancos de dados relacionais (PostgreSQL, MySQL, SQL Server, Oracle) via string de conexao, leitura de Pasta de Rede via caminho UNC monitorando um arquivo especifico, e integracao com sistemas SAP via RFC.
11. WHEN uma Pasta de Rede configurada como fonte de dados de um Agente sofrer alteracao no arquivo monitorado, THE Plataforma SHALL detectar a alteracao e atualizar automaticamente os dados do Agente sem intervencao manual do Usuario.
12. THE Plataforma SHALL permitir que o Usuario selecione uma ou mais fontes de dados para alimentar um unico Agente, combinando informacoes de multiplas origens.
13. WHEN o Usuario publica um Agente como widget incorporavel, THE Plataforma SHALL exigir a configuracao de pelo menos uma restricao de acesso: lista de dominios permitidos para incorporacao via iframe, autenticacao obrigatoria do usuario final via token JWT, ou ambas.
14. THE Plataforma SHALL disponibilizar na interface de conversacao de cada Agente um mecanismo de feedback por resposta, permitindo que o Usuario avalie cada resposta como positiva ou negativa e adicione um comentario opcional. O historico de feedbacks SHALL ser acessivel ao criador do Agente para analise de qualidade.
15. WHEN o contexto acumulado de uma conversa com um Agente atingir 80% do limite de tokens do modelo de linguagem subjacente, THE Agente SHALL notificar o Usuario com uma mensagem clara indicando que o contexto esta proximo do limite e que mensagens mais antigas poderao ser descartadas, oferecendo a opcao de iniciar uma nova conversa preservando o contexto essencial.

---

### Requirement 6: Selecao de Dados para Experimentos AutoML

**User Story:** Como cientista de dados, quero selecionar dados para iniciar um Experimento de ML, para que eu nao precise exportar e reimportar dados manualmente.

#### Acceptance Criteria

1. WHERE o Modulo Datalake estiver contratado, THE AutoML SHALL permitir que o Usuario selecione o Dataset de um Experimento a partir de qualquer tabela ou View das camadas Bronze, Silver ou Gold do Datalake.
2. WHERE o Modulo Datalake nao estiver contratado, THE AutoML SHALL permitir que o Usuario cadastre fontes de dados diretamente no Modulo AutoML, suportando: upload de arquivos (Excel .xlsx, .xls e CSV), conexao com APIs REST externas via configuracao de endpoint e autenticacao, conexao com bancos de dados relacionais (PostgreSQL, MySQL, SQL Server, Oracle) via string de conexao, leitura de Pasta de Rede via caminho UNC monitorando um arquivo especifico, e integracao com sistemas SAP via RFC.
3. WHEN o Usuario seleciona um Dataset, THE AutoML SHALL exibir uma previa com as primeiras 50 linhas e o total de registros disponiveis.
4. WHERE o Modulo Datalake estiver contratado, THE AutoML SHALL sincronizar o Dataset com o estado atual da camada selecionada no Datalake no momento em que o Experimento e iniciado.
5. THE AutoML SHALL permitir que o Usuario aplique filtros de linha ao Dataset selecionado antes de iniciar o Experimento, reduzindo o escopo dos dados de treinamento.
6. WHEN o Dataset selecionado contiver mais de 10.000.000 de registros, THE AutoML SHALL exibir um aviso ao Usuario informando o volume e o tempo estimado de processamento antes de prosseguir.

---

### Requirement 7: Configuracao do Objetivo e Tipo de Predicao

**User Story:** Como cientista de dados, quero descrever o objetivo do meu modelo e selecionar o tipo de predicao, para que a plataforma configure automaticamente as opcoes adequadas ao meu problema.

#### Acceptance Criteria

1. THE AutoML SHALL permitir que o Usuario insira uma descricao textual do objetivo do Experimento com ate 500 caracteres.
2. THE AutoML SHALL permitir que o Usuario selecione o tipo de predicao entre: Regressao, Classificacao ou Clusterizacao.
3. WHEN o Usuario seleciona o tipo de predicao como Regressao ou Classificacao, THE AutoML SHALL exibir o campo de selecao da variavel Target.
4. WHEN o Usuario seleciona o tipo de predicao como Clusterizacao, THE AutoML SHALL ocultar o campo de selecao da variavel Target e configurar automaticamente as metricas compativeis com Clusterizacao.
5. THE AutoML SHALL listar como opcoes de Target apenas as colunas do Dataset que sejam compativeis com o tipo de predicao selecionado (numericas continuas para Regressao, categoricas ou binarias para Classificacao).
6. IF o Usuario selecionar uma coluna Target com mais de 50% de valores nulos, THEN THE AutoML SHALL exibir um aviso descritivo e solicitar confirmacao antes de prosseguir.
7. THE AutoML SHALL exibir, para cada tipo de predicao disponivel, uma descricao em linguagem de negocio explicando quando utiliza-lo (ex.: "Regressao — use quando quiser prever um numero, como vendas futuras ou o preco de um produto"), permitindo que o Usuario escolha o tipo correto sem precisar conhecer os conceitos tecnicos de ML.

---

### Requirement 8: Analise Estatistica Automatica do Dataset

**User Story:** Como cientista de dados, quero visualizar automaticamente as estatisticas descritivas do Dataset selecionado, para que eu possa entender a qualidade e a distribuicao dos dados antes de preparar o modelo.

#### Acceptance Criteria

1. WHEN o Usuario avanca para a etapa de analise estatistica, THE AutoML SHALL calcular e exibir para cada coluna do Dataset: tipo de dado inferido, contagem total de registros, contagem de valores nulos, contagem de valores unicos, media, desvio padrao, valor minimo, primeiro quartil (Q1), mediana (Q2), terceiro quartil (Q3) e valor maximo.
2. THE AutoML SHALL exibir um histograma de distribuicao para cada coluna numerica do Dataset.
3. THE AutoML SHALL concluir o calculo das estatisticas descritivas de um Dataset com ate 1.000.000 de registros em no maximo 60 segundos.
4. THE AutoML SHALL destacar visualmente as colunas com mais de 20% de valores nulos como candidatas prioritarias para tratamento na etapa de Data Preparation.
5. THE AutoML SHALL exibir um resumo geral do Dataset contendo: numero total de linhas, numero total de colunas, percentual global de valores nulos e distribuicao de tipos de dados (numerico, categorico, data/hora, booleano).
6. THE AutoML SHALL exibir um Tooltip Contextual para cada estatistica descritiva apresentada, explicando em linguagem simples o que aquela estatistica representa e como interpreta-la no contexto dos dados (ex.: "Desvio padrao — indica o quanto os valores variam em torno da media. Um valor alto pode indicar dados inconsistentes.").

---

### Requirement 9: Data Preparation — Transformacoes de Colunas

**User Story:** Como cientista de dados, quero aplicar transformacoes interativas nas colunas do Dataset, para que os dados estejam no formato correto e sem inconsistencias antes do treinamento.

#### Acceptance Criteria

1. THE AutoML SHALL exibir uma tabela interativa com uma linha por coluna do Dataset, mostrando: nome da coluna, tipo inferido, histograma miniatura, valor mais frequente, valor menos frequente, contagem de nulos e contagem de unicos.
2. THE AutoML SHALL disponibilizar as seguintes acoes de transformacao para cada coluna via Toolbox: alterar tipo de dado, tratar valores nulos (por media, mediana, moda ou valor constante), remover coluna, remover outliers por intervalo interquartil (IQR), renomear coluna, substituir valores (replace), padronizacao (standardization z-score), e codificacao de variaveis categoricas (equivalente a pandas.get_dummies).
3. WHEN o Usuario aplica uma transformacao a uma coluna, THE AutoML SHALL atualizar imediatamente a previa da tabela interativa refletindo o resultado da transformacao sem reprocessar o Dataset completo.
4. THE AutoML SHALL manter um historico ordenado de todas as transformacoes aplicadas na sessao, permitindo que o Usuario desfaça a ultima transformacao aplicada.
5. THE AutoML SHALL disponibilizar as seguintes analises de dados: matriz de correlacao entre colunas numericas, countplot para colunas categoricas e barchart para comparacao entre colunas.
6. THE AutoML SHALL disponibilizar as seguintes tecnicas de reducao de dimensionalidade: PCA, Kernel PCA, LDA e selecao de features por importancia via Random Forest e Extra Trees.
7. WHEN o Usuario aplica reducao de dimensionalidade, THE AutoML SHALL exibir a variancia explicada acumulada (para PCA e Kernel PCA) ou a importancia relativa das features (para Random Forest e Extra Trees) para auxiliar na escolha do numero de componentes ou features a manter.
8. THE AutoML SHALL serializar o Pipeline de Preparacao como uma sequencia de etapas reproduziveis que sera aplicada identicamente aos dados de inferencia no momento do Deploy.
9. FOR ALL Pipelines de Preparacao serializados, THE AutoML SHALL garantir que aplicar o Pipeline a um Dataset e depois serializar e desserializar o Pipeline produza o mesmo resultado que aplicar o Pipeline original (propriedade de round-trip de serializacao).
10. WHEN o Usuario aciona uma acao do Toolbox, THE AutoML SHALL exibir, antes de aplicar a transformacao, uma explicacao em linguagem de negocio do impacto daquela acao nos dados (ex.: "Remover outliers — elimina valores extremos que podem distorcer o modelo. Recomendado quando ha erros de digitacao ou medicoes atipicas."), permitindo que o Usuario confirme ou cancele a operacao.
11. WHEN o AutoML detecta problemas em uma coluna (valores nulos, outliers, tipo incompativel ou baixa variancia), THE AutoML SHALL exibir proativamente uma Recomendacao Inteligente sugerindo a transformacao mais adequada para aquela coluna, com a justificativa baseada nos problemas detectados.

---

### Requirement 10: Estrategia de Treinamento e Validacao

**User Story:** Como cientista de dados, quero configurar a estrategia de validacao cruzada e a divisao dos dados, para que a avaliacao do modelo seja estatisticamente robusta.

#### Acceptance Criteria

1. THE AutoML SHALL disponibilizar as seguintes estrategias de validacao: KFold, Stratified KFold, Group KFold e Hold-Out simples.
2. WHEN o Usuario seleciona o tipo de predicao como Classificacao com classes desbalanceadas (diferenca superior a 20% entre classes), THE AutoML SHALL recomendar automaticamente a estrategia Stratified KFold e exibir a justificativa da recomendacao.
3. THE AutoML SHALL permitir que o Usuario configure a proporcao de divisao treino/teste entre 60/40 e 90/10, com valor padrao de 70/30.
4. THE AutoML SHALL permitir que o Usuario habilite ou desabilite o embaralhamento (shuffle) dos dados antes da divisao, com shuffle habilitado como padrao.
5. THE AutoML SHALL permitir que o Usuario configure o numero de folds para estrategias KFold entre 3 e 20, com valor padrao de 5.
6. WHEN o Usuario aceita a estrategia recomendada pelo AutoML, THE AutoML SHALL pre-preencher todos os parametros de validacao com os valores recomendados, permitindo ajuste manual posterior.
7. THE AutoML SHALL exibir, para cada estrategia de validacao disponivel, uma descricao em linguagem de negocio explicando quando utiliza-la e por que (ex.: "KFold — divide seus dados em partes iguais para testar o modelo de forma mais confiavel. Ideal para datasets equilibrados."), permitindo que o Usuario escolha a estrategia adequada sem precisar conhecer os fundamentos estatisticos de validacao cruzada.

---

### Requirement 11: Selecao de Modelos e Tipo de Execucao

**User Story:** Como cientista de dados, quero selecionar quais algoritmos serao treinados e o nivel de otimizacao desejado, para que eu possa equilibrar tempo de execucao e qualidade dos resultados.

#### Acceptance Criteria

1. THE AutoML SHALL disponibilizar um catalogo de algoritmos compativeis com o tipo de predicao selecionado: para Regressao (Linear Regression, Ridge, Lasso, Random Forest Regressor, Gradient Boosting Regressor, XGBoost Regressor, LightGBM Regressor, SVR); para Classificacao (Logistic Regression, Decision Tree, Random Forest Classifier, Gradient Boosting Classifier, XGBoost Classifier, LightGBM Classifier, SVC, KNN); para Clusterizacao (K-Means, DBSCAN, Agglomerative Clustering).
2. THE AutoML SHALL permitir que o Usuario selecione "Executar todos os algoritmos" ou escolha manualmente um subconjunto do catalogo.
3. THE AutoML SHALL disponibilizar tres tipos de execucao: Rapida (sem otimizacao de hiperparametros, parametros padrao), Otimizada (busca automatica de hiperparametros via Bayesian Optimization com ate 50 iteracoes) e Customizada (o Usuario define manualmente os hiperparametros de cada algoritmo selecionado).
4. WHEN o Usuario seleciona o tipo de execucao Rapida, THE AutoML SHALL exibir o tempo estimado de conclusao com base no volume do Dataset e no numero de algoritmos selecionados.
5. WHEN o Usuario seleciona o tipo de execucao Otimizada, THE AutoML SHALL exibir o tempo estimado de conclusao e o numero maximo de iteracoes de otimizacao que serao executadas.
6. THE AutoML SHALL permitir que o Usuario cancele a execucao de um Experimento em andamento, preservando os resultados dos algoritmos ja concluidos ate o momento do cancelamento.
7. THE AutoML SHALL exibir, para cada algoritmo do catalogo, uma descricao simplificada em linguagem de negocio explicando como ele funciona e para quais tipos de problema e mais indicado, acompanhada de um indicador de complexidade com tres niveis: Simples, Moderado ou Avancado.
8. THE AutoML SHALL aplicar um timeout maximo de execucao por Experimento, configuravel pelo Usuario entre 30 minutos e 24 horas, com valor padrao de 4 horas. WHEN o timeout for atingido, THE AutoML SHALL encerrar a execucao, preservar os resultados dos algoritmos ja concluidos e notificar o Usuario com o status parcial do Experimento.

---

### Requirement 12: Configuracao de Metricas de Avaliacao

**User Story:** Como cientista de dados, quero definir as metricas de avaliacao principal e secundaria do Experimento, para que o ranqueamento dos modelos reflita os criterios de qualidade relevantes para o meu problema.

#### Acceptance Criteria

1. THE AutoML SHALL disponibilizar as seguintes metricas de avaliacao para Regressao: R2, RMSE, MAE e MAPE.
2. THE AutoML SHALL disponibilizar as seguintes metricas de avaliacao para Classificacao: Acuracia, F1 Score (macro, micro e weighted), AUC-ROC, Precisao e Recall.
3. THE AutoML SHALL disponibilizar as seguintes metricas de avaliacao para Clusterizacao: Silhouette Score, Davies-Bouldin Index e Calinski-Harabasz Index.
4. THE AutoML SHALL permitir que o Usuario selecione uma metrica principal e, opcionalmente, uma metrica secundaria para cada Experimento.
5. THE AutoML SHALL utilizar a metrica principal como criterio de ranqueamento dos Modelos na tela de resultados.
6. WHEN o Usuario seleciona Classificacao com classes desbalanceadas, THE AutoML SHALL recomendar F1 Score weighted como metrica principal e exibir a justificativa da recomendacao.
7. THE AutoML SHALL exibir, para cada metrica de avaliacao disponivel, uma explicacao em linguagem de negocio descrevendo o que ela mede e como interpretar seus valores.
8. WHEN o Usuario avanca para a etapa de configuracao de metricas, THE AutoML SHALL exibir uma Recomendacao Inteligente indicando a metrica mais adequada para o tipo de problema e os dados do Experimento, acompanhada da justificativa da recomendacao.

---

### Requirement 13: Tela de Resultados do Experimento

**User Story:** Como cientista de dados, quero visualizar os resultados de todos os modelos treinados em uma tela comparativa, para que eu possa selecionar o melhor modelo com base em evidencias quantitativas.

#### Acceptance Criteria

1. WHEN o Experimento e concluido, THE AutoML SHALL exibir uma lista ranqueada de todos os Modelos treinados, ordenada pela metrica principal em ordem decrescente de desempenho.
2. THE AutoML SHALL exibir para cada Modelo na lista: nome do algoritmo, score da metrica principal, score da metrica secundaria (se configurada), score de validacao cruzada (media e desvio padrao), indicador visual de qualidade (excelente, bom, regular, ruim) e tempo de treinamento.
3. WHEN o Usuario seleciona um Modelo da lista, THE AutoML SHALL exibir o Algorithm Data Summary contendo: descricao do algoritmo, etapas do Pipeline de Preparacao aplicadas, hiperparametros utilizados, matriz de confusao (para Classificacao), curva ROC (para Classificacao binaria), grafico de residuos (para Regressao) e importancia das features (quando disponivel).
4. THE AutoML SHALL exibir a matriz de correlacao entre as metricas de todos os Modelos treinados para auxiliar na analise comparativa.
5. THE AutoML SHALL permitir que o Usuario exporte os resultados completos do Experimento em formato CSV contendo todos os Modelos e suas metricas.
6. FOR ALL Experimentos concluidos, THE AutoML SHALL garantir que o Modelo com o maior score na metrica principal ocupe sempre a primeira posicao da lista ranqueada.
7. WHEN o Experimento e concluido, THE AutoML SHALL exibir na tela de resultados uma recomendacao textual em linguagem de negocio identificando o modelo vencedor e explicando por que ele foi o mais adequado.

---

### Requirement 14: Deploy de Modelos Treinados

**User Story:** Como cientista de dados, quero fazer o deploy do modelo selecionado com um clique, para que ele esteja disponivel como API e como interface de simulacao sem necessidade de infraestrutura manual.

#### Acceptance Criteria

1. WHEN o Usuario seleciona um Modelo e aciona o Deploy, THE AutoML SHALL provisionar automaticamente um endpoint REST para inferencia do Modelo em ate 5 minutos.
2. THE AutoML SHALL gerar automaticamente uma interface web de simulacao para o Modelo implantado.
3. THE AutoML SHALL disponibilizar documentacao automatica da API de inferencia no formato OpenAPI 3.0.
4. THE AutoML SHALL aplicar o Pipeline de Preparacao serializado a cada requisicao de inferencia antes de passar os dados ao Modelo.
5. WHEN requisicao invalida, THE AutoML SHALL retornar um erro HTTP 422 com uma mensagem descritiva.
6. THE AutoML SHALL registrar cada requisicao de inferencia com timestamp, payload de entrada, predicao retornada e latencia de resposta.
7. THE AutoML SHALL permitir que o Usuario faca o Deploy de apenas um Modelo por Experimento como endpoint ativo, e substituir ao novo.
8. THE AutoML SHALL disponibilizar a chave de autenticacao (API Key) necessaria para consumo do endpoint e permitir regeneracao.
9. THE AutoML SHALL permitir exportar o Modelo treinado selecionado nos formatos ONNX e pickle/joblib, acompanhado do Pipeline.
10. THE AutoML SHALL monitorar continuamente requisicoes e calcular metricas de Data Drift; quando ultrapassar threshold, alertar e notificar.

---

### Requirement 15: Historico e Rastreabilidade de Experimentos

**User Story:** Como cientista de dados, quero acessar o historico completo de todos os Experimentos realizados, para que eu possa comparar evolucoes ao longo do tempo e reproduzir resultados anteriores.

#### Acceptance Criteria

1. THE AutoML SHALL manter o historico de todos os Experimentos do Tenant.
2. THE AutoML SHALL permitir que o Usuario clone um Experimento existente.
3. THE AutoML SHALL permitir que o Usuario compare dois Experimentos lado a lado.
4. THE AutoML SHALL reter os dados de Experimentos concluidos por no minimo 12 meses.
5. WHEN excluir Experimento com Deploy ativo, THE AutoML SHALL exibir aviso e solicitar confirmacao.
6. THE AutoML SHALL permitir agendamento de retreinamento e comparar antes de substituir o modelo em producao.

---

### Requirement 16: Integracao entre os Tres Produtos

**User Story:** Como usuario da plataforma com multiplos Modulos contratados, quero que os produtos contratados compartilhem dados de forma transparente.

#### Acceptance Criteria

1. WHERE Datalake e Agentes contratados, THE Plataforma SHALL disponibilizar camadas Bronze/Silver/Gold como fontes para Agentes sem exportacao/copia.
2. WHERE Datalake e AutoML contratados, THE Plataforma SHALL disponibilizar camadas como fontes para Experimentos AutoML sem exportacao/copia.
3. WHERE Datalake e Agentes, WHEN camadas atualizam, THE Plataforma SHALL refletir nas Views associadas a Agentes.
4. WHERE Datalake e AutoML, WHEN camadas atualizam, THE Plataforma SHALL refletir nos Datasets de Experimentos que usam sincronizacao em tempo real.
5. WHERE AutoML e Agentes, THE Plataforma SHALL permitir usar Modelo do AutoML como Skill de um Agente.
6. THE Plataforma SHALL exibir painel unificado por Tenant com status de saude dos componentes ativos.
7. IF qualquer componente falhar, THEN THE Plataforma SHALL exibir alerta com descricao do erro e timestamp.
8. THE Plataforma SHALL disponibilizar Central de Notificacoes in-app consolidando alertas e aprovacoes.

---

### Requirement 17: Experiencia Guiada e Onboarding

**User Story:** Como usuario intermediario ou avancado, quero ser conduzido pela plataforma em cada etapa do fluxo AutoML com contexto claro e linguagem acessivel.

#### Acceptance Criteria

1. THE AutoML SHALL exibir uma barra de progresso persistente indicando etapas (Dados -> Objetivo -> Analise -> Preparacao -> Estrategia -> Modelos -> Metricas -> Resultados -> Deploy).
2. WHEN concluir uma etapa e avancar, THE AutoML SHALL exibir resumo do que foi configurado e o que sera realizado em seguida.
3. THE AutoML SHALL exibir Tooltip Contextual para termos tecnicos.
4. WHEN tentar avancar com pendencias, THE AutoML SHALL exibir checklist em linguagem de negocio.
5. WHERE habilitar Modo Assistido, THE AutoML SHALL aplicar configuracoes recomendadas e solicitar confirmacao.
6. THE AutoML SHALL disponibilizar um Glossario Interativo pesquisavel.

---

### Requirement 18: Catalogo de Fontes e Documentacao Automatica

**User Story:** Como analista de dados, quero cadastrar fontes de dados com metadados e ter a documentacao gerada automaticamente.

> **Escopo:** Este requisito aplica-se ao Produto 1 (Datalake) quando contratado.

#### Acceptance Criteria

1. THE Datalake SHALL permitir cadastrar metadados: nome, descricao, responsavel (Curador), data de atualizacao, camada, tags e dominio de negocio.
2. WHEN fonte e cadastrada/atualizada, THE Datalake SHALL gerar documentacao automatica (schema, tipos, exemplos, estatisticas basicas).
3. THE Datalake SHALL disponibilizar documentacao via interface web no Catalogo de Dados.
4. THE Datalake SHALL disponibilizar documentacao via endpoint de metadados autenticado (JSON).
5. IF geracao falhar, THEN THE Datalake SHALL registrar erro e notificar Curador.

---

### Requirement 19: Workflow de Autorizacao e Curadoria

**User Story:** Como Curador, quero controlar quem pode consumir minha fonte via API.

> **Escopo:** Produto 1 (Datalake) quando contratado.

#### Acceptance Criteria

1. THE Datalake SHALL permitir que qualquer Usuario autenticado realize uma Solicitacao de Acesso com justificativa.
2. WHEN criada, THE Datalake SHALL notificar Curador por e-mail e alerta in-app.
3. THE Datalake SHALL permitir Curador aprovar ou rejeitar, exigindo justificativa na rejeicao.
4. WHEN aprovar, THE Datalake SHALL provisionar acesso com nivel definido (leitura ou leitura com filtro).
5. WHEN rejeitar, THE Datalake SHALL notificar solicitante por e-mail com justificativa.
6. THE Datalake SHALL permitir revogar acesso com efeito imediato.
7. THE Datalake SHALL disponibilizar painel de gestao de acessos por fonte.
8. IF tentar consumir sem acesso, THEN THE Datalake SHALL retornar HTTP 403 e registrar tentativa no log de auditoria.

---

### Requirement 20: Disponibilizacao via API com Controle de Acesso

**User Story:** Como consumidor de dados, quero acessar fontes da camada Gold via API REST autenticada.

> **Escopo:** Produto 1 (Datalake) quando contratado.

#### Acceptance Criteria

1. WHEN fonte e promovida para Gold, THE Datalake SHALL disponibilizar automaticamente um endpoint REST autenticado.
2. THE Datalake SHALL autenticar requisicoes por API Key vinculada ao Usuario ou sistema autorizado.
3. THE Datalake SHALL suportar filtros, paginacao e selecao de campos via query params.
4. THE Datalake SHALL gerar documentacao automatica OpenAPI 3.0 com exemplos.
5. IF parametros invalidos, THEN THE Datalake SHALL retornar HTTP 422 com mensagem descritiva.
6. THE Datalake SHALL registrar requisicoes com timestamp, identificacao do consumidor, parametros e status.
7. THE Datalake SHALL aplicar Rate Limiting por API Key (padrao 1000 req/min), retornando HTTP 429 + Retry-After e registrando auditoria.

---

### Requirement 21: Gestao de Modulos Contratados

**User Story:** Como admin, quero visualizar e gerenciar quais Modulos estao ativos.

#### Acceptance Criteria

1. THE Plataforma SHALL disponibilizar painel exibindo status de cada Modulo (ativo ou nao contratado).
2. THE Plataforma SHALL permitir ativar/desativar Modulos contratados pelo painel.
3. WHEN navegar para Modulo nao contratado, THE Plataforma SHALL exibir tela descritiva + CTA.
4. IF acessar Modulo nao contratado, THEN THE Plataforma SHALL exibir a tela descritiva sem bloquear outras areas.
5. WHEN desativar Modulo, THE Plataforma SHALL preservar dados/configs por 30 dias e notificar o admin.

---

### Requirement 22: Connector Agent On-Premise

**User Story:** Como admin de TI, quero instalar um agente leve na rede local para conectar fontes internas a plataforma SaaS.

#### Acceptance Criteria

1. THE Plataforma SHALL disponibilizar instalador do Connector Agent para Windows (64-bit) e Linux (Debian e Red Hat).
2. WHEN instalar, THE Plataforma SHALL gerar token unico por Tenant para vincular o agente.
3. THE Connector Agent SHALL estabelecer exclusivamente conexoes de saida (outbound-only) na porta 443.
4. THE Connector Agent SHALL criptografar trafego com TLS 1.3.
5. WHEN conexao interromper, THE Connector Agent SHALL reconectar com backoff exponencial sem perda de dados pendentes.
6. THE Plataforma SHALL exibir status do agente (conectado, desconectado, erro) + timestamp da ultima comunicacao.
7. WHEN configurar Pasta de Rede como fonte, THE Plataforma SHALL exigir agente instalado e conectado antes de salvar.
8. THE Connector Agent SHALL monitorar arquivo e detectar alteracoes por comparacao de hash, iniciando sincronizacao automaticamente.
9. THE Connector Agent SHALL armazenar localmente dados coletados de forma temporaria e criptografada ate confirmacao de recebimento.
10. THE Plataforma SHALL permitir revogar token do agente a qualquer momento, desconectando imediatamente e impedindo novas sincronizacoes.
11. FOR ALL dados transmitidos, THE Plataforma SHALL garantir confidencialidade de transito.
12. THE Plataforma SHALL suportar multiplos agentes por Tenant e associacao por fonte.

---

### Requirement 23: Log de Auditoria Centralizado

**User Story:** Como admin, quero acessar um log de auditoria unificado cobrindo todas as acoes relevantes.

#### Acceptance Criteria

1. THE Plataforma SHALL manter log de auditoria por Tenant registrando categorias de eventos de todos os Modulos.
2. THE Plataforma SHALL registrar: timestamp UTC, identificacao do Usuario/sistema, tipo de evento, Modulo, recurso, IP e resultado.
3. THE Plataforma SHALL disponibilizar UI com filtros.
4. THE Plataforma SHALL reter log por no minimo 12 meses.
5. THE Plataforma SHALL permitir exportacao em CSV e JSON.
6. IF usuario sem papel admin tentar acessar, THEN THE Plataforma SHALL negar e registrar a tentativa.

---

### Requirement 24: Conformidade com LGPD e Direitos do Titular

**User Story:** Como admin, quero que a plataforma suporte os direitos dos titulares conforme a LGPD.

#### Acceptance Criteria

1. THE Plataforma SHALL permitir registrar e gerenciar solicitacoes de direitos de titulares com rastreamento de status e prazo.
2. WHEN solicitacao de exclusao, THE Plataforma SHALL identificar e listar registros associados ao titular em todas as camadas/datasets e exigir confirmacao antes de excluir.
3. THE Plataforma SHALL permitir exportacao dos dados do titular em JSON estruturado.
4. THE Plataforma SHALL registrar no log de auditoria operacoes de direitos do titular.
5. THE Plataforma SHALL disponibilizar ROPA simplificado (fontes, finalidades e Usuarios com acesso).

---

### Requirement 25: Seguranca contra Prompt Injection e Ataques ao Modelo de Linguagem

**User Story:** Como admin da plataforma, quero que os Agentes de IA sejam protegidos contra ataques de Prompt Injection.

#### Acceptance Criteria

1. THE Plataforma SHALL aplicar sanitizacao em mensagens antes de enviar ao modelo, detectando e neutralizando padroes de Prompt Injection.
2. THE Agente SHALL operar com system prompt imutavel definido pela Plataforma restringindo escopo as fontes autorizadas e Skills habilitadas.
3. WHEN detectar tentativa, THE Plataforma SHALL bloquear a mensagem, retornar resposta generica e registrar no log de auditoria.
4. THE Plataforma SHALL aplicar limite maximo de caracteres por mensagem (padrao 2000; configuravel 500 a 5000).
5. THE Agente SHALL recusar solicitacoes fora das fontes associadas, sem revelar existencia de outras fontes.
6. THE Plataforma SHALL aplicar Rate Limiting por usuario final em widgets (padrao 60 msgs/h) e informar tempo de espera.
7. THE Plataforma SHALL monitorar padroes anomales e alertar admin do Tenant.
8. THE Plataforma SHALL garantir que historico de conversas nao seja acessivel a outros usuarios sem autorizacao explicita do criador.
9. FOR ALL interacoes, THE Plataforma SHALL garantir que o modelo nao tenha acesso direto as credenciais das fontes, apenas aos dados ja processados e autorizados.
