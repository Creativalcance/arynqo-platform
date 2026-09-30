# Verificação autenticada — 30 de setembro de 2026

Ambiente: website de produção em arynqo-platform.vercel.app. Conta fornecida pelo proprietário, com perfil de candidato. Credenciais e dados identificativos não são incluídos neste relatório. Verificação através do browser, sem escrever dados de negócio, enviar comunicações, executar IA ou efetuar pagamentos. Autenticação e fim de sessão são as únicas operações de sessão executadas.

| Percurso | Resultado confirmado no browser |
| --- | --- |
| Autenticação | Login com email/palavra-passe abre o dashboard do candidato. |
| Perfil | Página abre; mostra preenchimento de 4%, pontuações de 0 e ausência de competências declaradas. A secção Competências abre corretamente. Guardar/editar não foi testado. |
| Matches | Estado sem matches apresenta instruções e botões de geração. Não foram acionados; presença dos botões não confirma geração funcional. |
| Candidaturas | Histórico vazio com contadores zero e ligação para explorar vagas. Submissão e atualização de estados não testadas. |
| Notificações | Histórico vazio, pendentes zero e botão de marcar todas como lidas desativado. Entrega e emails não testados. |
| Vagas | Listagem carrega 12 vagas. Pesquisa «Torneiro» devolve uma vaga. Termo sem correspondência devolve zero e instrução útil. Limpar filtros remove o termo; filtro Híbrido devolve a vaga correspondente. |
| Detalhe | Ligação Ver vaga abre o detalhe da vaga híbrida. Candidatar, guardar e calcular match não acionados. |
| Administração | A conta recebe «Não tens permissões de administrador», sem apresentar o backoffice. Isto verifica esta página, não todas as operações administrativas. |
| Empresa | /empresa/vagas apresenta «Apenas empresas podem aceder a esta página» e redireciona para o dashboard. Não certifica todas as rotas empresariais ou políticas de dados. |
| Fim de sessão | Sair apresenta a homepage sem navegação privada; acesso posterior a /dashboard/perfil redireciona para /login. |

## Problemas observados

- **Baixo — pluralização:** /vagas apresenta «1 vagas encontradas». Reprodução: pesquisar Torneiro ou selecionar Híbrido. Correção aceite quando a contagem usa singular para uma vaga e plural para zero/múltiplas.
- **Baixo — tradução inconsistente:** o detalhe da vaga híbrida apresenta «hybrid», enquanto a listagem usa «Híbrido». Correção aceite quando todas as apresentações do modelo usam os mesmos rótulos PT-PT.
- **Médio — conteúdo provisório público:** a vaga Frontend Developer Junior apresenta «Isto é uma vaga». A consulta técnica anterior confirmou listas de competências vazias. Completar e confirmar requisitos com a empresa antes de avaliar adequação.

## Limitações e próximos testes

Esta conta tem informação profissional insuficiente para avaliar a qualidade do matching. Não foi enriquecida com informação fictícia. Não há avaliação independente de recrutador, pelo que não se calcula precisão nem probabilidade de contratação.

São necessários perfis de teste completos e acesso aos perfis empresa/admin para testar os respetivos percursos autenticados. Permanecem pendentes: recuperação de palavra-passe e confirmação de email; edição/persistência; carregamento, substituição e eliminação de CV; favoritos; candidaturas e decisões; mensagens; notificações reais; pagamentos; mobile/tablet; acessibilidade e desempenho. Usar dados descartáveis em ambiente de teste para operações que alterem informação. Não foram efetuadas medições de latência nem inspeções de tráfego nesta sessão.

Os resultados do browser referem-se à versão de produção. O novo motor evidence-v2 continua no PR de desenvolvimento e não foi testado através deste website.
