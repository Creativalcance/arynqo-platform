# Transição para cinco campos — 7 de outubro de 2026

## Implementado

- Catálogo oficial ESCO v1.2.1: 3 039 profissões, seis idiomas, URI/UUID comum. Dados descarregados pela API oficial, contagem e unicidade verificadas; manifesto e checksum em occupation-catalogue.json. `scripts/import-esco-occupations.py` reproduz o snapshot, sem escrever na base de dados.
- Formulário comum: profissão pesquisável, área, senioridade (uma no candidato, várias aceites na vaga), modelos de trabalho e competências do catálogo partilhado. Sem escolha automática de profissão ou senioridade.
- Os valores de área são os valores canónicos portugueses existentes; só os rótulos são traduzidos. A área é confirmada pelo utilizador: não se inventou uma correspondência entre profissões ESCO e setores de atividade.
- Confirmação explícita dos cinco campos; alterar um campo retira a confirmação. Perfis incompletos e vagas em rascunho podem ser guardados. Novas publicações e reativações exigem confirmação no servidor. Vagas ativas anteriores permanecem ativas; na edição pela nova interface é pedida confirmação.
- A migração é aditiva e não atribui profissões nem competências aos registos antigos. Dados confirmados sincronizam os campos antigos necessários à apresentação. A revisão é gerida pelo servidor, não pelo cliente.
- Correção de `buildManualMatchingData`: profissão, headline e área não são competências. A profissão editada tem prioridade sobre valores normalizados anteriores. Alterações efetuadas só se refletem em dados ao guardar o perfil.
- A estruturação automática pós-gravação foi retirada das vagas; o endpoint também preserva campos confirmados. O copiloto continua disponível para sugestões explícitas no formulário.

## Motor paralelo e transição

`lib/matching-five.ts` calcula 35 pontos de profissão, 35 de competências, 15 de senioridade, 10 de modelo e 5 de área. Profissão exige o mesmo UUID; equivalências entre profissões não foram inventadas. Competências usam igualdade canónica e aliases revistos. Requisitos duplicados após normalização são contados uma vez. Os critérios de senioridade/modelo usam os conjuntos aceites. Competências adicionais não penalizam.

Sem os cinco campos confirmados dos dois lados, `score=null`. O resultado inclui versão e contribuições, sem limite artificial de 64. Todos os resultados novos mantêm `recommendation=human_review`.

O endpoint já existente de recálculo grava `five_field_shadow` na mesma linha de `ai_matches`, com as revisões de candidato/vaga utilizadas. A pontuação pública antiga continua no campo `match_score`; a nova fórmula não substitui rankings nem dispara notificações. Não se recalcularam dados de pessoas reais durante esta entrega.

`GET /api/admin/matching-review?page=1` exige administrador, é paginado (50), sem cache e fornece pares por ID sem nomes ou contactos. Devolve `pending` e oculta a prévia se as revisões mudaram ou se a vaga está inativa. Exportar somente as preferências estruturadas, a avaliação independente `suitable` e identificadores pseudónimos para o piloto. A API não envia esses dados a terceiros.

Falha ou interrupção do recálculo deixa a comparação nova pendente; não é apresentada como atual. Os formulários continuam a invocar o recálculo ao guardar. Não foi introduzida uma fila durável de retries nem ativada uma troca automática de motor.

## Critérios para ativar a pontuação nova

1. Recolher pares anonimizados com os cinco campos confirmados, incluindo profissões semelhantes, níveis diferentes, mudanças de carreira, requisitos obrigatórios e casos de informação em falta.
2. Um recrutador classifica os casos sem ver a pontuação. Guardar separadamente adequação, falta de informação e condições obrigatórias; uma rejeição de candidatura não é automaticamente uma etiqueta de inadequação.
3. Separar amostras de desenvolvimento e validação. Escolher um limiar de análise explicitamente e executar `npx tsx scripts/evaluate-five-field-matching.ts /caminho/casos.json 80` (80 é apenas exemplo, não limiar aprovado).
4. Cada caso contém `candidate`, `job` (objetos MatchingPreferences) e `suitable` boolean. Casos ainda sem informação devem permanecer separados, sem receber `false` por omissão. A ferramenta recusa entradas inválidas e não publica alterações.
5. Rever falsos positivos/negativos por profissão. Localização, idiomas, licenças e qualificações obrigatórias precisam de tratamento e validação separados antes de autorizar recomendações automáticas. O novo índice sozinho não verifica esses requisitos.
6. Só após essa avaliação substituir leitura da pontuação nas duas interfaces de forma conjunta, limpar resultados desatualizados por revisão e ativar recalculação durável. Não misturar scores antigos e novos no mesmo ranking.

As vagas externas mantêm comparação parcial, sem percentagem inventada. A seleção manual de profissões nas vagas próprias não fornece por si só dados completos para vagas externas.

## Verificação e limites

Testes: sete cenários do motor novo, teste SQL com permissões/rascunhos/confirmacão/revisões e preservação dos registos antigos, seis testes i18n, vinte testes do motor existente. TypeScript, lint direcionado e build de produção com credenciais fictícias. Nenhum pagamento, candidatura, mensagem ou email real foi criado para testar.

A validação de recrutamento e testes visuais autenticados com candidatos/empresas reais permanecem pendentes. As verificações automáticas não estabelecem precisão de recrutamento. O resultado público ainda usa o motor anterior até cumprir os critérios acima.


## Ajuste de UX — 7 de outubro

- Profissão num único combobox com sugestões, seleção por teclado, cancelamento de pedidos antigos e pesquisa por palavras em qualquer ordem. Texto digitado sem escolher uma profissão não confirma um UUID.
- Área «Todas» é uma escolha explícita sem restrição de área, nos dois formulários e na validação SQL. Contribui apenas com os 5 pontos da área; não altera a comparação de profissão/competências. Método paralelo atualizado para five-fields-v2-shadow; prévias de outra versão ficam pendentes.
- Tipo de oportunidade partilhado, junto ao modelo de trabalho: estágios, trainee, horários e contratos. Continua num campo separado do presencial/híbrido/remoto e fora dos cinco pesos. Opções antigas guardadas continuam visíveis até alteração voluntária.
- Removidos a pesquisa separada do seletor, os controlos antigos do tipo de oportunidade e os rótulos visuais repetidos. Título do anúncio, descrição, competências preferenciais e requisitos adicionais mantêm funções distintas.
- Testes: pesquisa localizada, ID estável, área Todas, confirmação e validação SQL. Build e i18n. Validação visual autenticada permanece pendente.

### User-added occupations (7 October 2026)
The shared occupation autocomplete lets authenticated candidates, companies and admins explicitly add a name (2–150 characters). `/api/occupations` merges ESCO labels with database community terms. Exact official labels in any supported language reuse their official ID; ambiguous official labels require selection. Community names are deduplicated by accent/case/whitespace-normalized key with a unique constraint and atomic service-only RPC. Creation is limited to 20 requests/hour/account. Original community wording is retained in all locales; translation or semantic equivalence is not inferred. This is a shared public catalogue: names must be occupations, not personal information.

Both forms save the same UUID and the existing database trigger validates it, keeping five-field matching identity consistent. Existing scores and shadow rollout remain unchanged. For an offline reviewed pilot with community terms, pass an exported array of `{id,label}` catalogue entries as the optional fourth argument to `evaluate-five-field-matching.ts`. Automated tests cover service-only writes, deduplication, custom IDs in both profiles and jobs, API authorization and locale-safe reopening. Full signed-in UI testing remains a separate validation step.
