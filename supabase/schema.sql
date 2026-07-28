-- ============================================================
-- GD Place — Esquema de Supabase
-- Contiene: bloques colocados en el canvas + presencia (usuarios conectados)
-- Ejecutar en el SQL Editor de tu proyecto de Supabase
-- ============================================================

create extension if not exists "pgcrypto";

-- Tabla principal: cada objeto colocado en el canvas
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,           -- id del usuario (viene del D1 de Cloudflare)
  object_type text not null,        -- clave del objeto, ej: "block_1", "spike_3"
  x integer not null,
  y integer not null,
  rotation integer not null default 0,   -- grados: 0, 90, 180, 270
  scale numeric not null default 1,
  color text,                       -- hex, ej: "#00ffcc" (null si el objeto no es coloreable)
  z_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,                  -- último usuario que lo editó/movió
  deleted boolean not null default false
);

create index if not exists blocks_position_idx on blocks (x, y) where deleted = false;
create index if not exists blocks_user_idx on blocks (user_id);
create index if not exists blocks_updated_idx on blocks (updated_at);

-- Presencia: quién está conectado ahora mismo en el canvas
create table if not exists presence (
  user_id text primary key,
  username text not null,
  last_seen timestamptz not null default now(),
  cursor_x integer,
  cursor_y integer,
  cooldown_place_until timestamptz,   -- hasta cuándo no puede colocar otro objeto
  cooldown_edit_until timestamptz,    -- hasta cuándo no puede editar otro objeto
  cooldown_delete_until timestamptz   -- hasta cuándo no puede borrar otro objeto
);

-- Row Level Security
alter table blocks enable row level security;
alter table presence enable row level security;

-- Lectura pública: todo el mundo tiene que poder ver el canvas en tiempo real
create policy "blocks_select_all" on blocks
  for select using (true);

create policy "presence_select_all" on presence
  for select using (true);

-- IMPORTANTE: no se crean policies de INSERT/UPDATE/DELETE para el rol "anon".
-- Todas las escrituras (colocar/editar/borrar objeto) pasarán por el Worker
-- de Cloudflare usando la service_role key, que se salta RLS. Así controlamos
-- ahí el cooldown de 5 minutos, los baneos y la validación de límites del canvas.
-- Esto se implementa en la siguiente fase (colocar objetos).

-- Habilitar Realtime para estas 2 tablas (Database > Replication en el dashboard,
-- o vía SQL):
alter publication supabase_realtime add table blocks;
alter publication supabase_realtime add table presence;
