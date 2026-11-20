-- Gamio Arena schema. Money is stored in whole rupees, dates as YYYY-MM-DD, times as HH:MM (venue local time).

CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY,
  name           TEXT    NOT NULL,
  email          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  phone          TEXT,
  password_hash  TEXT    NOT NULL,
  role           TEXT    NOT NULL DEFAULT 'player'
                         CHECK (role IN ('admin', 'manager', 'staff', 'player')),
  venue_id       INTEGER REFERENCES venues (id) ON DELETE SET NULL, -- home venue for front-desk staff
  wallet_balance INTEGER NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  last_login_at  TEXT
);

CREATE TABLE IF NOT EXISTS venues (
  id          INTEGER PRIMARY KEY,
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  tagline     TEXT,
  description TEXT,
  address     TEXT    NOT NULL,
  city        TEXT    NOT NULL,
  phone       TEXT,
  opens_at    TEXT    NOT NULL DEFAULT '10:00',
  closes_at   TEXT    NOT NULL DEFAULT '23:00',
  accent      TEXT    NOT NULL DEFAULT '#12684f',
  manager_id  INTEGER REFERENCES users (id) ON DELETE SET NULL,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activities (
  id         INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL UNIQUE,
  slug       TEXT    NOT NULL UNIQUE,
  icon       TEXT    NOT NULL,
  color      TEXT    NOT NULL,
  blurb      TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- A bookable unit: one pool table, one court, one lane.
CREATE TABLE IF NOT EXISTS resources (
  id             INTEGER PRIMARY KEY,
  venue_id       INTEGER NOT NULL REFERENCES venues (id) ON DELETE CASCADE,
  activity_id    INTEGER NOT NULL REFERENCES activities (id) ON DELETE RESTRICT,
  name           TEXT    NOT NULL,
  capacity       INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0),
  slot_minutes   INTEGER NOT NULL DEFAULT 60 CHECK (slot_minutes IN (30, 45, 60, 90, 120)),
  price_per_slot INTEGER NOT NULL CHECK (price_per_slot >= 0),
  peak_price     INTEGER CHECK (peak_price IS NULL OR peak_price >= 0), -- evenings after 18:00 and weekends
  notes          TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1,
  UNIQUE (venue_id, name)
);

CREATE TABLE IF NOT EXISTS bookings (
  id             INTEGER PRIMARY KEY,
  code           TEXT    NOT NULL UNIQUE,
  user_id        INTEGER REFERENCES users (id) ON DELETE SET NULL,
  guest_name     TEXT,
  guest_phone    TEXT,
  resource_id    INTEGER NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
  date           TEXT    NOT NULL,
  start_time     TEXT    NOT NULL,
  end_time       TEXT    NOT NULL,
  players        INTEGER NOT NULL DEFAULT 1,
  amount         INTEGER NOT NULL,
  payment_method TEXT    NOT NULL CHECK (payment_method IN ('wallet', 'venue')),
  payment_status TEXT    NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  status         TEXT    NOT NULL DEFAULT 'confirmed'
                         CHECK (status IN ('confirmed', 'checked_in', 'completed', 'cancelled', 'no_show')),
  note           TEXT,
  cancel_reason  TEXT,
  created_by     INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS bookings_by_resource_day ON bookings (resource_id, date);
CREATE INDEX IF NOT EXISTS bookings_by_user ON bookings (user_id, date);
CREATE INDEX IF NOT EXISTS bookings_by_date ON bookings (date);

-- Maintenance windows, private events, tournaments.
CREATE TABLE IF NOT EXISTS blocks (
  id          INTEGER PRIMARY KEY,
  resource_id INTEGER NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
  date        TEXT    NOT NULL,
  start_time  TEXT    NOT NULL,
  end_time    TEXT    NOT NULL,
  reason      TEXT    NOT NULL,
  created_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS blocks_by_resource_day ON blocks (resource_id, date);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            INTEGER PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL, -- positive = credit, negative = debit
  kind          TEXT    NOT NULL CHECK (kind IN ('topup', 'booking', 'refund', 'adjustment')),
  booking_id    INTEGER REFERENCES bookings (id) ON DELETE SET NULL,
  balance_after INTEGER NOT NULL,
  note          TEXT,
  created_by    INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS wallet_by_user ON wallet_transactions (user_id, id);

CREATE TABLE IF NOT EXISTS enquiries (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  topic      TEXT NOT NULL DEFAULT 'general',
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY,
  actor_id   INTEGER REFERENCES users (id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  INTEGER,
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
