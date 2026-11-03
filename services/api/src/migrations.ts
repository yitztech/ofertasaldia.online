import type { Pool } from "pg";

// Immutable, ordered migrations. A failed transaction leaves no partial schema.
const migrations = [
  `CREATE TABLE categories (
    id text PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 50),
    name varchar(150) NOT NULL
  );
  CREATE TABLE products (
    id uuid PRIMARY KEY,
    title varchar(150) NOT NULL,
    description varchar(5000),
    category_id text NOT NULL REFERENCES categories(id),
    platform varchar(30) NOT NULL CHECK (platform IN ('amazon', 'mercadolibre')),
    price_cents bigint CHECK (price_cents >= 0),
    currency char(3) NOT NULL DEFAULT 'MXN',
    image_url varchar(2048),
    is_demo boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX products_category_id_idx ON products(category_id, id);`,
  `INSERT INTO categories(id, name) VALUES
    ('electronica', 'Electrónica'), ('hogar', 'Hogar'), ('moda', 'Moda'),
    ('belleza', 'Belleza'), ('deportes', 'Deportes'), ('juguetes', 'Juguetes'),
    ('herramientas', 'Herramientas'), ('automotriz', 'Automotriz'), ('libros', 'Libros'),
    ('salud', 'Salud'), ('mascotas', 'Mascotas'), ('oficina', 'Oficina');`,
  `CREATE TABLE users (
    id uuid PRIMARY KEY,
    name varchar(50) NOT NULL CHECK (char_length(name) > 0),
    email varchar(254) NOT NULL,
    password_hash text,
    role varchar(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    verified_at timestamptz,
    suspended_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX users_email_unique ON users(lower(email));
  CREATE TABLE sessions (
    token_hash char(64) PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX sessions_user_idx ON sessions(user_id);
  CREATE TABLE identity_providers (
    provider varchar(10) NOT NULL CHECK (provider IN ('google', 'apple')),
    subject varchar(255) NOT NULL,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(provider, subject)
  );
  CREATE TABLE subscriptions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starts_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at > starts_at)
  );
  CREATE INDEX subscriptions_user_idx ON subscriptions(user_id, expires_at);
  CREATE TABLE profiles (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    alias varchar(50) UNIQUE NOT NULL CHECK (alias ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    description varchar(5000) NOT NULL DEFAULT '',
    location varchar(200) NOT NULL DEFAULT '',
    avatar_url varchar(2048),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE favorites (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id, product_id)
  );`,
  `CREATE TABLE auth_attempts (
    key char(64) PRIMARY KEY,
    attempts integer NOT NULL,
    window_start timestamptz NOT NULL
  );`,
  `CREATE TABLE password_tokens (
    token_hash char(64) PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );`,
  `CREATE TABLE oauth_flows (
    state_hash char(64) PRIMARY KEY,
    provider varchar(10) NOT NULL CHECK (provider IN ('google','apple')),
    binding_hash char(64) NOT NULL,
    nonce varchar(255) NOT NULL,
    verifier varchar(255) NOT NULL,
    expires_at timestamptz NOT NULL
  );
  CREATE INDEX oauth_flows_expiry_idx ON oauth_flows(expires_at);`,
  `CREATE TABLE admin_audit (
    id uuid PRIMARY KEY,
    actor_id uuid NOT NULL REFERENCES users(id),
    action varchar(100) NOT NULL,
    target_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );`,
  `CREATE TABLE email_verification_tokens (
    token_hash char(64) PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX email_verification_tokens_user_idx ON email_verification_tokens(user_id);`,
  `CREATE TABLE payment_customers (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    provider varchar(30) NOT NULL,
    customer_id varchar(255) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX payment_customers_provider_idx ON payment_customers(provider, customer_id);
  CREATE TABLE payment_events (
    id varchar(255) PRIMARY KEY,
    provider varchar(30) NOT NULL,
    event_type varchar(100) NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX payment_events_provider_idx ON payment_events(provider, event_type);
  ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS plan_id varchar(50) NOT NULL DEFAULT 'pro',
    ADD COLUMN IF NOT EXISTS provider varchar(30) DEFAULT 'stripe',
    ADD COLUMN IF NOT EXISTS provider_subscription_id varchar(255);
  CREATE INDEX IF NOT EXISTS subscriptions_provider_idx ON subscriptions(provider, provider_subscription_id);`,
];

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [94621035]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version integer PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const result = await client.query<{ version: number }>(
      "SELECT version FROM schema_migrations ORDER BY version",
    );
    const applied = result.rows.map((row) => row.version);
    if (
      applied.some((v, i) => v !== i + 1) ||
      applied.length > migrations.length
    ) {
      throw new Error(
        "La versión de migraciones no es compatible con esta API",
      );
    }
    for (let i = applied.length; i < migrations.length; i++) {
      await client.query("BEGIN");
      try {
        await client.query(migrations[i]);
        await client.query(
          "INSERT INTO schema_migrations(version) VALUES ($1)",
          [i + 1],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [94621035]);
    } finally {
      client.release();
    }
  }
}
