# ARYNQO Mobile · etapa 1

Aplicação Expo / React Native para Android e iOS, com navegação própria e acesso aos mesmos serviços da plataforma. O website Next.js permanece na raiz. Esta pasta tem dependências e lockfile próprios; não foi feita uma migração do website para um monorepo.

## Funcionalidades desta etapa

- Entrada com uma conta ARYNQO existente; sessão guardada no armazenamento seguro do sistema no Android/iOS.
- Consulta pública de vagas, pesquisa por função/área e filtros por país, localização e regime de trabalho. Paginação de 20 vagas.
- Detalhe da vaga e envio de candidatura, com confirmação explícita da partilha do perfil/CV com a empresa.
- Consulta das 100 candidaturas mais recentes e respetivo estado.
- Resumo do perfil e saída da conta neste dispositivo.
- Registo, recuperação de acesso, edição do perfil/CV e Academy abrem o website no navegador. A sessão do navegador é independente; pode ser necessário entrar novamente.

Interface inicial em português. Gestão empresarial nativa, registo nativo, upload de CV, matching, favoritos, restantes idiomas e notificações push serão tratados nas próximas etapas. A app ainda não foi publicada nas lojas.

## Instalação e configuração

Requer Node.js 22.13 ou superior. Expo SDK 57, React Native 0.86 e React 19.2.3.

```bash
cd mobile
npm ci
cp .env.example .env.local
```

Preencher `.env.local` com o URL e uma chave **publishable** do projeto de testes e o endereço do website. Nunca usar `service_role`, segredos Supabase ou chaves de IA em variáveis `EXPO_PUBLIC_*`. Não foram incluídas credenciais no repositório.

```bash
npm start
npm run web
```

As tabelas e políticas utilizadas já existem na plataforma: `profiles`, `student_profiles`, `jobs`, `company_profiles` e `applications`. Esta etapa não adiciona migrações nem altera o projeto Supabase.

Os pedidos de candidatura enviam apenas `job_id` e `student_id`. O servidor aplica as políticas de acesso, valida a conta e a disponibilidade da vaga, impede duplicados e coloca as notificações existentes em fila. A app não envia emails nem calcula novos matches nesta etapa.

O prazo de candidatura segue `is_active` e `renewal_deadline`, de acordo com a função existente `guard_application_write`. `expires_at` desencadeia o processo de renovação e não substitui esse prazo. O servidor continua a ser a autoridade quando o relógio do telemóvel estiver incorreto.

## Verificação

```bash
npm run typecheck
npm run lint
npm test
npm run export:web
npx playwright install chromium
npm run test:e2e
npm run export:native
```

Os testes de navegador intercetam os pedidos ao Supabase e usam dados fictícios identificados como dados de teste. Não criam utilizadores nem candidaturas reais. A variável opcional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` permite usar um Chromium já instalado. Exportar bundles Android/iOS verifica o código JavaScript e os recursos; não equivale a gerar um APK/IPA nem a executar a app num dispositivo.

Na raiz, `node tests/recruitment-actions.test.mjs` verifica as regras de candidatura numa base PGlite local. `npm run build` verifica o website; necessita das suas variáveis de ambiente habituais.

## Próxima etapa: teste num dispositivo

### APK inicial de testes

O perfil Android `internal-test` gera `ARYNQO Testes`, com o identificador separado `com.creativalcance.arynqo.preview`. Usa o mecanismo `withoutCredentials` do EAS e a assinatura de desenvolvimento fornecida pelo template nativo Expo. Não usa nem substitui a chave de publicação da aplicação. Serve exclusivamente para instalação e testes internos; não deve ser submetido ao Google Play. O perfil `production` continua a exigir as credenciais de publicação habituais.

Para gerar este APK pelo painel Expo, selecionar **Build from GitHub**, branch `feat/mobile-foundation`, pasta `mobile`, plataforma **Android**, perfil **internal-test** e ambiente **Preview**. Manter a submissão às lojas desativada. As variáveis `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `EXPO_PUBLIC_WEBSITE_URL` têm de estar configuradas nesse ambiente. O nome do ambiente EAS não cria uma base de dados separada: se forem usadas as variáveis da plataforma, o login e as candidaturas serão reais.

### Versões com assinatura de publicação

1. Preparar um projeto Supabase de testes com as tabelas/políticas da plataforma e contas fictícias de candidato e empresa.
2. A configuração em `app.json` identifica o projeto Expo `@creativalcanceapp/arynqo`, com o Project ID `927a2169-1c28-4865-b575-f81dcb12ae04`. Autenticar com `npx eas-cli@latest login` e verificar o acesso com `npx eas-cli@latest project:info`. O projeto está em https://expo.dev/accounts/creativalcanceapp/projects/arynqo. Confirmar também os identificadores propostos `com.creativalcance.arynqo` antes de reservar aplicações nas lojas.
3. Configurar no ambiente EAS `preview` as variáveis públicas do projeto de testes.
4. Gerar o APK interno: `npx eas-cli@latest build --platform android --profile preview`.
5. Testar autenticação, persistência de sessão, saída, filtros e candidatura num Android físico. Para distribuição interna num iPhone, preparar a assinatura Apple e registar o dispositivo; o perfil `simulator` destina-se ao simulador iOS.

O repositório `Creativalcance/arynqo-platform` já foi ligado ao Expo pelo responsável do projeto, com a pasta base `mobile`. O código desta etapa está na branch `feat/mobile-foundation`. Depois da primeira compilação Android bem-sucedida pelo EAS CLI e da configuração das credenciais de assinatura, as compilações pelo painel GitHub do Expo devem usar essa branch, a plataforma Android e o perfil `preview`. Este perfil indica explicitamente a imagem de compilação, como exigido pela integração GitHub.

Antes da publicação pública, completar os percursos nativos em falta, a eliminação de conta, a revisão de privacidade das lojas e os testes em dispositivos Android/iOS.

## Identidade visual

O ícone foi preparado a partir do símbolo fornecido para o projeto, sem geração por IA. A designação apresentada na interface é ARYNQO. O ficheiro branco recebido continha a designação ANODOS e não foi utilizado na app.
