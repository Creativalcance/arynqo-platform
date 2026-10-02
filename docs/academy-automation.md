# ARYNQO Academy: publicação internacional

## Fluxo

O cron existente `/api/cron/generate-academy-post` passa a consultar diariamente, às 09:00 UTC, o calendário persistente. Os temas têm intervalos nominais de 48 horas. O horário real depende do agendador Vercel e da duração da geração; não é uma garantia de publicação ao segundo. Não há recuperação em massa de temas atrasados.

Um tema origina seis versões (pt, en, fr, es, de, it), com um slug comum e os prefixos de idioma existentes. O Português continua sem prefixo. O original, as versões, a utilização e a execução são guardados separadamente. Os artigos anteriores e o seu editor são preservados.

A automação começa **pausada**. O calendário inicial contém 24 temas que não são reutilizados. O admin pode acrescentar temas e fontes. Quando não houver temas, a geração para com `calendar_empty`.

1. Reivindicar uma execução numa transação, com lease de dez minutos e exclusão de concorrência.
2. Reservar seis pedidos no limite mensal, também em tentativas que falhem. Não reembolsar reservas após timeout, porque não é possível saber se o fornecedor processou o pedido.
3. Ler até duas fontes oficiais, com limites de tamanho, tempo e hosts. Redirecionamentos não são seguidos.
4. Gerar o original português e traduzir para os restantes idiomas, com concorrência máxima de dois pedidos e sem retries implícitos do SDK. O fornecedor recebe um JSON Schema estrito; o servidor calcula o tempo de leitura a partir do texto, sem depender de um campo gerado pela IA.
5. Validar campos, estrutura, extensão, indícios de idioma errado, repetição e conteúdo que exige revisão. HTML e links externos inesperados bloqueiam a geração. Citações, datas e percentagens ficam em rascunho para revisão editorial, sem publicação automática. Guardar cada versão numa transação; contabilizar tokens também em respostas rejeitadas.
6. Publicar numa transação apenas com seis versões completas, automação e publicação automática ativas, e sem flags de revisão. Artigos sensíveis ou de pré-visualização ficam para revisão humana.

As verificações estruturais, as heurísticas de idioma e a instrução ao modelo **não certificam a exatidão dos factos nem a qualidade de tradução**. Não há pesquisa automática de notícias/tendências, certificação jurídica, imagem gerada ou atribuição a um autor humano fictício. Fontes e datas de consulta ficam visíveis. Não se enviam dados de candidatos ou empresas à IA neste fluxo.

## Configuração de produção

No projeto Vercel da ARYNQO, verificar:

- `OPENAI_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY`: exclusivamente servidor.
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: configuração pública existente.
- `CRON_SECRET`: segredo aleatório forte, só em Production. O Vercel envia `Authorization: Bearer <CRON_SECRET>`. Não colocar o valor em código, URLs, logs ou chat.
- Aplicar as migrações `academy_multilingual_automation` e `academy_api_limit_operation` antes de publicar este código.
- Fazer novo deployment após alterar variáveis; variáveis alteradas não atualizam deployments anteriores.
- Confirmar que a função Node suporta `maxDuration=300` no projeto/plano utilizado. A disponibilidade e os limites reais devem ser verificados em produção.

No admin → Academy:

1. Gerar seis rascunhos para validação (não publica, mesmo com auto-publicação ativa).
2. Confirmar o conteúdo, fontes, idioma e metadados das seis versões.
3. Publicar após revisão se forem adequadas.
4. Ativar calendário e publicação automática; definir limite mensal. O valor inicial é 120 pedidos. Este limite é de pedidos, **não um orçamento em euros**. Os custos dependem dos tokens e preços do fornecedor. O editor antigo tem o seu limite de utilização separado.
5. Confirmar uma execução efetiva do cron e as seis páginas públicas.

Pausar o calendário impede novas execuções automáticas e faz uma execução já iniciada terminar em revisão, sem publicação. Falhas podem ser repetidas até três tentativas por tema; as versões completas são reutilizadas. Leases expiradas são recuperadas na próxima chamada. Ao atingir três falhas é necessária intervenção técnica/editorial; o tema não é reutilizado automaticamente.

## Segurança e publicação

- APIs de gestão verificam token Supabase e perfil `admin` na base de dados.
- Todas as novas tabelas têm RLS; o público lê traduções apenas de artigos publicados.
- Escritas/RPC do processo são restritas a `service_role`, com `SECURITY INVOKER` e `search_path` fixo.
- A área móvel usa a mesma leitura pública localizada. Rascunhos nunca são incluídos, mesmo quando o visitante é administrador.
- Metadados SEO usam título/descrição traduzidos; hreflang e sitemap incluem apenas versões disponíveis. Os dois artigos legados continuam traduzidos pelo catálogo existente enquanto o original corresponder ao respetivo snapshot.
- Markdown não interpreta HTML. Listas e links usam elementos semânticos. Não existe imagem de capa gerada; não são criados textos alternativos fictícios.

## Verificação

```sh
npm run test:academy
node --import tsx tests/security-api.test.ts
npx tsc --noEmit
npm run build
```

Os testes de base de dados usam PGlite isolado: permissões, rascunhos privados, claims exclusivos, publicação incompleta bloqueada, limite mensal, reutilização após falha parcial, revisão e publicação atómica. Os testes de qualidade usam fixtures, sem consumir IA. Um build com credenciais placeholder não valida a ligação ao fornecedor.

Para validar a IA em produção, confirmar primeiro a configuração e gerar um artigo com publicação automática desligada. Pode usar-se a pré-visualização no admin ou o botão Run do cron da Academy no Vercel, com o calendário ativo. Rever as seis versões e os registos antes de ativar a publicação automática. Distinguir uma invocação manual pelo Vercel de uma execução disparada à hora agendada.

Os testes de geração interceptam todas as chamadas externas: verificam a gravação das seis versões sem um tempo de leitura fornecido pelo modelo e a rejeição de conteúdo inválido antes de qualquer publicação. O teste real de 2 de outubro de 2026 revelou `missing_reading_time` na resposta livre do fornecedor; o schema estrito e o cálculo no servidor corrigem essa dependência.
