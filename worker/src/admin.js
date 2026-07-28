import { jsonResponse } from "./utils.js";
import { getUserFromRequest } from "./auth.js";

async function requireAdmin(request, env, origin) {
  const user = await getUserFromRequest(request, env);
  if (!user) return { error: jsonResponse({ error: "No autenticado" }, 401, origin) };
  if (user.role !== "admin") return { error: jsonResponse({ error: "Solo para admins" }, 403, origin) };
  return { user };
}

export async function listUsers(request, env, origin) {
  const { error } = await requireAdmin(request, env, origin);
  if (error) return error;

  const { results } = await env.DB.prepare(
    "SELECT id, email, username, role, banned, ban_reason, created_at FROM users ORDER BY created_at DESC LIMIT 200"
  ).all();

  return jsonResponse({ users: results }, 200, origin);
}

export async function banUser(request, env, origin) {
  const { error } = await requireAdmin(request, env, origin);
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body?.userId) return jsonResponse({ error: "Falta userId" }, 400, origin);

  await env.DB.prepare("UPDATE users SET banned = 1, ban_reason = ? WHERE id = ?")
    .bind(body.reason || null, body.userId)
    .run();
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(body.userId).run();

  return jsonResponse({ ok: true }, 200, origin);
}

export async function unbanUser(request, env, origin) {
  const { error } = await requireAdmin(request, env, origin);
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body?.userId) return jsonResponse({ error: "Falta userId" }, 400, origin);

  await env.DB.prepare("UPDATE users SET banned = 0, ban_reason = NULL WHERE id = ?")
    .bind(body.userId)
    .run();

  return jsonResponse({ ok: true }, 200, origin);
}

// Arranca el evento: fija starts_at (ahora) y ends_at (ahora + 7 días)
export async function startEvent(request, env, origin) {
  const { error } = await requireAdmin(request, env, origin);
  if (error) return error;

  const now = new Date();
  const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await env.DB.prepare(
    "UPDATE event_state SET status = 'running', starts_at = ?, ends_at = ? WHERE id = 1"
  ).bind(now.toISOString(), ends.toISOString()).run();

  return jsonResponse({ status: "running", starts_at: now.toISOString(), ends_at: ends.toISOString() }, 200, origin);
}

// Fuerza el estado a "finished" manualmente (por si hay que cortar el evento antes)
export async function finishEvent(request, env, origin) {
  const { error } = await requireAdmin(request, env, origin);
  if (error) return error;

  await env.DB.prepare("UPDATE event_state SET status = 'finished' WHERE id = 1").run();
  return jsonResponse({ status: "finished" }, 200, origin);
}

// Público: cualquiera puede consultar el estado/contador del evento
export async function getEventState(request, env, origin) {
  const row = await env.DB.prepare("SELECT status, starts_at, ends_at FROM event_state WHERE id = 1").first();
  return jsonResponse({ event: row }, 200, origin);
}
