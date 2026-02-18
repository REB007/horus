CREATE TABLE IF NOT EXISTS markets (
  address           TEXT PRIMARY KEY,
  token_address     TEXT NOT NULL,
  token_symbol      TEXT NOT NULL,
  token_name        TEXT NOT NULL,
  token_img         TEXT,
  pool_address      TEXT NOT NULL,
  question          TEXT NOT NULL,
  resolution_time   INTEGER NOT NULL,
  resolved          INTEGER NOT NULL DEFAULT 0,
  yes_wins          INTEGER,
  created_at        INTEGER NOT NULL,
  tx_hash           TEXT
);
