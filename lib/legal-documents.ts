export type LegalDocument = {
  key: string;
  href: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: { id: string; number: string; title: string; paragraphs: string[] }[];
};

export const legalDocuments: Record<"cookies" | "privacy" | "legal", LegalDocument> = {
  "cookies": {
    "key": "cookies",
    "href": "/politica-de-cookies",
    "title": "Política de Cookies",
    "description": "Informação sobre cookies, armazenamento no navegador e escolhas de privacidade no website ARYNQO.",
    "updatedAt": "30 de setembro de 2026",
    "sections": [
      {
        "id": "seccao-1",
        "number": "1",
        "title": "Objeto e responsável",
        "paragraphs": [
          "Esta Política de Cookies descreve o armazenamento e o acesso a informação no equipamento de quem utiliza o website ARYNQO. Abrange cookies e mecanismos equivalentes, como armazenamento local do navegador, identificadores e tecnologias de medição. Deve ser lida com a Política de Privacidade.",
          "CRIATIVALCANCE, UNIPESSOAL LDA, NIPC 518143350. Avenida Fernão de Magalhães, n.º 481, 2.º andar, sala D, 3000-177 Coimbra, Portugal. Email: info@creativalcance.com. Telefone: +351 913 784 204 (chamada para a rede móvel nacional)."
        ]
      },
      {
        "id": "seccao-2",
        "number": "2",
        "title": "O que são cookies",
        "paragraphs": [
          "Cookies são pequenos ficheiros que um website pode guardar no navegador. Podem permitir manter uma sessão, recordar escolhas ou medir a navegação. O armazenamento local, designadamente localStorage e sessionStorage, tem características diferentes, mas também pode estar abrangido pelas regras de acesso ao equipamento.",
          "Cookies de sessão terminam normalmente com a sessão do navegador. Cookies persistentes e armazenamento local podem permanecer até à sua expiração, remoção pelo website ou eliminação pelo utilizador. A duração de um token de acesso não é necessariamente a duração da informação de sessão guardada no dispositivo."
        ]
      },
      {
        "id": "seccao-3",
        "number": "3",
        "title": "Necessidade e consentimento",
        "paragraphs": [
          "A utilização de tecnologias estritamente necessárias para transmitir uma comunicação ou prestar um serviço expressamente solicitado pode estar dispensada de consentimento prévio, nos termos do artigo 5.º da Lei n.º 41/2004. A dispensa não elimina o dever de informação nem as obrigações relativas ao tratamento de dados pessoais.",
          "Tecnologias para estatísticas de navegação, publicidade ou personalização que não seja necessária ao serviço solicitado exigem consentimento prévio quando abrangidas pela lei. Permanecem desativadas até uma escolha afirmativa. Continuar a navegar, fazer scroll ou fechar o aviso não constitui consentimento."
        ]
      },
      {
        "id": "seccao-4",
        "number": "4",
        "title": "Categorias de armazenamento",
        "paragraphs": [
          "Necessários: autenticação, manutenção de sessão, proteção do acesso e registo da escolha de cookies, na medida estritamente necessária à funcionalidade solicitada. Não podem ser reutilizados para publicidade sob esta classificação.",
          "Preferências: conservação de escolhas opcionais de interface. A classificação depende da finalidade e da necessidade da escolha expressamente pedida pelo utilizador.",
          "Estatísticas: medição de visitas, eventos e utilização do website através de identificadores. São opcionais e dependem de consentimento prévio.",
          "Marketing: medição publicitária, criação de públicos ou acompanhamento entre websites. São opcionais e dependem de consentimento prévio. A existência de uma categoria no painel não significa que o website utilize tecnologias dessa categoria."
        ]
      },
      {
        "id": "seccao-5",
        "number": "5",
        "title": "Armazenamento identificado na plataforma",
        "paragraphs": [
          "A autenticação integra o cliente Supabase. Na sua configuração habitual de navegador, este cliente conserva informação de sessão em armazenamento local, numa chave cujo formato depende do projeto, geralmente sb seguido da referência do projeto e de auth token. A informação é necessária à continuidade do acesso autenticado; pode persistir entre visitas e deve ser removida quando termine a sessão ou seja eliminada pelo utilizador, de acordo com o funcionamento do serviço.",
          "A chave arynqo_cookie_preferences guarda em armazenamento local a versão do aviso, a escolha sobre estatísticas e as datas de registo e validade. A escolha é válida durante 180 dias neste navegador. Após esse prazo ou uma alteração relevante da versão, é solicitada nova escolha. As preferências da versão anterior, que apenas registavam a leitura do aviso, não autorizam o Google Analytics. O armazenamento local pode permanecer até ser substituído ou eliminado nas definições do navegador.",
          "A chave local arynqo_admin_unlocked é utilizada pelo código para recordar um estado de interface da área administrativa. Não substitui a autenticação nem deve ser tratada como prova de autorização. O armazenamento local não tem uma expiração automática equivalente à de um cookie; a remoção depende da aplicação ou do utilizador.",
          "Google Analytics 4, fornecido pela Google: utilizado apenas após consentimento para medir visitas às páginas públicas. O identificador de medição da ARYNQO é G-14YLDZ820X. Os cookies _ga e _ga_14YLDZ820X distinguem navegadores e conservam informação de sessão. A integração define uma duração máxima de 180 dias, sem prolongamento automático em cada visita; podem expirar antes por decisão do navegador ou ser eliminados pelo utilizador.",
          "A recolha inclui visualizações de páginas, identificadores de navegador e sessão, horários e informação técnica, como navegador, dispositivo, idioma e resolução do ecrã. A comunicação com os servidores da Google envolve o endereço IP, que é usado pelo GA4, nomeadamente para estimar a localização geográfica; segundo a documentação da Google, os endereços IP de utilizadores na União Europeia são descartados antes do registo dos dados e não são armazenados.",
          "A integração envia apenas endereços públicos normalizados, sem parâmetros de pesquisa, fragmentos ou identificadores de vagas e artigos. Não envia nomes, emails, telefones, currículos, candidaturas, resultados de compatibilidade ou conteúdo de formulários. As páginas de autenticação e as áreas reservadas de candidatos, empresas e administração não são medidas. Google Signals e personalização publicitária estão desativados na integração. Não são utilizados cookies de publicidade."
        ]
      },
      {
        "id": "seccao-6",
        "number": "6",
        "title": "Escolha e alteração de preferências",
        "paragraphs": [
          "O aviso permite Aceitar estatísticas, Recusar estatísticas ou Ver preferências. As estatísticas estão desativadas por defeito. O código do Google Analytics e os pedidos de medição só são carregados após uma escolha afirmativa; a recusa mantém a plataforma disponível com os mecanismos necessários. A mera navegação, o scroll e o fecho do painel não autorizam a recolha.",
          "Pode alterar a escolha através de Gerir cookies no rodapé ou do botão disponível na área móvel. No painel, ative ou desative Estatísticas — Google Analytics e selecione Guardar preferências. A retirada remove o componente de medição e elimina os cookies _ga e _ga_ acessíveis neste website. Não apaga dados anteriormente enviados à Google; para exercer direitos sobre esses dados, contacte a CRIATIVALCANCE.",
          "A escolha é recordada durante 180 dias por navegador. A eliminação dos dados do website, a expiração ou uma nova versão do aviso origina novo pedido. Se o navegador impedir a gravação, a escolha é aplicada apenas durante a visita e essa limitação é comunicada."
        ]
      },
      {
        "id": "seccao-7",
        "number": "7",
        "title": "Navegador e dispositivos partilhados",
        "paragraphs": [
          "Pode consultar, bloquear e eliminar cookies através das definições de privacidade do navegador. A remoção de armazenamento local pode exigir eliminar os dados do website, além dos cookies. O bloqueio de mecanismos necessários à autenticação pode impedir o início ou a manutenção da sessão.",
          "As escolhas podem ser específicas de cada navegador e dispositivo. A eliminação dos dados do website pode apagar a preferência registada e originar a apresentação de um novo aviso. Em equipamentos partilhados, termine a sessão antes de os deixar disponíveis a outra pessoa."
        ]
      },
      {
        "id": "seccao-8",
        "number": "8",
        "title": "Terceiros e transferências",
        "paragraphs": [
          "O Google Analytics é um serviço da Google. Para utilizadores no Espaço Económico Europeu, o prestador contratual é a Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlanda. O tratamento pode envolver outras entidades do grupo e infraestrutura fora do Espaço Económico Europeu. Consulte as informações da Google em https://policies.google.com/privacy e sobre o serviço em https://support.google.com/analytics/answer/6004245.",
          "O fundamento para as estatísticas é o consentimento, que pode ser retirado a qualquer momento sem afetar a licitude do tratamento anterior. As transferências internacionais estão sujeitas aos mecanismos e garantias descritos na Política de Privacidade. O prazo de 180 dias refere-se aos cookies e à preferência no navegador; a conservação dos eventos nos servidores da Google depende das definições da propriedade Analytics e não equivale à duração dos cookies.",
          "Pode impedir a recolha pelo serviço através da recusa no aviso, da retirada no painel ou das ferramentas do navegador. A Google disponibiliza também um complemento de desativação em https://tools.google.com/dlpage/gaoptout."
        ]
      },
      {
        "id": "seccao-9",
        "number": "9",
        "title": "Contactos e atualização",
        "paragraphs": [
          "Pode dirigir questões ou pedidos de direitos para info@creativalcance.com. Pode também apresentar reclamação à Comissão Nacional de Proteção de Dados, em https://www.cnpd.pt.",
          "A política será revista quando forem alteradas as finalidades, os prestadores ou os mecanismos de armazenamento. A lista detalhada de tecnologias efetivamente utilizadas, com nome, responsável, finalidade e duração, deve acompanhar a versão publicada e refletir a configuração real do website."
        ]
      }
    ]
  },
  "privacy": {
    "key": "privacy",
    "href": "/politica-de-privacidade",
    "title": "Política de Privacidade",
    "description": "Informação sobre os dados pessoais utilizados pela ARYNQO, as candidaturas, a visibilidade dos perfis e as ferramentas de inteligência artificial.",
    "updatedAt": "30 de setembro de 2026",
    "sections": [
      {
        "id": "seccao-1",
        "number": "1",
        "title": "Âmbito e responsável pelo tratamento",
        "paragraphs": [
          "A presente Política de Privacidade explica o tratamento de dados pessoais na ARYNQO, plataforma de recrutamento e evolução profissional explorada pela CRIATIVALCANCE, UNIPESSOAL LDA. Abrange visitantes, candidatos, estudantes, representantes de empresas e pessoas que contactem o apoio da plataforma. Não constitui uma autorização genérica para tratar dados nem substitui os consentimentos específicos exigidos por lei.",
          "CRIATIVALCANCE, UNIPESSOAL LDA, NIPC 518143350. Avenida Fernão de Magalhães, n.º 481, 2.º andar, sala D, 3000-177 Coimbra, Portugal. Email: info@creativalcance.com. Telefone: +351 913 784 204 (chamada para a rede móvel nacional).",
          "A CRIATIVALCANCE determina as finalidades e os meios do tratamento associado à gestão da ARYNQO. Uma empresa que receba uma candidatura ou dados de um candidato é responsável pelos tratamentos que realiza para o seu próprio processo de recrutamento. Deve identificar-se ao candidato e prestar a informação de privacidade aplicável. A responsabilidade da ARYNQO pelas suas operações mantém-se."
        ]
      },
      {
        "id": "seccao-2",
        "number": "2",
        "title": "Dados recolhidos e respetiva origem",
        "paragraphs": [
          "Os dados são fornecidos pelo utilizador no registo, na edição do perfil, no carregamento de currículo, nas candidaturas e nos contactos com a plataforma. Podem ser produzidos durante a utilização do serviço, como estados de candidatura, pedidos de contacto, notificações e resultados de compatibilidade. As empresas fornecem dados dos seus representantes, informação institucional e requisitos das vagas.",
          "Consoante as funcionalidades utilizadas, são tratados nome, email, telefone, localização, fotografia, identificadores de conta e informação de autenticação; formação, experiência, competências, idiomas, área profissional pretendida, função, senioridade, disponibilidade, modelo de trabalho, regiões preferidas e expectativas salariais; currículo e outros elementos que o utilizador inclua no seu perfil.",
          "No caso de representantes de empresas, são tratados os dados de identificação e contacto profissional, a relação com a organização e os registos de utilização da conta. A denominação, o NIF e os contactos empresariais podem igualmente constituir dados pessoais, designadamente no caso de empresários em nome individual.",
          "Os dados técnicos podem incluir endereço IP, data e hora de acesso, navegador, dispositivo, registos de erro e eventos necessários à segurança e ao funcionamento do serviço. A recolha para análise de navegação ou publicidade através de identificadores não necessários depende de consentimento.",
          "Não inclua no currículo números de documentos de identificação, dados bancários, informações de saúde, convicções religiosas ou políticas, filiação sindical, dados sobre vida sexual ou antecedentes criminais que não sejam necessários. A ARYNQO não necessita destes elementos para criar uma conta ou calcular compatibilidade profissional. Os dados de terceiros, como referências profissionais, só devem ser enviados com legitimidade e informação adequada aos respetivos titulares."
        ]
      },
      {
        "id": "seccao-3",
        "number": "3",
        "title": "Finalidades e fundamentos jurídicos",
        "paragraphs": [
          "A criação e gestão da conta, a autenticação, a disponibilização do perfil, o processamento de candidaturas e as recomendações profissionais solicitadas pelo utilizador assentam na execução do contrato de utilização da plataforma ou em diligências pré-contratuais a seu pedido, na medida em que o tratamento seja objetivamente necessário à funcionalidade escolhida.",
          "A gestão dos representantes de clientes empresariais, a segurança, a prevenção de abuso, a resolução de problemas e a defesa de direitos podem assentar em interesses legítimos da CRIATIVALCANCE, após ponderação dos direitos das pessoas afetadas. Este fundamento não dispensa o consentimento exigido para cookies ou comunicações promocionais.",
          "O cumprimento de obrigações legais fundamenta os tratamentos impostos por legislação fiscal, contabilística, de proteção de dados ou de cooperação com autoridades. O consentimento é utilizado para finalidades opcionais que dele dependam, incluindo comunicações promocionais e tecnologias não necessárias.",
          "Os pedidos de contacto relacionados com a utilização do serviço são tratados para prestar apoio e executar a relação contratual. Outros pedidos são tratados com base no interesse legítimo em responder ao interlocutor ou, quando aplicável, para diligências pré-contratuais a seu pedido.",
          "Os campos obrigatórios são identificados nos formulários. A falta de um dado necessário pode impedir a criação de conta ou a utilização de uma funcionalidade concreta. Os campos opcionais não condicionam o acesso a funcionalidades que deles não dependam."
        ]
      },
      {
        "id": "seccao-4",
        "number": "4",
        "title": "Candidaturas e visibilidade perante empresas",
        "paragraphs": [
          "A submissão de uma candidatura implica disponibilizar à empresa responsável pela vaga os dados profissionais e os contactos necessários à avaliação e ao acompanhamento da candidatura, incluindo o currículo quando associado ao perfil. Antes de se candidatar, verifique o conteúdo do seu perfil e do ficheiro enviado.",
          "Fora de uma candidatura, a plataforma distingue a apresentação de uma síntese profissional do acesso ao perfil completo e aos contactos. Nas recomendações de compatibilidade, essa síntese pode incluir título profissional, localização, área pretendida, senioridade, modelo de trabalho e tipo de talento, sem disponibilizar automaticamente nome, email, fotografia ou currículo.",
          "Quando o candidato escolhe contactos abertos, o perfil completo pode ser disponibilizado à empresa associada a uma vaga com correspondência. Na opção que exige aprovação, a empresa envia um pedido e o candidato decide se o aceita. A candidatura direta constitui uma via própria de acesso e não fica dependente da aprovação de um pedido de contacto separado.",
          "A alteração posterior de visibilidade limita novos acessos de acordo com a configuração aplicável, mas não recupera documentos já legitimamente descarregados por uma empresa. Para exercer direitos sobre cópias conservadas pela empresa, pode contactar essa entidade. A CRIATIVALCANCE presta apoio na identificação do destinatário quando necessário."
        ]
      },
      {
        "id": "seccao-5",
        "number": "5",
        "title": "Inteligência artificial e compatibilidade profissional",
        "paragraphs": [
          "A ARYNQO utiliza processamento automatizado para estruturar informação curricular, apoiar a elaboração de perfis e vagas e comparar dados profissionais com requisitos de oportunidades. Na extração de um currículo, o ficheiro e o seu conteúdo podem ser enviados ao prestador de inteligência artificial OpenAI. As sugestões devem ser revistas pelo utilizador antes de serem utilizadas.",
          "O cálculo de compatibilidade considera a informação disponível sobre competências, experiência, área profissional e requisitos da vaga, podendo atender a preferências de localização, modelo de trabalho, disponibilidade e remuneração quando esses elementos façam parte da comparação. A falta de informação, diferenças de terminologia ou erros na extração podem alterar o resultado.",
          "Uma pontuação expressa uma estimativa de adequação aos critérios analisados. Não é uma probabilidade de contratação nem certifica competências, identidade ou desempenho futuro. A ordenação de resultados pode influenciar a visibilidade das oportunidades e dos candidatos; não deve ser utilizada como único critério para excluir ou selecionar pessoas.",
          "As decisões de contratação cabem às empresas. O modelo de utilização previsto para a ARYNQO não inclui a rejeição ou contratação baseada exclusivamente numa decisão automatizada com efeitos jurídicos ou de importância semelhante. Uma utilização desta natureza exigiria análise própria, fundamento admissível e as garantias previstas no artigo 22.º do RGPD.",
          "O utilizador pode pedir esclarecimentos sobre os dados e critérios usados, corrigir informação inexata e solicitar apreciação humana de um resultado que o afete. Não se devem inferir características sensíveis a partir do currículo ou da fotografia para determinar a compatibilidade. Os dados curriculares não devem ser reutilizados para desenvolver ou treinar modelos para finalidades diferentes sem análise e informação próprias."
        ]
      },
      {
        "id": "seccao-6",
        "number": "6",
        "title": "Notificações e comunicações promocionais",
        "paragraphs": [
          "Confirmação de conta, recuperação de acesso, alterações de candidatura, pedidos de contacto e outras mensagens necessárias ao serviço são comunicações operacionais. As preferências disponibilizadas na conta permitem gerir os alertas opcionais. A desativação de alertas não impede o envio de mensagens indispensáveis à segurança ou a uma obrigação legal.",
          "Newsletters e publicidade por email dependem do fundamento permitido pela legislação aplicável e, quando exigido, de consentimento separado. A criação de conta, a leitura desta política e a candidatura a uma vaga não equivalem a uma subscrição promocional. É possível retirar o consentimento e cancelar os envios através do mecanismo indicado na mensagem ou por contacto com a CRIATIVALCANCE."
        ]
      },
      {
        "id": "seccao-7",
        "number": "7",
        "title": "Destinatários e serviços tecnológicos",
        "paragraphs": [
          "Os destinatários incluem as empresas às quais o candidato se apresenta ou concede acesso, colaboradores autorizados da CRIATIVALCANCE, prestadores tecnológicos e profissionais que apoiam o serviço e autoridades quando exista obrigação legal ou pedido legítimo. Não é autorizada a venda de dados curriculares nem a sua utilização pelas empresas para campanhas alheias ao recrutamento.",
          "O código da plataforma integra Supabase para autenticação, base de dados e armazenamento, OpenAI para funções de inteligência artificial e Resend para notificações por email. O alojamento e a infraestrutura de disponibilização do website envolvem a Vercel, conforme a configuração operacional adotada. A utilização efetiva de cada prestador depende da funcionalidade e da configuração em serviço.",
          "Com o seu consentimento para estatísticas, a Google recebe dados de navegação nas páginas públicas através do Google Analytics 4. Estes dados incluem identificadores de navegador e sessão, páginas normalizadas e informação técnica. A integração não envia dados de conta, currículos, contactos ou candidaturas e não mede as áreas reservadas. As finalidades, cookies, durações e formas de retirada são descritas na Política de Cookies. A recusa não impede a utilização da ARYNQO.",
          "Quando atuam como subcontratantes, os prestadores devem tratar dados mediante instruções documentadas e contrato adequado. Nos tratamentos em que um prestador ou uma empresa destinatária atue como responsável autónomo, aplicam-se também as informações que essa entidade deve fornecer. Os acessos devem limitar-se aos dados necessários à finalidade concreta."
        ]
      },
      {
        "id": "seccao-8",
        "number": "8",
        "title": "Transferências internacionais",
        "paragraphs": [
          "Alguns prestadores podem tratar dados ou permitir acessos a partir de países fora do Espaço Económico Europeu. A localização do servidor principal não exclui, por si só, uma transferência internacional por suporte ou outros serviços.",
          "Quando ocorra uma transferência, devem aplicar-se os mecanismos admitidos pelo capítulo V do RGPD: uma decisão de adequação aplicável ou garantias adequadas, nomeadamente cláusulas contratuais tipo, acompanhadas da avaliação e das medidas adicionais necessárias. Não se presume a cobertura de um prestador por uma certificação ou decisão de adequação sem verificar o seu âmbito.",
          "Pode pedir informação sobre os países envolvidos e uma cópia ou descrição das garantias aplicáveis através dos contactos indicados nesta política, com salvaguarda de informação confidencial que não seja necessária ao exercício dos seus direitos."
        ]
      },
      {
        "id": "seccao-9",
        "number": "9",
        "title": "Conservação e apagamento",
        "paragraphs": [
          "Os dados da conta e do perfil são conservados enquanto necessários à disponibilização do serviço solicitado. A manutenção de uma conta não justifica conservar indefinidamente todos os dados produzidos durante a sua utilização. As candidaturas, os pedidos de contacto e os resultados de compatibilidade devem ser eliminados ou anonimizados quando deixem de ser necessários à finalidade que motivou o seu tratamento.",
          "Após um pedido de apagamento ou encerramento de conta, os dados que não tenham outro fundamento de conservação devem ser eliminados. Podem ser conservados separadamente os elementos estritamente necessários ao cumprimento de uma obrigação legal, à resolução de um litígio ou à defesa de direitos, durante o prazo aplicável e com acesso limitado.",
          "Os pedidos de apoio são conservados pelo tempo necessário à resposta e ao acompanhamento. Os registos técnicos são conservados de forma proporcional às necessidades de segurança e diagnóstico. As provas de consentimento e de retirada são conservadas enquanto necessárias à demonstração do cumprimento das obrigações legais.",
          "O apagamento em sistemas de produção e em cópias de segurança pode ocorrer em momentos diferentes. As cópias de segurança devem permanecer protegidas e sujeitas ao respetivo ciclo de substituição; uma reposição não deve reativar dados cuja eliminação tenha sido determinada. A empresa destinatária de uma candidatura define e comunica os seus próprios critérios de conservação."
        ]
      },
      {
        "id": "seccao-10",
        "number": "10",
        "title": "Segurança e incidentes",
        "paragraphs": [
          "A CRIATIVALCANCE deve aplicar medidas técnicas e organizativas proporcionais aos riscos, incluindo controlo de acessos, autenticação, limitação de permissões e proteção dos ficheiros curriculares. As medidas são revistas à medida que a plataforma evolui; não existe garantia absoluta de ausência de falhas.",
          "O utilizador deve proteger as credenciais, evitar partilhar a conta e comunicar acessos suspeitos. Quando uma violação de dados pessoais exigir comunicação à autoridade de controlo ou aos titulares, a CRIATIVALCANCE procede de acordo com os requisitos e prazos legais."
        ]
      },
      {
        "id": "seccao-11",
        "number": "11",
        "title": "Direitos e reclamações",
        "paragraphs": [
          "Nos termos e limites do RGPD, pode pedir acesso, retificação, apagamento, limitação do tratamento e portabilidade dos dados, bem como opor-se a tratamentos baseados em interesses legítimos. Pode retirar consentimentos a qualquer momento, sem afetar a licitude do tratamento realizado antes da retirada. A oposição a marketing direto abrange a definição de perfis associada a essa finalidade.",
          "Envie o pedido para info@creativalcance.com ou para a morada postal indicada no início, identificando a conta e o direito pretendido. Só serão solicitados elementos adicionais de identificação quando necessários e proporcionais. A resposta é prestada, em regra, no prazo de um mês; uma prorrogação legalmente admissível será comunicada e fundamentada.",
          "Pode apresentar reclamação à Comissão Nacional de Proteção de Dados, em https://www.cnpd.pt, ou à autoridade de controlo competente. O exercício destes direitos não depende da utilização prévia do Livro de Reclamações."
        ]
      },
      {
        "id": "seccao-12",
        "number": "12",
        "title": "Cookies menores e atualizações",
        "paragraphs": [
          "A Política de Cookies descreve o armazenamento no dispositivo e a gestão de preferências. Consentimentos relativos a cookies são separados dos consentimentos para comunicações promocionais.",
          "A utilização da plataforma por menores exige uma apreciação da idade e da capacidade aplicáveis à funcionalidade. A possibilidade legal de um menor consentir determinados tratamentos não equivale a capacidade para celebrar qualquer contrato. A recolha de dados de menores deve limitar-se ao necessário e, quando exigível, envolver o respetivo representante legal.",
          "Alterações relevantes à política serão comunicadas de forma adequada e publicadas com indicação da data. Uma nova finalidade que exija consentimento não será legitimada apenas pela atualização do texto. A futura aplicação móvel será acompanhada de informação própria sobre permissões, notificações e tecnologias específicas antes da sua disponibilização."
        ]
      }
    ]
  },
  "legal": {
    "key": "legal",
    "href": "/aviso-legal",
    "title": "Aviso Legal",
    "description": "Identificação da entidade responsável pela ARYNQO e condições gerais de acesso e utilização da plataforma.",
    "updatedAt": "30 de setembro de 2026",
    "sections": [
      {
        "id": "seccao-1",
        "number": "1",
        "title": "Titular e contactos",
        "paragraphs": [
          "A ARYNQO é uma plataforma digital explorada pela CRIATIVALCANCE, UNIPESSOAL LDA. Este Aviso Legal regula o acesso ao website e a utilização das suas funcionalidades gerais, sem substituir condições particulares de serviços contratados.",
          "CRIATIVALCANCE, UNIPESSOAL LDA, NIPC 518143350. Avenida Fernão de Magalhães, n.º 481, 2.º andar, sala D, 3000-177 Coimbra, Portugal. Email: info@creativalcance.com. Telefone: +351 913 784 204 (chamada para a rede móvel nacional)."
        ]
      },
      {
        "id": "seccao-2",
        "number": "2",
        "title": "Natureza da plataforma",
        "paragraphs": [
          "A ARYNQO aproxima candidatos, estudantes e empresas através de perfis profissionais, publicação e consulta de vagas, candidaturas e ferramentas de apoio à compatibilidade e evolução profissional. As funcionalidades disponibilizadas podem variar conforme o tipo de conta e o plano aplicável.",
          "A disponibilização destas ferramentas não faz da CRIATIVALCANCE o empregador do candidato nem garante a existência de uma oferta adequada, uma entrevista, a seleção ou a contratação. A empresa que publica uma vaga é responsável pela veracidade e legalidade da oportunidade, pelas condições de trabalho anunciadas e pelas suas decisões de recrutamento.",
          "A informação da Academia e os conteúdos gerados com apoio de inteligência artificial têm natureza informativa. Não substituem aconselhamento profissional individual nem constituem certificação académica ou profissional, salvo indicação expressa e verificável no serviço concreto."
        ]
      },
      {
        "id": "seccao-3",
        "number": "3",
        "title": "Registo e acesso",
        "paragraphs": [
          "Algumas áreas são acessíveis sem registo; as funcionalidades reservadas exigem uma conta e autenticação. O utilizador deve fornecer informação correta, manter os dados atualizados e utilizar apenas contas para as quais disponha de autorização. Os representantes de empresas devem ter legitimidade para agir em nome das organizações indicadas.",
          "O utilizador deve proteger as credenciais e comunicar utilização indevida. A CRIATIVALCANCE pode restringir acessos necessários à segurança ou à investigação de abuso, de forma proporcional e com informação ao utilizador quando legalmente admissível.",
          "A utilização por menores está sujeita à idade, capacidade e autorizações legalmente exigidas para o serviço concreto. A aceitação destas condições não elimina essas exigências."
        ]
      },
      {
        "id": "seccao-4",
        "number": "4",
        "title": "Regras de utilização",
        "paragraphs": [
          "Não é permitida a publicação de vagas fictícias, discriminatórias, enganosas ou destinadas a recolher dados para finalidades incompatíveis com o recrutamento. É igualmente proibido pedir pagamentos indevidos aos candidatos, usurpar identidade, divulgar dados de terceiros sem legitimidade ou carregar conteúdos ilícitos.",
          "Não é permitida a extração massiva de currículos ou contactos, a contornação de controlos de acesso, a utilização das contas para spam, a introdução de código malicioso ou a exploração não autorizada de vulnerabilidades. Os dados obtidos através da ARYNQO não podem ser usados para publicidade alheia ao processo de recrutamento.",
          "A empresa deve avaliar candidaturas por critérios relacionados com a função e respeitar a legislação laboral, a igualdade de tratamento e a proteção de dados. O candidato deve confirmar a identidade da empresa e as condições apresentadas antes de assumir compromissos fora da plataforma."
        ]
      },
      {
        "id": "seccao-5",
        "number": "5",
        "title": "Conteúdos e propriedade intelectual",
        "paragraphs": [
          "O logótipo, os elementos gráficos, a estrutura e os conteúdos próprios da ARYNQO encontram-se protegidos pelos direitos aplicáveis da CRIATIVALCANCE ou dos respetivos titulares. A sua reprodução, adaptação ou exploração depende de autorização ou de uma utilização legalmente permitida. Não se declara neste aviso um registo de marca que não tenha sido confirmado.",
          "O utilizador conserva os direitos sobre os conteúdos que fornece. Autoriza apenas as operações necessárias à disponibilização da funcionalidade solicitada, como armazenar, apresentar, estruturar e transmitir o currículo à empresa destinatária da candidatura ou do acesso autorizado. Esta autorização não atribui à ARYNQO a propriedade do currículo nem legitima a sua exploração para fins alheios ao serviço.",
          "Quem carrega textos, imagens, logótipos ou ficheiros deve dispor dos direitos e autorizações necessários. Ligações para o website são permitidas quando não criem uma aparência falsa de parceria ou patrocínio nem violem direitos de terceiros."
        ]
      },
      {
        "id": "seccao-6",
        "number": "6",
        "title": "Compatibilidade e ferramentas de inteligência artificial",
        "paragraphs": [
          "As recomendações e pontuações de compatibilidade apoiam a análise de perfis e vagas. Dependem dos dados disponíveis e dos critérios aplicados e podem conter erros ou omissões. Uma pontuação não equivale a uma probabilidade de contratação e não deve constituir o único fundamento de uma decisão de seleção.",
          "O utilizador deve rever textos e campos preenchidos a partir de um currículo ou gerados por inteligência artificial. A empresa deve assegurar apreciação humana adequada dos candidatos e não utilizar características sensíveis ou critérios discriminatórios. A Política de Privacidade descreve o tratamento de dados associado a estas ferramentas."
        ]
      },
      {
        "id": "seccao-7",
        "number": "7",
        "title": "Serviços pagos e condições particulares",
        "paragraphs": [
          "O acesso às funcionalidades não pressupõe que todos os serviços sejam gratuitos. Quando seja disponibilizado um serviço pago, o preço, impostos, duração, renovação, cancelamento e demais condições devem ser apresentados antes da contratação.",
          "Uma compra ou subscrição exige condições próprias, incluindo a informação legal aplicável e, quando exista uma relação de consumo, os direitos de livre resolução e as respetivas exceções. Este Aviso Legal não substitui essas condições nem estabelece antecipadamente uma renúncia a direitos do consumidor."
        ]
      },
      {
        "id": "seccao-8",
        "number": "8",
        "title": "Moderação e comunicação de irregularidades",
        "paragraphs": [
          "Conteúdos ou condutas suspeitas podem ser comunicados para info@creativalcance.com, com indicação da vaga, perfil ou ligação afetados e dos motivos da comunicação. Evite enviar dados pessoais que não sejam necessários à análise.",
          "A CRIATIVALCANCE pode solicitar esclarecimentos, limitar conteúdos ou suspender uma conta quando exista fundamento legal ou incumprimento destas regras. Deve atuar de forma proporcional, fundamentar a decisão quando exigível e permitir ao utilizador apresentar esclarecimentos. As obrigações legais específicas de denúncia, moderação e impugnação aplicáveis ao serviço prevalecem."
        ]
      },
      {
        "id": "seccao-9",
        "number": "9",
        "title": "Disponibilidade e responsabilidade",
        "paragraphs": [
          "A CRIATIVALCANCE procura manter o serviço disponível e corrigir falhas, mas podem ocorrer interrupções de manutenção, problemas técnicos ou incidentes de terceiros. Alterações a funcionalidades contratadas devem respeitar as condições acordadas e a legislação aplicável.",
          "A responsabilidade por conteúdos de utilizadores e por atos de terceiros é apreciada nos termos legais. A CRIATIVALCANCE não exclui a responsabilidade pelos seus próprios atos quando a lei não o permita, nem limita direitos imperativos de consumidores ou titulares de dados.",
          "As ligações externas conduzem a serviços sujeitos às condições dos respetivos titulares. A sua presença não constitui garantia dos conteúdos ou das práticas desses serviços. O utilizador deve consultar a informação aplicável antes de transmitir dados ou realizar operações."
        ]
      },
      {
        "id": "seccao-10",
        "number": "10",
        "title": "Privacidade e cookies",
        "paragraphs": [
          "Os dados pessoais são tratados nos termos da Política de Privacidade. O armazenamento no equipamento do utilizador é descrito na Política de Cookies. A mera navegação ou aceitação deste Aviso Legal não constitui consentimento para publicidade, cookies não necessários ou utilizações adicionais dos dados curriculares."
        ]
      },
      {
        "id": "seccao-11",
        "number": "11",
        "title": "Reclamações e arbitragem em Portugal",
        "paragraphs": [
          "Pode contactar a CRIATIVALCANCE pelos meios indicados neste aviso. O Livro de Reclamações Eletrónico português está disponível em https://www.livroreclamacoes.pt/Inicio/. Este canal não substitui os direitos de recorrer a autoridades, tribunais ou entidades de resolução alternativa de litígios.",
          "Quando exista um litígio de consumo abrangido pela respetiva competência, o consumidor pode recorrer ao Centro de Arbitragem de Conflitos de Consumo da Região de Coimbra, Avenida Fernão de Magalhães, n.º 240, 1.º andar, 3000-172 Coimbra; email geral@cacrc.pt; telefone 239 821 289; website https://cacrc.pt/.",
          "Consoante o âmbito territorial e material do conflito, pode ser competente outra entidade de resolução alternativa de litígios portuguesa. O CNIACC, Centro Nacional de Informação e Arbitragem de Conflitos de Consumo, disponibiliza informação em https://www.cniacc.pt. A lista oficial das entidades pode ser consultada junto da Direção-Geral do Consumidor, em https://www.consumidor.gov.pt.",
          "A referência a um centro não constitui declaração de adesão voluntária da CRIATIVALCANCE. Mantêm-se os casos de arbitragem legalmente obrigatória e a competência da entidade para apreciar o conflito. Estes mecanismos de consumo não se aplicam automaticamente a contratos celebrados entre empresas para fins profissionais."
        ]
      },
      {
        "id": "seccao-12",
        "number": "12",
        "title": "Lei aplicável tribunais e alterações",
        "paragraphs": [
          "Aplica-se a legislação portuguesa, sem prejuízo das normas imperativas de proteção do consumidor e das regras de direito internacional privado que sejam aplicáveis. Os litígios são apreciados pelos tribunais portugueses legalmente competentes quando as regras de competência o determinem.",
          "Nas relações profissionais em que seja admissível uma convenção de competência, poderá ser acordado o foro da comarca de Coimbra em condições particulares. Este aviso não impõe aos consumidores um foro exclusivo que restrinja os seus direitos.",
          "A versão atualizada deste aviso será disponibilizada com a data de revisão. Alterações relevantes a contratos em vigor respeitarão os deveres de comunicação, os direitos de cancelamento e as restantes exigências aplicáveis."
        ]
      }
    ]
  }
};
