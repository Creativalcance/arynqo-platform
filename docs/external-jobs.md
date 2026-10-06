# Vagas externas — Adzuna

## Ativação

1. Obter uma conta de API em https://developer.adzuna.com/ e autorização de republicação para ARYNQO. Confirmar que o uso com registo gratuito obrigatório do candidato é permitido pelo acordo da conta. Não substituir a fonte por um fornecedor que proíba esse requisito.
2. Configurar **apenas no servidor de produção** `ADZUNA_APP_ID` e `ADZUNA_APP_KEY`, mantendo `CRON_SECRET`. Não usar prefixos `NEXT_PUBLIC_`, publicar chaves ou colocar credenciais no painel.
3. Publicar novamente depois de configurar as variáveis. A migração cria a fonte desativada e sem países.
4. Em Administração → Vagas externas, verificar os três indicadores de configuração, selecionar até três países suportados, confirmar a autorização e ativar. O painel não cria uma conta no fornecedor nem aceita os seus termos por terceiros.
5. Executar Sincronizar agora e confirmar o resultado. Depois, o cron `/api/cron/external-jobs` executa diariamente às 07:00 UTC. Uma janela mínima de 20 horas entre tentativas limita chamadas repetidas (incluindo após falhas).

A especificação consultada em 2026-10-06 **não inclui Portugal**. Países: GB, US, AT, AU, BE, BR, CA, CH, DE, ES, FR, IN, IT, MX, NL, NZ, PL, SG, ZA. Para Portugal, negociar outro feed autorizado ou obter feeds diretamente de empregadores. Não copiar anúncios sem autorização.

## Funcionamento

- Duas páginas de 50 resultados recentes por país, no máximo seis pedidos por execução. Não é uma cópia integral do catálogo da fonte. Apenas excertos são disponibilizados pela API.
- O adaptador valida país, data, campos e URLs Adzuna. Sem scraping, resolução de redirecionamentos no servidor ou inferência de salário, modalidade de trabalho ou competências.
- Atualização idempotente por fornecedor + país + ID. A lista elimina duplicados exatos de título/empresa/localização/país, preferindo a oferta interna. Empresas desconhecidas não são agregadas.
- A pré-visualização pública contém título, empresa, localização e metadados. **Descrição e destino externo ficam numa tabela separada**, sem acesso anónimo; RLS permite apenas candidatos e administradores, enquanto a fonte está ativa e a oferta está atual.
- API de detalhes valida o token e o perfil, com `private, no-store`. Não confiar num botão escondido. As páginas privadas são `noindex`, não entram no sitemap e não geram `JobPosting` para conteúdo condicionado a registo.
- Login e confirmação de registo mantêm `next` limitado à vaga interna/externa, sem redirecionamento arbitrário. Não é obrigatório completar todo o perfil para abrir a vaga; existe convite para o completar e melhorar a compatibilidade nas vagas internas.
- Candidatura no destino fornecido pela Adzuna, depois do login. Não cria candidaturas, contas empresariais, notificações ou matches internos. Não é possível acompanhar a seleção feita fora da ARYNQO.
- Atribuição Adzuna visível e com link, com área mínima 116 × 23 px.
- Sem atualização durante 48 horas, ou com 30 dias desde a publicação original, a oferta é ocultada por RLS mesmo se o cron falhar. Não encontrar um anúncio numa pesquisa parcial não comprova que encerrou: só expira a sua janela de apresentação. Uma falha de um país mantém as ofertas anteriores até essa janela terminar.
- Pausar a fonte ou remover um país oculta imediatamente as respetivas ofertas, incluindo detalhes e destino. Uma configuração alterada durante a importação cancela a gravação desse lote.
- A tabela de estado é privada. O painel mostra contagens, países com falhas e execução mais recente. Alterações de configuração têm auditoria de administrador. Nunca se registam respostas brutas ou URLs de API com chaves.

## Validação

`npm run test:external-jobs` cobre URLs, normalização, países, deduplicação, limites, autenticação, regresso ao anúncio e permissões/expiração/transações em Postgres (PGlite).

A validação real do fornecedor depende de credenciais autorizadas. Não há credenciais de teste ou anúncios fictícios publicados pela migração. O estado inicial é desativado. Confirmar login/registo/retorno e importação real depois da configuração, sem usar contas de clientes para testes.

Fontes: https://developer.adzuna.com/docs/search, https://developer.adzuna.com/swagger/spec/test2.json, https://developer.adzuna.com/docs/terms_of_service.
