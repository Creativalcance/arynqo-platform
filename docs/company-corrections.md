# Correções empresariais — 30 de setembro de 2026

A ligação Editar em app/empresa/vagas/page.tsx passa a apontar para /empresa/vagas/[id]/editar, a página existente. Não se altera o formulário nem se grava qualquer vaga.

A migração 20260930003133_allow_owned_company_candidate_reads permite que admin com company_profiles próprio utilize as mesmas regras de consulta de candidatos que company. Mantém auth.uid, vínculo à empresa e vaga, candidatura/consentimento e pré-visualização sem contactos quando não há autorização. Admin sem empresa e admin de outra empresa não obtêm acesso global através destas funções. Não se alteraram os guardas de escrita de decisões, pedidos de contacto ou outras operações; estes continuam a exigir company e precisam de uma decisão separada caso se pretenda permitir administração empresarial completa nesta conta.

Os 12 testes de segurança passaram, incluindo casos adicionais de consulta autorizada, falta de consentimento, admin sem empresa e admin de outra empresa. TypeScript passou. ESLint do teste passou; a página de vagas mantém um erro preexistente react-hooks/immutability na chamada de loadCompanyJobs antes da declaração. A correção da ligação não altera esse código.

A migração foi aplicada e a versão confirmada no histórico remoto. No browser autenticado, a candidatura deixou de mostrar Nome não disponível e passou a disponibilizar uma ligação de perfil. Não se alteraram candidaturas ou estados. A correção frontend será verificada após publicação.

O build Turbopack foi bloqueado pelo sandbox ao tentar abrir uma porta durante o processamento de CSS; não é evidência de erro de código. O build alternativo com --webpack passou, incluindo TypeScript e geração das 43 páginas estáticas. Usou valores de configuração sintéticos, sem chamadas de IA.

Os advisors continuam a assinalar as duas funções SECURITY DEFINER autenticadas (execução intencional com autorização explícita), set_updated_at com search_path mutável, proteção de palavras-passe comprometidas desativada e tabelas com RLS sem políticas. São resultados preexistentes, não uma certificação de segurança. Referência: https://supabase.com/docs/guides/database/database-linter

Esta correção é publicada separadamente do PR do motor evidence-v2. O algoritmo e os resultados de matching não são recalculados.
