# ARYNQO Social Agent — Radar

O módulo em `/admin/social-agent` acompanha contas profissionais e hashtags do Instagram, faz uma triagem por legenda e prepara comentários para revisão. A publicação em contas externas é manual. Não há endpoint de envio, automação de browser, mensagens privadas ou acesso a CV e candidaturas.

## Configuração

Aplicar `supabase/migrations/20261008221647_social_radar.sql` antes da publicação do código. A instalação começa pausada e sem fontes. Usar a página **Fontes** para introduzir contas (por exemplo, `jornaldenoticias`) ou hashtags, sem URLs. A existência e elegibilidade de cada conta são confirmadas apenas na primeira consulta.

Configurar no servidor, nunca no browser nem em variáveis `NEXT_PUBLIC_`:

| Variável | Conteúdo |
| --- | --- |
| `SOCIAL_META_ACCESS_TOKEN` | Token para Instagram API with Facebook Login, com os acessos aprovados para descoberta |
| `SOCIAL_INSTAGRAM_USER_ID` | ID numérico da conta profissional ARYNQO |
| `SOCIAL_META_API_VERSION` | Versão da Graph API validada na aplicação Meta, no formato `vNN.0` |
| `OPENAI_API_KEY` | Integração já usada pela ARYNQO; modelo `gpt-4.1-mini` |
| `CRON_SECRET` | Segredo das tarefas Vercel, já usado pelas restantes sincronizações |

A autenticação administrativa reutiliza `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. Não são apresentadas credenciais no painel. Os indicadores de configuração confirmam presença e formato, não aprovação de permissões. Nesta versão, ligar e renovar o token é uma operação no servidor; não há um fluxo OAuth no backoffice.

Referências oficiais:
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/business-discovery
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/hashtag-search
- https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media

A descoberta por hashtags exige o acesso Instagram Public Content Access. Validar também as permissões da aplicação para Business Discovery. O módulo não garante pesquisa livre por palavras, acesso a contas pessoais ou cobertura integral das publicações.

## Execução e limites

O cron `/api/cron/social-radar` corre a cada cinco minutos e alterna entre pesquisa e preparação. Cada pesquisa consulta até três fontes, em paralelo, com até 50 publicações por fonte e dois pedidos reservados por fonte. Não segue links de paginação devolvidos pelo prestador. A fila roda pelas fontes consultadas há mais tempo.

Os valores iniciais são 120 pedidos reservados e 20 gerações por dia, com intervalo de 60 minutos por fonte. Os tetos configuráveis são 1.000 pedidos e 200 gerações. O agendamento permite no máximo 144 execuções automáticas de cada tipo por dia; o teto não promete esse número de oportunidades ou comentários. Há também limites do prestador. O orçamento diário usa Europe/Lisbon, incluindo mudança de hora. Não é apresentada uma estimativa monetária; o painel mostra tokens reportados pelo prestador.

Até 200 fontes. Hashtags distintas são limitadas conservadoramente a 30 numa janela móvel de sete dias. A reserva é feita antes do pedido, incluindo tentativas falhadas. Usar este token/conta noutros sistemas pode consumir quotas que o Radar não conhece.

`recent_media` devolve publicações das últimas 24 horas. A consulta de hashtags não exige o campo `timestamp`; a data exata fica nula quando não é fornecida. O painel apresenta a data de descoberta e o trabalhador usa conservadoramente descoberta menos 24 horas para o filtro de idade. Contas profissionais usam a data efetiva da publicação. A recolha rejeita URLs externas, datas futuras, legendas vazias e contas/hashtags que possam alterar os campos da Graph API.

O modelo recebe apenas a legenda, a orientação editorial, até 40 comentários preparados/utilizados e 15 avaliações editoriais. Não recebe imagens, vídeos, comentários de terceiros nem dados privados de utilizadores. A triagem inicial é uma regra lexical em português/inglês; a prioridade não representa probabilidade de alcance. A avaliação do modelo pode encaminhar uma oportunidade para revisão manual em vez de gerar uma resposta.

## Estados e garantias

- `new`: aguarda preparação; até duas tentativas automáticas, dentro do orçamento.
- `ready`: sugestões disponíveis para revisão.
- `review`: contexto sensível, insuficiente ou falha persistente de geração.
- `dismissed`: descartada pela administração, com avaliação opcional.
- `used`: a administração indicou que publicou manualmente. Copiar/abrir nunca muda automaticamente para este estado.

Uma reserva global impede execuções concorrentes do cron e do botão manual. Reservas interrompidas expiram ao fim de três minutos. A pausa ou alteração de configuração invalida os resultados das tarefas em curso. Duplicados são impedidos pelo ID da publicação e pelo permalink normalizado, incluindo importação manual seguida de descoberta automática. Alterações manuais de estado durante a geração impedem que a tarefa sobrescreva a decisão.

Todas as tabelas têm RLS e nenhuma permissão para `anon` ou `authenticated`. Os endpoints verificam a sessão e o papel na tabela `profiles` antes de usar o serviço. As funções são `SECURITY INVOKER`, executáveis apenas pelo servidor. Configuração, fontes e decisões administrativas ficam no registo de auditoria. O orçamento de escrita partilha a quota administrativa já existente da Academy nesta versão.

O painel de oportunidades é paginado (20 por página). O histórico apresenta as últimas 15 execuções. Registos novos, em revisão ou prontos com mais de 90 dias são eliminados após execução concluída; decisões utilizadas/descartadas são preservadas para prevenir repetições. Isto não constitui um mecanismo de remoção de dados da Meta em resposta a revogação; antes da ativação operacional, alinhar a retenção com as condições concedidas à aplicação.

## Validação e ativação

1. Aplicar a migração e verificar RLS/grants.
2. Configurar as credenciais e adicionar uma conta profissional conhecida.
3. Ativar o Radar e executar **Pesquisar agora**; confirmar erro/permissões ou publicações reais.
4. Preparar uma sugestão e verificar a legenda de origem. Testar pausa e limites.
5. Expandir as fontes após confirmar a cobertura. Não introduzir exemplos fictícios como resultados reais.

Testes: `node --import tsx --test tests/social-radar*.test.*`, `npm run typecheck`, `npm run build`. Os testes da API e da Graph usam respostas simuladas; a base de dados é exercitada com PGlite. A validação real da Meta depende das credenciais e acessos aprovados.
