-- The accounts database (D1 "suvat-accounts"). Apply with:
--   npx wrangler d1 execute suvat-accounts --remote --file site/schema.sql
-- Every statement can run again safely.

-- One row a person. Signed in with Google, with an emailed link, or both:
-- the same verified email is the same account.
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE,
  name       TEXT,
  google_sub TEXT UNIQUE,
  created    INTEGER NOT NULL
);

-- A signed-in browser. Only the token's hash is kept; the token is the cookie.
CREATE TABLE IF NOT EXISTS sessions (
  hash    TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- An emailed sign-in link, by its hash: one use, fifteen minutes.
CREATE TABLE IF NOT EXISTS login_tokens (
  hash    TEXT PRIMARY KEY,
  email   TEXT NOT NULL,
  expires INTEGER NOT NULL
);

-- Links sent, so no one can use the site to flood an inbox.
CREATE TABLE IF NOT EXISTS auth_sends (
  email TEXT NOT NULL,
  ip    TEXT,
  at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sends_at ON auth_sends(at);

-- The chats, as js/ai/chats.js keeps them (data is the record's JSON). A
-- deleted chat stays a moment as a row with no data, so every device hears.
CREATE TABLE IF NOT EXISTS chats (
  user_id TEXT NOT NULL,
  id      TEXT NOT NULL,
  updated INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  data    TEXT,
  PRIMARY KEY (user_id, id)
);

-- The whiteboards: two an account, Board 1 and Board 2 (js/board/boards.js).
-- data is the board's JSON: its frames, its view and its drawing.
CREATE TABLE IF NOT EXISTS boards (
  user_id TEXT NOT NULL,
  slot    INTEGER NOT NULL CHECK (slot IN (1, 2)),
  updated INTEGER NOT NULL,
  data    TEXT,
  PRIMARY KEY (user_id, slot)
);

-- The objects a model has drawn for the composer (worker/src/draw.js), one a name,
-- shared by every student: a cached name costs no AI call. status is ok, refused or
-- failed; only ok has an svg, and it has passed js/compose/svgsafe.js.
CREATE TABLE IF NOT EXISTS drawings (
  name     TEXT PRIMARY KEY,
  svg      TEXT,
  material TEXT,
  status   TEXT NOT NULL,
  created  INTEGER NOT NULL
);

-- New drawings asked for, to hold them to a very small allowance: 25 a day across
-- the site, 5 an hour from one address. ip is a hash that changes every day, and a
-- row is kept for two days. spent is 1 where a model was really asked.
CREATE TABLE IF NOT EXISTS draw_log (
  ip    TEXT NOT NULL,
  at    INTEGER NOT NULL,
  spent INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS draw_log_at ON draw_log(at);
CREATE INDEX IF NOT EXISTS draw_log_ip ON draw_log(ip, at);
