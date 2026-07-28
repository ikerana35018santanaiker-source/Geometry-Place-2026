import { jsonResponse, uuid, hashPassword, verifyPassword, newSessionToken, isValidEmail } from "./utils.js";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 días

export async function register(request, env, origin) {
  const body = await request.json().catch(() => null);
  if (!body) return jsonResponse({ error: "JSON inválido" }, 400, origin);

  const { email, username, password } = body;
  if (!email || !username || !password) {
    return jsonResponse({ error: "Faltan campos (email, username, password)" }, 400, origin);
  }
  if (!isValidEmail(email)) {
    return jsonResponse({ error: "Email inválido" }, 400, origin);
  }
  if (password.length < 8) {
    return jsonResponse({ error: "La contraseña debe tener al menos 8 caracteres" }, 400, origin);
  }
  if (username.length < 3 || username.length > 20) {
    return jsonResponse({ error: "El nombre de usuario debe tener entre 3 y 20 caracteres" }, 400, origin);
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? OR username = ?")
    .bind(email.toLowerCase(), username)
    .first();
  if (existing) {
    return jsonResponse({ error: "Ese email o nombre de usuario ya está en uso" }, 409, origin);
  }

  const { hash, salt } = await hashPassword(password);
  const id = uuid();

  await env.DB.prepare(
    `INSERT INTO users (id, email, username, password_hash, password_salt, role, banned)
     VALUES (?, ?, ?, ?, ?, 'user', 0)`
  ).bind(id, email.toLowerCase(), username, hash, salt).run();

  const session = await createSession(env, id);
  return jsonResponse({ user: { id, email, username, role: "user" }, token: session.token }, 201, origin);
}

export async function login(request, env, origin) {
  const body = await request.json().catch(() => null);
  if (!body) return jsonResponse({ error: "JSON inválido" }, 400, origin);

  const { email, password } = body;
  if (!email || !password) {
    return jsonResponse({ error: "Faltan campos (email, password)" }, 400, origin);
  }

  const user = await env.DB.prepare(
    "SELECT id, email, username, password_hash, password_salt, role, banned, ban_reason FROM users WHERE email = ?"
  ).bind(email.toLowerCase()).first();

  if (!user) {
    return jsonResponse({ error: "Email o contraseña incorrectos" }, 401, origin);
  }

  const valid = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!valid) {
    return jsonResponse({ error: "Email o contraseña incorrectos" }, 401, origin);
  }

  if (user.banned) {
    return jsonResponse({ error: "Cuenta baneada", reason: user.ban_reason || null }, 403, origin);
  }

  const session = await createSession(env, user.id);
  return jsonResponse({
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
    token: session.token,
  }, 200, origin);
}

export async function logout(request, env, origin) {
  const token = getBearerToken(request);
  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  return jsonResponse({ ok: true }, 200, origin);
}

export async function me(request, env, origin) {
  const user = await getUserFromRequest(request, env);
  if (!user) return jsonResponse({ error: "No autenticado" }, 401, origin);
  return jsonResponse({ user }, 200, origin);
}

async function createSession(env, userId) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();
  return { token, expiresAt };
}

export function getBearerToken(request) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// Devuelve el usuario autenticado (o null) validando el token contra sessions + users
export async function getUserFromRequest(request, env) {
  const token = getBearerToken(request);
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.username, u.role, u.banned, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  ).bind(token).first();

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  if (row.banned) return null;

  return { id: row.id, email: row.email, username: row.username, role: row.role };
}
