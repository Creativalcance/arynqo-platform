import { expect, test, type Page } from "@playwright/test";
const userId = "00000000-0000-4000-8000-000000000001";
const candidateId = "00000000-0000-4000-8000-000000000002";
const jobId = "00000000-0000-4000-8000-000000000003";
const applicationId = "00000000-0000-4000-8000-000000000004";
const job = {
  id: jobId,
  title: "Gestor de projetos",
  description: "Vaga de teste para validar o percurso de candidatura.",
  area: "Gestão",
  location: "Coimbra",
  country_code: "PT",
  work_model: "Híbrido",
  work_mode: "hybrid",
  contract_type: "Tempo inteiro",
  opportunity_type: null,
  salary_range: null,
  required_skills: ["Gestão de projetos"],
  is_active: true,
  renewal_deadline: null,
  created_at: "2026-10-01T10:00:00Z",
  company_profiles: { company_name: "Empresa de teste", logo_url: null },
};

async function backend(
  page: Page,
  options: {
    duplicate?: boolean;
    failStatus?: boolean;
    role?: string;
    closed?: boolean;
  } = {},
) {
  const state = {
    sent: false,
    posts: 0,
    failJobs: false,
    queries: [] as string[],
  };
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: "candidato@example.invalid",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-10-01T00:00:00Z",
  };
  // All API traffic is intercepted. Nothing is written to a live Supabase project.
  await page.route("https://*.supabase.co/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const respond = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: {
          "x-supabase-api-version": "2024-01-01",
          "access-control-expose-headers": "x-supabase-api-version",
        },
        body: JSON.stringify(data),
      });
    if (url.pathname === "/auth/v1/token") {
      const data = req.postDataJSON();
      if (data.password !== "test-password")
        return respond(
          { code: "invalid_credentials", msg: "Invalid login credentials" },
          400,
        );
      const jwt = `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test`;
      return respond({
        access_token: jwt,
        refresh_token: "test-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user,
      });
    }
    if (url.pathname === "/auth/v1/user") return respond(user);
    if (url.pathname === "/auth/v1/logout")
      return route.fulfill({ status: 204 });
    if (url.pathname === "/rest/v1/profiles")
      return respond({
        id: userId,
        name: "Candidato de teste",
        role: options.role || "student",
        locale: "pt",
      });
    if (url.pathname === "/rest/v1/student_profiles")
      return respond({
        id: candidateId,
        headline: "Gestão de projetos",
        location: "Coimbra",
        cv_url: null,
        cv_file_url: null,
      });
    if (url.pathname === "/rest/v1/jobs") {
      state.queries.push(url.search);
      if (state.failJobs) return respond({ message: "Offline" }, 503);
      const current = options.closed ? { ...job, is_active: false } : job;
      return respond(
        url.searchParams.has("id")
          ? current
          : url.search.includes("inexistente") ||
              (url.searchParams.has("country_code") &&
                url.searchParams.get("country_code") !== "eq.PT")
            ? []
            : [current],
      );
    }
    if (url.pathname === "/rest/v1/applications") {
      if (req.method() === "POST") {
        state.posts++;
        expect(req.postDataJSON()).toEqual({
          job_id: jobId,
          student_id: candidateId,
        });
        state.sent = true;
        if (options.duplicate)
          return respond({ code: "23505", message: "Duplicate" }, 409);
        return respond({ id: applicationId, status: "pending" }, 201);
      }
      if (options.failStatus) return respond({ message: "Unavailable" }, 503);
      if (url.searchParams.has("job_id"))
        return respond(
          state.sent ? { id: applicationId, status: "pending" } : null,
        );
      return respond(
        state.sent
          ? [
              {
                id: applicationId,
                job_id: jobId,
                status: "pending",
                created_at: "2026-10-02T12:00:00Z",
                jobs: job,
              },
            ]
          : [],
      );
    }
    return route.abort();
  });
  return state;
}
async function login(page: Page) {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("candidato@example.invalid");
  await page.getByLabel("Palavra-passe", { exact: true }).fill("test-password");
  await page
    .getByRole("button", { name: "Entrar na minha conta", exact: true })
    .click();
  await expect(
    page.getByText("Vagas disponíveis", { exact: true }),
  ).toBeVisible();
}

test('login from a vacancy returns to that vacancy', async ({ page }) => {
  await backend(page);
  await page.goto(`/vaga/${jobId}`);
  await page.getByRole('button', { name: 'Entrar para me candidatar' }).click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('candidato@example.invalid');
  await page.getByLabel('Palavra-passe', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Entrar na minha conta', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Candidatar-me a esta vaga' })).toBeVisible();
  await expect(page.getByText('Gestor de projetos', { exact: true })).toBeVisible();
});

test('vacancy loading failures can be retried', async ({ page }) => {
  const state = await backend(page);
  state.failJobs = true;
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar as vagas');
  state.failJobs = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Gestor de projetos', { exact: true })).toBeVisible();
});

test("guest can browse and filter without exposing a write action", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const state = await backend(page);
  await page.goto("/");
  await expect(
    page.getByText("Gestor de projetos", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "País e localização" }).click();
  await page.getByRole("button", { name: "País: Todos os países" }).click();
  await page.getByRole("textbox", { name: "Pesquisar país" }).fill("Portugal");
  await page.getByRole("button", { name: "Portugal", exact: true }).click();
  await expect(page.getByText("Selecionar país", { exact: true })).toHaveCount(
    0,
  );
  await expect
    .poll(() => state.queries.some((q) => q.includes("country_code=eq.PT")))
    .toBe(true);
  await page
    .getByRole("textbox", { name: "Localização", exact: true })
    .fill("Coimbra");
  await expect(
    page.getByRole("textbox", { name: "Localização", exact: true }),
  ).toHaveValue("Coimbra");
  await expect
    .poll(() =>
      state.queries.some(
        (q) =>
          q.includes("country_code=eq.PT") && q.includes("location=ilike."),
      ),
    )
    .toBe(true);
  await page
    .getByRole("textbox", { name: "O que procuras?" })
    .fill("inexistente");
  await expect(
    page.getByText("Sem vagas para esta pesquisa", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await page
    .getByRole("button", { name: /Gestor de projetos, Empresa/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Entrar para me candidatar" }),
  ).toBeVisible();
  expect(state.posts).toBe(0);
  expect(errors).toEqual([]);
});
test("candidate applies once, sees the application and clears private screens on logout", async ({
  page,
}) => {
  const state = await backend(page);
  await login(page);
  await page
    .getByRole("button", { name: /Gestor de projetos, Empresa/ })
    .click();
  await page.getByRole("button", { name: "Candidatar-me a esta vaga" }).click();
  await expect(page.getByText(/permites que a empresa consulte/)).toBeVisible();
  await page.getByRole("button", { name: "Confirmar candidatura" }).click();
  await expect(
    page.getByText("Candidatura enviada", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver candidaturas" }).click();
  await expect(page.getByText("Em análise", { exact: true })).toBeVisible();
  expect(state.posts).toBe(1);
  await page.goto("/conta");
  await expect(
    page.getByText("Candidato de teste", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Terminar sessão neste dispositivo" })
    .click();
  await page.goto("/candidaturas");
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Gestor de projetos", { exact: true }),
  ).toHaveCount(0);
});
test("duplicate applications are treated as already submitted", async ({
  page,
}) => {
  const state = await backend(page, { duplicate: true });
  await login(page);
  await page.goto(`/vaga/${jobId}`);
  await page.getByRole("button", { name: "Candidatar-me a esta vaga" }).click();
  await page.getByRole("button", { name: "Confirmar candidatura" }).click();
  await expect(
    page.getByText("Candidatura enviada", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Candidatar-me a esta vaga" }),
  ).toHaveCount(0);
  expect(state.posts).toBe(1);
});
test("failed status checks do not enable applications", async ({ page }) => {
  const state = await backend(page, { failStatus: true });
  await login(page);
  await page.goto(`/vaga/${jobId}`);
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível verificar",
  );
  await expect(
    page.getByRole("button", { name: "Candidatar-me a esta vaga" }),
  ).toHaveCount(0);
  expect(state.posts).toBe(0);
});
test("company accounts cannot apply from candidate screens", async ({
  page,
}) => {
  const state = await backend(page, { role: "company" });
  await login(page);
  await page.goto(`/vaga/${jobId}`);
  await expect(
    page.getByText("Área de candidato", { exact: true }),
  ).toBeVisible();
  expect(state.posts).toBe(0);
  await expect(
    page.getByRole("button", { name: "Candidatar-me a esta vaga" }),
  ).toHaveCount(0);
});
test("closed jobs and bad credentials show clear feedback", async ({
  page,
}) => {
  await backend(page, { closed: true });
  await page.goto(`/vaga/${jobId}`);
  await expect(
    page.getByText("Candidaturas encerradas", { exact: true }),
  ).toBeVisible();
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("candidato@example.invalid");
  await page.getByLabel("Palavra-passe", { exact: true }).fill("wrong");
  await page
    .getByRole("button", { name: "Entrar na minha conta", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("não estão corretos");
});
