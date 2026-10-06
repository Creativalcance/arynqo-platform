# Vagas externas — Adzuna

## Ativação

1. Obter uma conta de API em https://developer.adzuna.com/ e autorização de republicação para ARYNQO. Confirmar que o uso com registo gratuito obrigatório do candidato é permitido pelo acordo da conta. Não substituir a fonte por um fornecedor que proíba esse requisito.
2. Configurar **apenas no servidor de produção** `ADZUNA_APP_ID` e `ADZUNA_APP_KEY`, mantendo `CRON_SECRET`. Não usar prefixos `NEXT_PUBLIC_`, publicar chaves ou colocar credenciais no painel.
3. Publicar novamente depois de configurar as variáveis. A migração cria a fonte desativada e sem países.
4. Em Administração → Vagas externas, verificar os três indicadores de configuração, selecionar os países suportados (até 19, com opção de selecionar todos), confirmar a autorização e ativar. O painel não cria uma conta no fornecedor nem aceita os seus termos por terceiros.
5. Executar Sincronizar agora e confirmar o resultado. Depois, o cron `/api/cron/external-jobs` verifica a fila a cada cinco minutos. Cada lote processa até três países (seis pedidos). Um país concluído volta à fila após 24 horas; uma falha pode ser repetida após uma hora. Os estados e prazos persistem na base de dados.

A especificação consultada em 2026-10-06 **não inclui Portugal**. Países: GB, US, AT, AU, BE, BR, CA, CH, DE, ES, FR, IN, IT, MX, NL, NZ, PL, SG, ZA. Para Portugal, negociar outro feed autorizado ou obter feeds diretamente de empregadores. Não copiar anúncios sem autorização.

## Funcionamento

- Duas páginas de 50 resultados recentes por país, no máximo seis pedidos por lote. Até 19 países, 1 900 anúncios recebidos por ciclo e 38 pedidos sem repetições. O limite conservador é 60 pedidos reservados/dia UTC (inclui falhas e lotes interrompidos), até 1 860 em 31 dias. Um bloqueio global impede lotes concorrentes; intervalo mínimo de um minuto. Um lote interrompido pode ser recuperado após dez minutos. Não é uma cópia integral do catálogo da fonte. Apenas excertos são disponibilizados pela API.
- O adaptador valida país, data, campos e URLs Adzuna. Sem scraping, resolução de redirecionamentos no servidor ou inferência de salário, modalidade de trabalho ou competências.
- Atualização idempotente por fornecedor + país + ID. A pesquisa SQL pública elimina duplicados de título/empresa/localização/país, preferindo a oferta interna. Filtra e pagina no servidor (20 por página); não existe o limite anterior de 600 anúncios carregados no browser. Empresas desconhecidas não são agregadas.
- A pré-visualização pública contém título, empresa, localização e metadados. **Descrição e destino externo ficam numa tabela separada**, sem acesso anónimo; RLS permite apenas candidatos e administradores, enquanto a fonte está ativa e a oferta está atual.
- API de detalhes valida o token e o perfil, com `private, no-store`. Não confiar num botão escondido. As páginas privadas são `noindex`, não entram no sitemap e não geram `JobPosting` para conteúdo condicionado a registo.
- Login e confirmação de registo mantêm `next` limitado à vaga interna/externa, sem redirecionamento arbitrário. Não é obrigatório completar todo o perfil para abrir a vaga; existe convite para o completar e melhorar a compatibilidade nas vagas internas.
- Candidatura no destino fornecido pela Adzuna, depois do login. Não cria candidaturas, contas empresariais, notificações ou matches internos. O detalhe apresenta uma comparação privada de competências declaradas com menções explícitas no título/excerto; não atribui percentagens a dados insuficientes. Não é possível acompanhar a seleção feita fora da ARYNQO.
- Atribuição Adzuna visível e com link, com área mínima 116 × 23 px.
- Sem atualização durante 48 horas, ou com 30 dias desde a publicação original, a oferta é ocultada por RLS mesmo se o cron falhar. Não encontrar um anúncio numa pesquisa parcial não comprova que encerrou: só expira a sua janela de apresentação. Uma falha de um país mantém as ofertas anteriores até essa janela terminar.
- Pausar a fonte ou remover um país oculta imediatamente as respetivas ofertas, incluindo detalhes e destino. Uma configuração alterada durante a importação cancela a gravação desse lote.
- A tabela de estado é privada. O painel mostra contagens, países com falhas, categorias de erro e execução mais recente por lote. A tabela por país permite verificar o progresso. Alterações de configuração têm auditoria de administrador. Nunca se registam respostas brutas ou URLs de API com chaves.

## Validação

`npm run test:external-jobs` cobre URLs, normalização, países, deduplicação, limites, autenticação, regresso ao anúncio e permissões/expiração/transações em Postgres (PGlite).

A validação real do fornecedor depende de credenciais autorizadas. Não há credenciais de teste ou anúncios fictícios publicados pela migração. O estado inicial é desativado. Confirmar login/registo/retorno e importação real depois da configuração, sem usar contas de clientes para testes.

Fontes: https://developer.adzuna.com/docs/search, https://developer.adzuna.com/swagger/spec/test2.json, https://developer.adzuna.com/docs/terms_of_service.

## Compatibilidade externa: âmbito desta versão

`GET /api/external-jobs/[id]/compatibility` aceita apenas o candidato autenticado, consulta o seu próprio perfil e respeita a visibilidade/expiração da oferta através de RLS. Usa competências declaradas e equivalências revistas do catálogo, com comparação por termos completos (Java não corresponde a JavaScript). A ausência de uma coincidência não prova incompatibilidade. Uma menção, incluindo numa frase negativa, não é classificada como requisito obrigatório.

O resultado é recalculado ao abrir o detalhe; não grava um match interno nem mantém resultados pessoais desatualizados. O score é sempre `null` nesta versão porque o excerto não fornece requisitos estruturados validados. Não há chamada de IA, custo de extração ou envio de dados do candidato ao fornecedor. Não implementa recomendações automáticas no dashboard. Percentagens externas e ordenação personalizada continuam dependentes de requisitos estruturados, vocabulário multilingue validado e avaliação com exemplos reais revistos. Não apresentar esta primeira comparação como motor completo de matching externo.

Os testes globais usam 650 ofertas sintéticas apenas em PGlite e verificam a recuperação de todos os resultados, os 19 países, orçamento, bloqueio de concorrência, pausa e acesso anónimo sem descrição/destino. Nenhum anúncio sintético é publicado.

Uma resposta com anúncios mas sem qualquer registo válido é uma falha de validação, não uma pesquisa vazia bem-sucedida. O painel distingue datas antigas/futuras/inválidas, campos em falta e URLs recusadas, sem guardar respostas brutas ou credenciais.

## Prioridade e apresentação

A pesquisa ordena primeiro as vagas internas e depois as externas, antes de aplicar LIMIT/OFFSET. Dentro de cada grupo usa data decrescente e ID como desempate. A regra mantém-se com pesquisa, filtros e páginas seguintes; o filtro exclusivo de vagas externas continua disponível. Testado com 25 vagas internas antigas e 650 externas recentes, incluindo a transição na segunda página.

A página distingue os grupos, concentra as condições de acesso no cabeçalho das ofertas externas e mantém a atribuição Adzuna em cada anúncio. Pesquisa e país ficam visíveis; os restantes filtros podem ser expandidos. Os cartões mostram empresa, título, localização, condições disponíveis, data e ação.

## Evidência multilingue

A comparação externa usa agora `external_skill_equivalences`, que consulta apenas os conceitos aprovados correspondentes às competências do candidato (máximo de 200 entradas), as traduções existentes e os aliases revistos. Não descarrega o catálogo completo. Termos que correspondem a vários conceitos aprovados são excluídos, em vez de escolher uma interpretação. Conceitos rejeitados ou pendentes não estabelecem equivalências.

Cada coincidência inclui um trecho do anúncio original, preservando acentos e pontuação. A interface permite expandir a competência para consultar esse trecho. Isto continua a ser evidência de uma menção, sem classificação automática como requisito obrigatório e sem percentagem de compatibilidade.
# Country filter and future-dated feeds

Changing country or origin clears dependent location, area and contract selections and returns to page 1. Countries remain selectable even where no valid adverts have been imported; a zero result must not be presented as proof that no employment opportunities exist there.

If the newest Adzuna page contains no valid adverts and includes future-dated records, the second reserved request fetches page 1 ordered by date ascending within the same 30-day window. Validation remains unchanged. This fallback never exceeds two requests per country and cannot guarantee valid results from the provider. Daily budgets and retry scheduling still apply.
