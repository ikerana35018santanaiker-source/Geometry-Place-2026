-- ============================================================
-- GD Place — Esquema de Cloudflare D1
-- Contiene: cuentas de usuario, sesiones y estado del evento
-- Aplicar con: wrangler d1 execute gd-place-db --file=./schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                       -- uuid generado en el worker
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,               -- PBKDF2 en hex
  password_salt TEXT NOT NULL,               -- salt en hex
  role TEXT NOT NULL DEFAULT 'user',         -- 'user' | 'admin'
  banned INTEGER NOT NULL DEFAULT 0,         -- 0 = no, 1 = sí
  ban_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,                    -- token opaco (no JWT, más simple de revocar)
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- Fila única con el estado global del evento
CREATE TABLE IF NOT EXISTS event_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'running' | 'finished'
  starts_at TEXT,                            -- ISO datetime, lunes por la mañana
  ends_at TEXT                                -- ISO datetime, domingo por la noche
);

INSERT OR IGNORE INTO event_state (id, status) VALUES (1, 'pending');
