# ARYNQO internacional

PT mantém o endereço original. EN, FR, ES, DE e IT usam `/en`, `/fr`, `/es`, `/de`, `/it`. Seletor no cabeçalho, registo, perfis candidato/empresa e área móvel. Contas guardam preferência em `profiles.locale` e metadados Auth; área privada recupera-a. Cookie dura um ano. Páginas públicas mantêm idioma do URL para partilha/indexação.

Catálogos estáticos incluem interface, erros conhecidos, documentos legais e os dois artigos públicos atuais. São renderizados no servidor, sem serviço de tradução no browser. Artigos novos precisam de tradução/revisão no catálogo. Conteúdos livres, identidades e documentos mantêm o original. Idioma da vaga é declarado pela empresa, separado da interface.

Países têm nomes localizados com valores existentes preservados. Vagas podem indicar país ISO. Idiomas profissionais mantêm códigos/níveis. ESCO usa rótulos oficiais do mesmo URI v1.2.1: 13 793 conceitos em cada novo idioma, 68 965 rótulos importados. Valores canónicos e regras de matching mantêm-se. Comunidade mantém moderação; conceitos oficiais ausentes do catálogo atual não foram criados.

SEO: títulos internacionais, HTML lang, canonical/hreflang (6 + x-default), Open Graph/Twitter, sitemap, robots privados, noindex e esquemas Organization/WebSite/Article/JobPosting factuais. País e prazo real da vaga; sem inventar requisitos remotos. Manifest por idioma; alt, placeholders e nomes acessíveis traduzidos. Elementos publicados não garantem indexação/classificação/citação por pesquisa ou IA.

## Verificação

Catálogos: chaves/placeholders e valores dinâmicos preservados. PGlite: registo, preferência, isolamento/role, pesquisa localizada e escrita proibida. Base hospedada: rótulos importados e leitura com papel autenticado. Regressão: notificações, matching, perfis, segurança, candidaturas, ficheiros, emails e validade de vagas. HTTP local: seis versões, HTML SSR, canonical/hreflang, login noindex, manifest, política FR, sitemap/robots, API isolada, preferência. Resultado em `i18n-http-verification.json`.

## Limitações

Traduções extensas partiram de modelos offline com revisão de terminologia e percursos principais; revisão linguística integral por falantes nativos e revisão jurídica das versões legais pendentes. Sessão completa autenticada no browser por perfil/idioma e testes físicos em todos os dispositivos não realizados nesta alteração.

Auth: templates preparados; ativação hospedada/receção pendentes (ver `supabase/templates/README.md`). Notificações da aplicação usam idioma do destinatário; conteúdo e erros testados sem envio real.

## Manutenção

`node scripts/extract-i18n.mjs`, completar/rever os cinco catálogos, `node scripts/apply-i18n-overrides.mjs`, `node --import tsx tests/i18n.test.ts`. Textos revistos em `scripts/i18n-overrides.json`. `scripts/translate-catalog.py` usa Argos offline em Python separado; não faz parte do runtime. `node scripts/build-auth-email-templates.mjs` gera templates.

ESCO: `scripts/import-esco-translations.py` obtém rótulos; manifesto guarda hashes. Importação junta tags aprovadas por URI/versão e grava em `profile_tag_translations`, sem mudar valores canónicos. Pesquisa usa RLS/SECURITY INVOKER; apenas service_role importa. Novos rótulos devem seguir o mesmo procedimento validado, não assumir que a migração de estrutura contém os dados do fornecedor.

Preparar os chunks SQL reproduzíveis da importação com `python scripts/render-esco-translation-import.py`, após obter o catálogo oficial. São executados por uma ligação administrativa e são idempotentes.
