import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse, requireUuid } from "@/lib/api-auth";
import { adminContext, audit, privateHeaders } from "@/lib/admin-data";
import { optionKey } from "@/lib/profile-options";
export const runtime = "nodejs";
function failed(error: unknown) {
  const response = apiErrorResponse(error) || NextResponse.json({ error: "Não foi possível concluir a gestão de competências." }, { status: 503 });
  for (const [key, value] of Object.entries(privateHeaders)) response.headers.set(key, value);
  return response;
}
export async function GET(request: Request) {
  try {
    const { actor, db } = await adminContext(request);
    const url = new URL(request.url), status = url.searchParams.get("status") || "pending";
    const rawPage = url.searchParams.get("page") || "1";
    if (!["pending", "approved", "rejected"].includes(status) || !/^\d{1,5}$/.test(rawPage) || Number(rawPage) < 1) throw new ApiError(400, "Filtro inválido.");
    const page = Number(rawPage), q = optionKey((url.searchParams.get("q") || "").slice(0, 80)).replace(/[%_\\]/g, "");
    let query = db.from("profile_tags").select("id,label,status,source,source_uri,source_version,created_at", { count: "exact" }).eq("status", status);
    if (q) query = query.ilike("normalized_label", `%${q}%`);
    const { data, count, error } = await query.order("created_at", { ascending: false }).order("id").range((page - 1) * 30, page * 30 - 1);
    if (error) throw new ApiError(503, "Não foi possível carregar as competências.");
    const {data: aliases,error: aliasError} = await db.from("profile_tag_aliases").select("normalized_alias,tag_id,profile_tags(label,status)").in("normalized_alias", (data || []).map(row => optionKey(row.label)));
    if (aliasError) throw new ApiError(503,"Não foi possível consultar as associações.");
    const associated = new Map((aliases || []).map(row => {const target=Array.isArray(row.profile_tags) ? row.profile_tags[0] : row.profile_tags;return [row.normalized_alias, {equivalentLabel: target?.label || "Competência associada", aliasTargetId: row.tag_id}];}));
    const rows=(data || []).map(row => ({...row,...associated.get(optionKey(row.label))}));
    await audit(db, actor, "consultar", "catalogo_competencias", null, data?.length || 0);
    return NextResponse.json({ rows, total: count, page, pageSize: 30 }, { headers: privateHeaders });
  } catch (error) { return failed(error); }
}
export async function POST(request: Request) {
  try {
    const { actor } = await adminContext(request);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || !["approve", "reject", "alias", "unlink"].includes(body.action) || !["pending", "approved", "rejected"].includes(body.expectedStatus)) throw new ApiError(400, "Decisão inválida.");
    requireUuid(body.id, "Competência");
    if (body.action === "alias") requireUuid(body.targetId, "Competência de destino");
    const { data, error } = await actor.client.rpc("moderate_profile_tag", { p_id: body.id, p_action: body.action, p_expected_status: body.expectedStatus, p_target: body.action === "alias" ? body.targetId : null });
    if (error) throw new ApiError(error.code === "42501" ? 403 : error.code === "40001" ? 409 : error.code === "22023" ? 400 : 503, ["42501", "40001", "22023"].includes(error.code) ? error.message : "Não foi possível registar a decisão.");
    return NextResponse.json({ status: data }, { headers: privateHeaders });
  } catch (error) { return failed(error); }
}
