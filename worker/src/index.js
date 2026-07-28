import { corsHeaders, jsonResponse } from "./utils.js";
import { register, login, logout, me } from "./auth.js";
import { listUsers, banUser, unbanUser, startEvent, finishEvent, getEventState } from "./admin.js";

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    try {
      switch (url.pathname) {
        case "/api/auth/register":
          return request.method === "POST"
            ? register(request, env, origin)
            : jsonResponse({ error: "Método no permitido" }, 405, origin);

        case "/api/auth/login":
          return request.method === "POST"
            ? login(request, env, origin)
            : jsonResponse({ error: "Método no permitido" }, 405, origin);

        case "/api/auth/logout":
          return request.method === "POST"
            ? logout(request, env, origin)
            : jsonResponse({ error: "Método no permitido" }, 405, origin);

        case "/api/auth/me":
          return me(request, env, origin);

        case "/api/admin/users":
          return listUsers(request, env, origin);

        case "/api/admin/ban":
          return banUser(request, env, origin);

        case "/api/admin/unban":
          return unbanUser(request, env, origin);

        case "/api/admin/start-event":
          return startEvent(request, env, origin);

        case "/api/admin/finish-event":
          return finishEvent(request, env, origin);

        case "/api/event/state":
          return getEventState(request, env, origin);

        default:
          return jsonResponse({ error: "No encontrado" }, 404, origin);
      }
    } catch (err) {
      return jsonResponse({ error: "Error interno", detail: String(err) }, 500, origin);
    }
  },
};
