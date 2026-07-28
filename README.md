# Geometry Place

Evento colaborativo estilo r/place para Geometry Dash. Fase 1: auth, admin,
canvas de solo-lectura en tiempo real, contador animado y selector de
objetos (sin colocar objetos todavía — eso es la siguiente fase).

## Estructura

```
gd-place/
├── public/              → frontend estático (HTML/CSS/JS vanilla)
│   ├── assets/
│   │   ├── fonts/       → pon aquí tus fuentes
│   │   ├── countdown/   → img_0.png ... img_200.png (dígitos del contador)
│   │   ├── gd-imgs/
│   │   │   ├── objects/ → sprites de los objetos del canvas
│   │   │   └── icons/   → iconos de cuenta, UI, etc.
│   │   └── logo/        → Geometry Place.png
│   ├── js/
│   ├── css/
│   ├── index.html       → login / registro
│   ├── canvas.html       → canvas principal
│   ├── admin.html        → panel de admin
│   └── test.html          → panel de testeo
├── worker/               → backend en Cloudflare Workers (auth + admin, usa D1)
│   ├── src/
│   ├── schema.sql
│   └── wrangler.toml
└── supabase/
    └── schema.sql        → tablas de bloques + presencia (Supabase)
```

## 1. Configurar Supabase (bloques + presencia)

1. Crea un proyecto en https://supabase.com
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
3. Ve a **Database → Replication** y confirma que `blocks` y `presence`
   tienen Realtime activado (el script ya lo intenta activar por SQL)
4. Ve a **Settings → API** y copia:
   - `Project URL` → pégalo en `public/js/config.js` como `SUPABASE_URL`
   - `anon public key` → pégalo en `public/js/config.js` como `SUPABASE_ANON_KEY`
   - `service_role key` → **guárdala aparte**, la necesitas para el Worker
     (nunca la metas en el frontend)

## 2. Configurar Cloudflare (cuentas + admin)

Necesitas `wrangler` instalado (`npm install -g wrangler`) y una cuenta de
Cloudflare gratuita.

```bash
cd worker
wrangler login
wrangler d1 create gd-place-db
```

Copia el `database_id` que te devuelve y pégalo en `worker/wrangler.toml`
(campo `database_id`). Luego aplica el esquema:

```bash
wrangler d1 execute gd-place-db --file=./schema.sql
```

Configura los secretos (no van en el `.toml`, se guardan cifrados en Cloudflare):

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SESSION_SECRET
```

Despliega el Worker:

```bash
wrangler deploy
```

Te dará una URL tipo `https://gd-place-worker.tu-cuenta.workers.dev` —
pégala en `public/js/config.js` como `WORKER_URL`.

Para probar en local antes de desplegar: `wrangler dev` (por defecto en
`http://localhost:8787`, que ya es el valor por defecto de `config.js`).

## 3. Crear tu primer admin

Regístrate normalmente desde `index.html` (crea una cuenta con rol `user`).
Luego, en el dashboard de Cloudflare (D1 → tu base → "Console") o vía wrangler:

```bash
wrangler d1 execute gd-place-db --command "UPDATE users SET role = 'admin' WHERE email = 'tu-email@ejemplo.com'"
```

Ya puedes entrar a `admin.html` con esa cuenta.

## 4. Servir el frontend

Como es HTML/JS estático, puedes usar Cloudflare Pages, Netlify, Vercel o
cualquier servidor estático. Solo asegúrate de que `ALLOWED_ORIGIN` en
`worker/wrangler.toml` coincida con el dominio real donde sirvas `public/`
(si no, el navegador bloqueará las peticiones por CORS).

Para probar rápido en local:

```bash
cd public
npx serve .
```

## 5. Assets pendientes de colocar

- `public/assets/logo/Geometry Place.png` — el logo del sitio (ya referenciado en las 4 páginas)
- `public/assets/fonts/` — tu fuente (ajusta el nombre de archivo en `css/styles.css`, regla `@font-face`)
- `public/assets/countdown/img_0.png` a `img_200.png` — dígitos del contador
- `public/assets/gd-imgs/objects/*.png` — sprites del selector de objetos
  (ajusta/completa la lista `OBJECT_CATALOG` en `public/js/canvas.js`)
- `public/assets/gd-imgs/icons/` — iconos de cuenta y UI (aún no referenciados en el código, dime dónde quieres cada uno)

## Qué falta para la siguiente fase

- Colocar/editar/borrar objetos desde el canvas (con cooldown real de 5 min por acción, validado en el Worker)
- Guardar coordenadas del canvas grande (paneo/zoom)
- Exportar `level.json` al terminar el evento
- Límites del canvas (tamaño exacto en bloques)
