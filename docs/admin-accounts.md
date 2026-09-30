# Administração de contas e dados

Entrada: `/admin/contas`, ligada a partir de `/admin`.

## Âmbito implementado

- Contas do Supabase Auth, incluindo registos sem perfil concluído; pesquisa por nome/email, perfil, confirmação e período de criação, com 50 linhas por página. Instantes apresentados em Europe/Lisbon; filtros de datas em UTC.
- Ficha por conta e seleção dos seus dados: perfis, candidatos, empresas, vagas, candidaturas, matches, contactos, favoritos, ações, notificações, preferências, subscrições, projetos e competências.
- Consulta global da Academia, competências e histórico administrativo.
- Inventário dos quatro buckets atuais: `student-cvs`, `cvs`, `student-avatars`, `company-logos`; proprietário identificado por prefixo da conta/empresa ou proprietário do objeto. Objetos sem proprietário identificado mantêm-se na consulta global.
- Visualização de PDF/JPEG/PNG/WebP em diálogo; outros formatos por download. Referências externas ou antigas aparecem nos dados de perfil/projeto. A presença no inventário não substitui a verificação do download: um objeto pode ficar indisponível.
- CSV com cabeçalhos portugueses, BOM UTF-8, separador `;`, campos complexos em JSON e neutralização de fórmulas de folha de cálculo. Exporta todas as páginas da seleção e pode restringir colunas.
- ZIP com CSV separados ligados pelos IDs, global ou de uma conta. Não contém binários. Ignora os filtros da listagem, conforme indicação na interface.

## Segurança

`requireActor(request, ['admin'])` valida a sessão com Auth e o papel na tabela protegida `profiles`, antes de criar qualquer cliente privilegiado. Não usa `user_metadata` ou indicadores do navegador. As políticas de candidatos/empresas não foram alargadas.

Pesquisas e filtros enviados no corpo de POST, sem termos de pesquisa no URL da interface. Cliente privilegiado exclusivamente em `lib/admin-data.ts` com `server-only`. RPCs administrativas só executáveis por `service_role`. Não exporta palavras-passe, sessões, credenciais, tokens push ou embeddings. Colunas por lista explícita, sem `select('*')`.

Registos em `admin_access_log`: administrador, operação, conjunto, ID, número de linhas e instante. Sem pesquisa/contactos/conteúdo dos documentos nos logs. Consultas, exportações e downloads não devolvem dados se o registo falhar. Log sem permissões para navegadores e sem UPDATE/DELETE para o serviço. O download guarda o ID do ficheiro; não uma cópia do documento.

Respostas privadas sem cache e com `nosniff`. Download sempre como anexo, só por ID de objeto nos buckets permitidos, sem pedidos a URLs externas. 20 MB por download. Limites: 300 leituras e 10 exportações por administrador em 15 minutos.

## Limites operacionais

- 10 000 linhas por conjunto exportado; 20 MB de CSV por ZIP. Excesso devolve erro explícito, sem ficheiro parcial.
- Até 1 000 relações de perfil/vagas por ficha. Acima disso a consulta global continua disponível, e a ficha indica a limitação.
- Consultas sucessivas não são um snapshot transacional. Alterações concorrentes entre páginas/conjuntos podem afetar uma exportação; para cópias de segurança utilizar os mecanismos da base de dados.
- Consulta, visualização e exportação. Sem alteração de contas, permissões ou eliminação de dados.
- Datas referem-se à criação de registos. Conjuntos sem `created_at` e inventário de ficheiros não aplicam filtro de datas.

## Validação

Migração `20260930160910_admin_account_inventory.sql` aplicada. Verificação em produção: 9 contas, 10 objetos; RPCs sem permissão de `anon`/`authenticated`; tabela de log com RLS e sem SELECT de `authenticated`.

Testes:

```
node --import tsx tests/admin-module.test.ts
node --import tsx tests/admin-api.test.mjs
node tests/admin-database.test.mjs
npm run test:security
npx tsc --noEmit
```

Os testes de API usam respostas sintéticas e o runtime Node 24 (hook para o marcador `server-only`). Testam rejeição de sessões/perfis não administrativos, falha de auditoria, cache privado, validação de conjuntos/colunas e referências de download. Testes SQL em PGlite verificam contas incompletas, filtros, propriedade e ausência de permissões das funções/log. ZIP validado independentemente com `zipfile` do Python.

Build com variáveis fictícias: compila páginas e rotas, sem validar integrações reais. Lint dirigido aos ficheiros novos.

O módulo inicial foi publicado. A tentativa de login no domínio foi recusada por falta de perfil administrativo; o percurso autenticado de consulta e exportação permanece por validar.

Correção de 30/09/2026: os controlos são montados apenas após `/api/admin/acesso` validar no servidor o token e o perfil protegido. A verificação inicial e as mudanças de sessão ocultam o módulo. Testes em `tests/admin-access.test.mjs`: HTML inicial sem controlos, visitantes rejeitados com 401, candidatos/empresas com 403, administrador autorizado, cache privado. A API de dados continua a verificar permissões em cada operação.

A função de quotas rejeitava `admin-read` e `admin-export`, causando o erro do limite de utilização. Migração `20260930185255_admin_api_limit_operations.sql` acrescenta essas operações, mantendo execução exclusiva de `service_role`. Ambas foram executadas em produção numa transação revertida. Verificação de tipos e lint dirigido passaram.

Advisors: novo aviso informativo de RLS sem políticas no log é intencional (acesso exclusivo por serviço). Restantes avisos de funções antigas e proteção de palavras-passe comprometidas são anteriores a este módulo.
