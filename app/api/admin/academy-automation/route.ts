import { NextRequest, NextResponse } from "next/server";
import {
  requireActor,
  enforceApiLimit,
  apiErrorResponse,
  ApiError,
} from "@/lib/api-auth";
import {
  academyAdminClient,
  runAcademyAutomation,
} from "@/lib/academy/service";
import { safeSourceURL, validateArticle } from "@/lib/academy/quality";
import { isLocale } from "@/lib/i18n/config";
export const runtime = "nodejs";
export const maxDuration = 300;
function check<T>(result: { data: T; error: unknown }): T {
  if (result.error)
    throw new ApiError(500, "Não foi possível atualizar a Academy.");
  return result.data;
}
function uuid(value: unknown): value is string {
  return (
    typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(value)
  );
}
export async function GET(request: NextRequest) {
  try {
    await requireActor(request, ["admin"]);
    const db = academyAdminClient();
    const [settings, runs, topics, usage] = await Promise.all([
      db.from("academy_automation_settings").select("*").single(),
      db
        .from("academy_generation_runs")
        .select(
          "*,academy_topics(title),academy_posts(title,slug,academy_post_translations(locale,title,excerpt,content,seo_title,seo_description,reading_time,quality_passed,review_required,updated_at))",
        )
        .order("created_at", { ascending: false })
        .limit(30),
      db
        .from("academy_topics")
        .select("*,academy_generation_runs(id)")
        .order("priority")
        .limit(100),
      db
        .from("academy_monthly_usage")
        .select("*")
        .eq("month", new Date().toISOString().slice(0, 7) + "-01")
        .maybeSingle(),
    ]);
    return NextResponse.json({
      settings: check(settings),
      runs: check(runs),
      topics: check(topics),
      usage: check(usage),
      ready: {
        cron: !!process.env.CRON_SECRET,
        provider: !!process.env.OPENAI_API_KEY,
      },
    });
  } catch (error) {
    return (
      apiErrorResponse(error) ||
      NextResponse.json({ error: "Academy unavailable" }, { status: 503 })
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await requireActor(request, ["admin"]);
    await enforceApiLimit(actor, "academy_admin", 20);
    const body = await request.json().catch(() => { throw new ApiError(400, "Pedido inválido."); });
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "Pedido inválido.");
    const db = academyAdminClient();
    if (body.action === "settings") {
      if (
        typeof body.enabled !== "boolean" ||
        typeof body.auto_publish !== "boolean" ||
        !Number.isInteger(body.monthly_request_limit) ||
        body.monthly_request_limit < 6 ||
        body.monthly_request_limit > 600
      )
        throw new ApiError(400, "Configuração inválida.");
      if (
        body.enabled &&
        (!process.env.CRON_SECRET || !process.env.OPENAI_API_KEY)
      )
        throw new ApiError(
          409,
          "Configura CRON_SECRET e OPENAI_API_KEY em produção antes de ativar.",
        );
      check(
        await db
          .from("academy_automation_settings")
          .update({
            enabled: body.enabled,
            auto_publish: body.auto_publish,
            monthly_request_limit: body.monthly_request_limit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", true),
      );
    } else if (body.action === "preview" || body.action === "retry") {
      if (body.action === "retry" && !uuid(body.run_id))
        throw new ApiError(400, "Execução inválida.");
      await enforceApiLimit(actor, "ai", 10);
      const result = await runAcademyAutomation(
        body.action === "retry" ? body.run_id : undefined,
        body.action === "preview",
      );
      return NextResponse.json(result, { status: result.success ? 200 : 502 });
    } else if (body.action === "topic") {
      if (
        typeof body.title !== "string" ||
        body.title.trim().length < 10 ||
        body.title.length > 160 ||
        typeof body.category !== "string" ||
        body.category.length > 80 ||
        !["Candidatos", "Empresas", "Todos"].includes(body.audience) ||
        !Array.isArray(body.source_urls) ||
        body.source_urls.length < 1 ||
        body.source_urls.length > 2 ||
        !body.source_urls.every(safeSourceURL)
      )
        throw new ApiError(
          400,
          "Tema inválido. Usa uma ou duas fontes oficiais permitidas.",
        );
      check(
        await db
          .from("academy_topics")
          .insert({
            title: body.title.trim(),
            category: body.category,
            audience: body.audience,
            source_urls: body.source_urls,
            priority: 100,
          }),
      );
    } else if (body.action === "translation") {
      if (!uuid(body.post_id) || !isLocale(body.locale))
        throw new ApiError(400, "Versão inválida.");
      let draft;
      try {
        draft = validateArticle(
          { ...body.article, locale: body.locale },
          body.locale,
        );
      } catch {
        throw new ApiError(
          400,
          "A versão não cumpre os critérios de estrutura, extensão ou conteúdo. Revê o texto e os metadados.",
        );
      }
      check(
        await db.rpc("academy_edit_translation", {
          post: body.post_id,
          language: body.locale,
          payload: draft,
        }),
      );
    } else if (body.action === "publish") {
      if (!uuid(body.post_id)) throw new ApiError(400, "Artigo inválido.");
      // The administrator confirms human review. Publication and run status change atomically.
      check(await db.rpc("academy_publish_reviewed", { post: body.post_id }));
    } else throw new ApiError(400, "Operação inválida.");
    return NextResponse.json({ success: true });
  } catch (error) {
    return (
      apiErrorResponse(error) ||
      NextResponse.json({ error: "Academy unavailable" }, { status: 503 })
    );
  }
}
