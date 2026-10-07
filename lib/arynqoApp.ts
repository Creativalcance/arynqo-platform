export type AppRole =
  | "student"
  | "professional"
  | "candidate"
  | "company"
  | "recruiter"
  | "academy"
  | "university"
  | "school"
  | "admin"
  | "unknown";

export type AppMode =
  | "talent"
  | "company"
  | "recruiter"
  | "education"
  | "admin"
  | "public";

export type AppModeConfig = {
  mode: AppMode;
  roleLabel: string;
  heroTitle: string;
  modeLabel: string;
  modeDescription: string;
  scoreLabel: string;
  featuredTitle: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export type AppAction = {
  title: string;
  description: string;
  href: string;
};

export function normalizeAppRole(role: string | null | undefined): AppRole {
  const normalizedRole = role?.trim().toLowerCase();

  if (!normalizedRole) {
    return "unknown";
  }

  if (
    normalizedRole === "student" ||
    normalizedRole === "estudante" ||
    normalizedRole === "talent" ||
    normalizedRole === "talento"
  ) {
    return "student";
  }

  if (normalizedRole === "professional" || normalizedRole === "profissional") {
    return "professional";
  }

  if (normalizedRole === "candidate" || normalizedRole === "candidato") {
    return "candidate";
  }

  if (
    normalizedRole === "company" ||
    normalizedRole === "empresa" ||
    normalizedRole === "employer" ||
    normalizedRole === "empregador"
  ) {
    return "company";
  }

  if (
    normalizedRole === "recruiter" ||
    normalizedRole === "recrutador" ||
    normalizedRole === "rh" ||
    normalizedRole === "hr"
  ) {
    return "recruiter";
  }

  if (normalizedRole === "academy" || normalizedRole === "academia") {
    return "academy";
  }

  if (normalizedRole === "university" || normalizedRole === "universidade") {
    return "university";
  }

  if (normalizedRole === "school" || normalizedRole === "escola") {
    return "school";
  }

  if (normalizedRole === "admin" || normalizedRole === "administrator") {
    return "admin";
  }

  return "unknown";
}

export function getAppModeFromRole(role: string | null | undefined): AppMode {
  const appRole = normalizeAppRole(role);

  if (
    appRole === "student" ||
    appRole === "professional" ||
    appRole === "candidate"
  ) {
    return "talent";
  }

  if (appRole === "company") {
    return "company";
  }

  if (appRole === "recruiter") {
    return "recruiter";
  }

  if (
    appRole === "academy" ||
    appRole === "university" ||
    appRole === "school"
  ) {
    return "education";
  }

  if (appRole === "admin") {
    return "admin";
  }

  return "public";
}

export function getRoleLabel(role: string | null | undefined): string {
  const appRole = normalizeAppRole(role);

  switch (appRole) {
    case "student":
      return "Estudante";
    case "professional":
      return "Profissional";
    case "candidate":
      return "Candidato";
    case "company":
      return "Empresa";
    case "recruiter":
      return "Recrutador";
    case "academy":
      return "Academy";
    case "university":
      return "Universidade";
    case "school":
      return "Escola";
    case "admin":
      return "Administrador";
    default:
      return "Visitante";
  }
}

export function getAppModeConfig(
  role: string | null | undefined,
  hasSession: boolean,
): AppModeConfig {
  if (!hasSession) {
    return {
      mode: "public",
      roleLabel: "Visitante",
      heroTitle: "A tua carreira, guiada por IA.",
      modeLabel: "Experiência pública",
      modeDescription:
        "Explora vagas, ARYNQO Academy e matching inteligente. Entra ou cria conta para desbloqueares recomendações personalizadas.",
      scoreLabel: "Potencial ARYNQO",
      featuredTitle: "Oportunidades em destaque",
      primaryHref: "/registo",
      primaryLabel: "Criar conta",
      secondaryHref: "/login",
      secondaryLabel: "Entrar",
    };
  }

  const mode = getAppModeFromRole(role);
  const roleLabel = getRoleLabel(role);

  if (mode === "company") {
    return {
      mode,
      roleLabel,
      heroTitle: "Recrutamento inteligente, sem ruído.",
      modeLabel: "Modo empresa ativo",
      modeDescription:
        "A ARYNQO ajuda a tua empresa a identificar talento com maior compatibilidade técnica, comportamental, cultural e estratégica.",
      scoreLabel: "Score de recrutamento",
      featuredTitle: "Candidatos em destaque",
      primaryHref: "/empresa/vagas/nova",
      primaryLabel: "Publicar vaga",
      secondaryHref: "/empresa/matches",
      secondaryLabel: "Ver matches",
    };
  }

  if (mode === "recruiter") {
    return {
      mode,
      roleLabel,
      heroTitle: "Recrutamento com inteligência aplicada.",
      modeLabel: "Modo recrutador ativo",
      modeDescription:
        "Analisa vagas, candidatos, shortlists e recomendações de IA para acelerar decisões de recrutamento.",
      scoreLabel: "Score de matching",
      featuredTitle: "Shortlist inteligente",
      primaryHref: "/app/matches",
      primaryLabel: "Ver matches",
      secondaryHref: "/app/vagas",
      secondaryLabel: "Ver vagas",
    };
  }

  if (mode === "education") {
    return {
      mode,
      roleLabel,
      heroTitle: "ARYNQO Academy e talento em evolução.",
      modeLabel: "Modo Academy ativo",
      modeDescription:
        "A ARYNQO Academy liga conhecimento, empregabilidade, talento, empresas, IA e evolução profissional.",
      scoreLabel: "Score de empregabilidade",
      featuredTitle: "Conteúdos e oportunidades",
      primaryHref: "/app/academia",
      primaryLabel: "Abrir Academy",
      secondaryHref: "/app/vagas",
      secondaryLabel: "Ver vagas",
    };
  }

  if (mode === "admin") {
    return {
      mode,
      roleLabel,
      heroTitle: "Visão global da plataforma.",
      modeLabel: "Modo administrador ativo",
      modeDescription:
        "Acompanha utilizadores, empresas, candidatos, vagas, matches, Academy e atividade da IA.",
      scoreLabel: "Score global ARYNQO",
      featuredTitle: "Indicadores da plataforma",
      primaryHref: "/dashboard",
      primaryLabel: "Abrir dashboard",
      secondaryHref: "/app/academia",
      secondaryLabel: "Ver Academy",
    };
  }

  return {
    mode: "talent",
    roleLabel,
    heroTitle: "A tua carreira, guiada por IA.",
    modeLabel: "Modo talento ativo",
    modeDescription:
      "A ARYNQO cruza competências, experiência, objetivos, localização, salário esperado, cultura profissional e dados de IA para sugerir oportunidades com maior probabilidade de encaixe.",
    scoreLabel: "Score de empregabilidade",
    featuredTitle: "Melhores vagas",
    primaryHref: "/app/vagas",
    primaryLabel: "Ver oportunidades",
    secondaryHref: "/app/matches",
    secondaryLabel: "Ver matches",
  };
}

export function getAppActions(
  role: string | null | undefined,
  hasSession: boolean,
): AppAction[] {
  const config = getAppModeConfig(role, hasSession);

  if (!hasSession) {
    return [
      {
        title: "Criar conta",
        description:
          "Começa a usar a ARYNQO para desbloquear matching inteligente e recomendações personalizadas.",
        href: "/registo",
      },
      {
        title: "Explorar ARYNQO Academy",
        description:
          "Consulta conteúdos sobre talento, empregabilidade, carreira, IA e recrutamento.",
        href: "/app/academia",
      },
      {
        title: "Entrar",
        description:
          "Acede à tua conta para veres perfil, oportunidades, matches e recomendações IA.",
        href: "/login",
      },
    ];
  }

  if (config.mode === "company") {
    return [
      {
        title: "Publicar vaga",
        description:
          "Cria uma oportunidade e deixa a IA analisar compatibilidade com talento disponível.",
        href: "/empresa/vagas",
      },
      {
        title: "Ver candidatos compatíveis",
        description:
          "Analisa perfis com maior probabilidade de encaixe técnico, comportamental e cultural.",
        href: "/app/matches",
      },
      {
        title: "Abrir ARYNQO Academy",
        description:
          "Consulta conteúdos de apoio a recrutamento, talento, liderança e employer branding.",
        href: "/app/academia",
      },
    ];
  }

  if (config.mode === "recruiter") {
    return [
      {
        title: "Analisar matches",
        description:
          "Consulta recomendações de IA para identificar candidatos mais alinhados com as vagas.",
        href: "/app/matches",
      },
      {
        title: "Ver vagas ativas",
        description:
          "Acompanha oportunidades, requisitos e compatibilidade com perfis disponíveis.",
        href: "/app/vagas",
      },
      {
        title: "Abrir ARYNQO Academy",
        description:
          "Consulta conteúdos sobre recrutamento, IA, seleção e desenvolvimento de talento.",
        href: "/app/academia",
      },
    ];
  }

  if (config.mode === "education") {
    return [
      {
        title: "Abrir ARYNQO Academy",
        description:
          "Acede aos conteúdos da Academy ligados a empregabilidade, carreira, talento e mercado.",
        href: "/app/academia",
      },
      {
        title: "Ver oportunidades",
        description:
          "Consulta vagas reais publicadas na plataforma e ligadas ao ecossistema ARYNQO.",
        href: "/app/vagas",
      },
      {
        title: "Abrir área académica",
        description:
          "Acede à área web da academia para gestão completa de conteúdos e dados.",
        href: "/academia",
      },
    ];
  }

  if (config.mode === "admin") {
    return [
      {
        title: "Abrir dashboard",
        description:
          "Acede à visão global da plataforma, utilizadores, vagas, empresas e atividade.",
        href: "/dashboard",
      },
      {
        title: "Gerir ARYNQO Academy",
        description:
          "Acede à área administrativa da Academy para conteúdos e gestão.",
        href: "/admin/academia",
      },
      {
        title: "Ver matches IA",
        description:
          "Consulta dados de compatibilidade e recomendações geradas pela plataforma.",
        href: "/app/matches",
      },
    ];
  }

  return [
    {
      title: "Completar perfil",
      description:
        "Aumenta a qualidade do matching com dados profissionais, skills e objetivos.",
      href: "/app/perfil",
    },
    {
      title: "Ver oportunidades",
      description:
        "Explora vagas reais alinhadas com o teu percurso e potencial profissional.",
      href: "/app/vagas",
    },
    {
      title: "Abrir ARYNQO Academy",
      description:
        "Consulta conteúdos para evolução de carreira, empregabilidade e desenvolvimento profissional.",
      href: "/app/academia",
    },
  ];
}