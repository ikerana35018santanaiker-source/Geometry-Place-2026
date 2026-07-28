import { CONFIG } from "./config.js";

const TOKEN_KEY = "gdplace_token";
const USER_KEY = "gdplace_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function apiCall(path, options = {}) {
  const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Error de red");
    err.data = data;
    throw err;
  }
  return data;
}

export async function register(email, username, password) {
  const data = await apiCall("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
  saveSession(data.token, data.user);
  return data.user;
}

export async function login(email, password) {
  const data = await apiCall("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  saveSession(data.token, data.user);
  return data.user;
}

export async function logout() {
  const token = getToken();
  try {
    await apiCall("/api/auth/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } finally {
    clearSession();
  }
}

export async function fetchMe() {
  const token = getToken();
  if (!token) return null;
  try {
    const data = await apiCall("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.user;
  } catch {
    clearSession();
    return null;
  }
}

// Redirige a login si no hay sesión válida. Útil al principio de canvas.js / admin.js
export async function requireAuth(redirectTo = "/index.html") {
  const user = await fetchMe();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

export async function requireAdmin(redirectTo = "/canvas.html") {
  const user = await requireAuth("/index.html");
  if (user && user.role !== "admin") {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}
