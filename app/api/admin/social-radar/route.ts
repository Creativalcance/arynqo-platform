import {
  ApiError,
  apiErrorResponse,
  enforceApiLimit,
  requireActor,
  requireUuid,
} from "@/lib/api-auth";
import {
  assess,
  instagramURL,
  record,
  settingsValue,
  sourceValue,
} from "@/lib/social-radar/domain";
import {
  checked,
  draft,
  radarClient,
  ready,
  scan,
} from "@/lib/social-radar/service";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (data: unknown) =>
  Response.json(data, {
    headers: { "Cache-Control": "private, no-store", Vary: "Authorization" },
  });
export async function GET(request: Request) {
  try {
    await requireActor(request, ["admin"]);
    const db = radarClient(),
      url = new URL(request.url);
    const filter = url.searchParams.get("status") || "all";
    const page = Math.max(
      0,
      Math.min(10000, Number(url.searchParams.get("page")) || 0),
    );
    if (
      !Number.isInteger(page) ||
      !["all", "new", "ready", "review", "dismissed", "used"].includes(filter)
    )
      throw new ApiError(400, "Filtro inválido.");
    let query = db
      .from("social_radar_opportunities")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id")
      .range(page * 20, page * 20 + 19);
    if (filter !== "all") query = query.eq("status", filter);
    const [settings, sources, opportunities, runs, usage] = await Promise.all([
      db.from("social_radar_settings").select("*").eq("id", true).single(),
      db.from("social_radar_sources").select("*").order("created_at"),
      query,
      db
        .from("social_radar_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(15),
      db
        .from("social_radar_usage")
        .select("*")
        .order("day", { ascending: false })
        .limit(7),
    ]);
    return json({
      settings: checked(settings),
      sources: checked(sources),
      opportunities: checked(opportunities),
      total: opportunities.count,
      runs: checked(runs),
      usage: checked(usage),
      ready: ready(),
    });
  } catch (error) {
    return (
      apiErrorResponse(error) ||
      Response.json(
        { error: "Não foi possível abrir o Radar." },
        { status: 503 },
      )
    );
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireActor(request, ["admin"]);
    // Reuse the established admin write quota; independent provider budgets are reserved atomically.
    await enforceApiLimit(actor, "academy_admin", 30);
    const text = await request.text();
    if (text.length > 12000)
      throw new ApiError(413, "Pedido demasiado extenso.");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new ApiError(400, "Pedido inválido.");
    }
    if (!record(body)) throw new ApiError(400, "Pedido inválido.");
    const db = radarClient();
    if (body.action === "scan") return json(await scan(db));
    if (body.action === "draft") {
      requireUuid(body.id, "Oportunidade");
      return json(await draft(db, body.id));
    }
    let payload: Record<string, unknown>;
    if (body.action === "settings") {
      const value = settingsValue(body.settings);
      if (!value)
        throw new ApiError(
          400,
          "Revê os limites e as preferências editoriais.",
        );
      if (value.enabled && (!ready().meta || !ready().ai || !ready().cron))
        throw new ApiError(
          400,
          "Configura Meta, geração de comentários e pesquisa agendada antes de ativar o Radar.",
        );
      payload = value;
    } else if (body.action === "source") {
      const value = sourceValue(body.kind, body.value);
      if (!value)
        throw new ApiError(
          400,
          "Indica um nome de conta ou hashtag válido, sem endereço web.",
        );
      payload = { kind: body.kind, value };
    } else if (body.action === "toggle_source") {
      requireUuid(body.id, "Fonte");
      if (typeof body.enabled !== "boolean")
        throw new ApiError(400, "Estado inválido.");
      payload = { id: body.id, enabled: body.enabled };
    } else if (body.action === "opportunity") {
      requireUuid(body.id, "Oportunidade");
      if (
        !["ready", "used", "dismissed", "review"].includes(
          String(body.status),
        ) ||
        typeof body.selected_comment !== "string" ||
        body.selected_comment.length > 240 ||
        typeof body.feedback !== "string" ||
        body.feedback.length > 300
      )
        throw new ApiError(400, "Comentário ou estado inválido.");
      if (
        ["ready", "used"].includes(String(body.status)) &&
        body.selected_comment.trim().length < 8
      )
        throw new ApiError(
          400,
          "Escreve o comentário antes de guardar este estado.",
        );
      payload = {
        id: body.id,
        status: body.status,
        selected_comment: body.selected_comment.trim(),
        feedback: body.feedback.trim(),
      };
    } else if (body.action === "import") {
      const permalink = instagramURL(body.permalink),
        date =
          typeof body.published_at === "string"
            ? Date.parse(body.published_at)
            : NaN;
      if (
        !permalink ||
        typeof body.caption !== "string" ||
        body.caption.trim().length < 15 ||
        body.caption.length > 4000 ||
        !Number.isFinite(date) ||
        date > Date.now() + 300000 ||
        date < Date.now() - 168 * 3600000
      )
        throw new ApiError(
          400,
          "Indica o link, a legenda e uma data de publicação dos últimos sete dias.",
        );
      payload = {
        permalink,
        media_id: `manual:${new URL(permalink).pathname}`,
        caption: body.caption.trim(),
        published_at: new Date(date).toISOString(),
        ...assess(body.caption),
      };
    } else throw new ApiError(400, "Ação inválida.");
    const result = await db.rpc("social_radar_mutate", {
      p_actor: actor.id,
      p_action: body.action,
      p_payload: payload,
    });
    if (result.error?.code === "23505")
      throw new ApiError(409, "Esta fonte já está no Radar.");
    return json(checked(result));
  } catch (error) {
    return (
      apiErrorResponse(error) ||
      Response.json(
        { error: "Não foi possível guardar a alteração." },
        { status: 503 },
      )
    );
  }
}
