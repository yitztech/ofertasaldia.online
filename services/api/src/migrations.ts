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
  `CREATE TABLE articles (
    id uuid PRIMARY KEY,
    author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title varchar(150) NOT NULL CHECK (char_length(title) >= 5),
    slug varchar(160) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    summary varchar(500) NOT NULL CHECK (char_length(summary) >= 10),
    content text NOT NULL CHECK (char_length(content) >= 20),
    cover_image_url varchar(2048),
    category_id text REFERENCES categories(id) ON DELETE SET NULL,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX articles_author_idx ON articles(author_id, created_at DESC);
  CREATE INDEX articles_status_published_idx ON articles(status, published_at DESC);
  CREATE INDEX articles_category_idx ON articles(category_id, published_at DESC);
  CREATE INDEX articles_product_idx ON articles(product_id);`,
  `ALTER TABLE products
    ADD COLUMN IF NOT EXISTS external_id varchar(50),
    ADD COLUMN IF NOT EXISTS affiliate_url varchar(2048),
    ADD COLUMN IF NOT EXISTS original_price_cents bigint CHECK (original_price_cents >= 0),
    ADD COLUMN IF NOT EXISTS discount_percentage integer CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    ADD COLUMN IF NOT EXISTS rating numeric(3, 2) DEFAULT 4.8,
    ADD COLUMN IF NOT EXISTS reviews_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status varchar(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
    ADD COLUMN IF NOT EXISTS last_checked_at timestamptz DEFAULT now();
  CREATE INDEX IF NOT EXISTS products_external_id_idx ON products(external_id);
  CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
  CREATE TABLE IF NOT EXISTS price_history (
    id uuid PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_cents bigint NOT NULL CHECK (price_cents >= 0),
    recorded_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS price_history_product_idx ON price_history(product_id, recorded_at DESC);`,
  `INSERT INTO products (
    id, title, description, category_id, platform, price_cents, original_price_cents,
    discount_percentage, currency, image_url, affiliate_url, external_id, rating, reviews_count, status, is_demo
  ) VALUES
    ('01930000-0000-7000-8000-000000000001', 'Samsung Galaxy A56 256 GB', 'Pantalla Super AMOLED de 120 Hz, cámara cuádruple de 50 MP y 6 años de actualizaciones.', 'electronica', 'mercadolibre', 749900, 899900, 17, 'MXN', '/img/productos/apple-watch.png', 'https://www.mercadolibre.com.mx/p/MLM1000004', 'MLM1000004', 4.8, 2341, 'active', false),
    ('01930000-0000-7000-8000-000000000002', 'Xiaomi Redmi Note 15 Pro 256 GB', 'Cámara de 200 MP con estabilización óptica, carga ultra rápida de 120 W y pantalla AMOLED.', 'electronica', 'mercadolibre', 589900, 729900, 19, 'MXN', '/img/productos/audifonos-sony.png', 'https://www.mercadolibre.com.mx/p/MLM2100001', 'MLM2100001', 4.7, 1892, 'active', false),
    ('01930000-0000-7000-8000-000000000003', 'Audífonos Sony WH-1000XM5 Cancelación de Ruido', 'Cancelación de ruido activa líder en la industria, sonido Hi-Res y batería de hasta 30 horas.', 'electronica', 'amazon', 499900, 729900, 32, 'MXN', '/img/productos/audifonos-sony.png', 'https://www.amazon.com.mx/dp/B09XS7JWHH', 'B09XS7JWHH', 4.8, 3120, 'active', false),
    ('01930000-0000-7000-8000-000000000004', 'Freidora de Aire Oster 4L Digital', 'Cocina saludable con hasta 99.5% menos aceite, recubrimiento antiadherente DiamondForce.', 'hogar', 'mercadolibre', 119900, 199900, 40, 'MXN', '/img/productos/freidora-oster.png', 'https://www.mercadolibre.com.mx/p/MLM2300001', 'MLM2300001', 4.6, 918, 'active', false),
    ('01930000-0000-7000-8000-000000000005', 'Cafetera Espresso De Longhi Dedica', 'Bomba de 15 bares, sistema de calentamiento rápido Thermoblock y acabado en acero inoxidable.', 'hogar', 'mercadolibre', 499900, 649900, 23, 'MXN', '/img/productos/freidora-oster.png', 'https://www.mercadolibre.com.mx/p/MLM2300002', 'MLM2300002', 4.9, 1420, 'active', false),
    ('01930000-0000-7000-8000-000000000006', 'Tenis Nike Air Force 1 07 Blanco', 'Estilo clásico con amortiguación Nike Air para comodidad durante todo el día.', 'moda', 'mercadolibre', 189900, 249900, 24, 'MXN', '/img/productos/nike-force.png', 'https://www.mercadolibre.com.mx/p/MLM2400001', 'MLM2400001', 4.9, 3120, 'active', false),
    ('01930000-0000-7000-8000-000000000007', 'Mochila Antirrobo Impermeable 15.6 Pulgadas', 'Puerto de carga USB integrado, compartimentos ocultos y tejido resistente a desgarros.', 'moda', 'mercadolibre', 44900, 69900, 36, 'MXN', '/img/productos/nike-force.png', 'https://www.mercadolibre.com.mx/p/MLM2400002', 'MLM2400002', 4.6, 780, 'active', false),
    ('01930000-0000-7000-8000-000000000008', 'Tapete de Yoga Antideslizante Pro 6mm', 'Material TPE ecológico, líneas de alineación corporal y amortiguación de alta densidad.', 'deportes', 'mercadolibre', 39900, 59900, 33, 'MXN', '/img/productos/nike-force.png', 'https://www.mercadolibre.com.mx/p/MLM2500001', 'MLM2500001', 4.8, 654, 'active', false),
    ('01930000-0000-7000-8000-000000000009', 'Mancuernas Ajustables 20 kg con Barra Conectora', 'Diseño versátil 2 en 1 que se convierte en barra olímpica, discos con recubrimiento protector.', 'deportes', 'mercadolibre', 169900, 229900, 26, 'MXN', '/img/productos/nike-force.png', 'https://www.mercadolibre.com.mx/p/MLM2500002', 'MLM2500002', 4.7, 430, 'active', false),
    ('01930000-0000-7000-8000-000000000010', 'Taladro Percutor Inalámbrico 20V DeWalt', 'Motor Brushless sin escobillas para mayor autonomía y vida útil, incluye dos baterías y cargador.', 'herramientas', 'mercadolibre', 279900, 369900, 24, 'MXN', '/img/productos/freidora-oster.png', 'https://www.mercadolibre.com.mx/p/MLM2600001', 'MLM2600001', 4.9, 1105, 'active', false),
    ('01930000-0000-7000-8000-000000000011', 'Serum Vitamina C Facial Antiedad Garnier', 'Fórmula con alta concentración de vitamina C, unifica el tono de la piel y reduce manchas.', 'belleza', 'mercadolibre', 18900, 26900, 30, 'MXN', '/img/productos/apple-watch.png', 'https://www.mercadolibre.com.mx/p/MLM2700001', 'MLM2700001', 4.7, 2980, 'active', false),
    ('01930000-0000-7000-8000-000000000012', 'Silla Ergonómica de Oficina con Soporte Lumbar', 'Malla transpirable, soporte lumbar adaptable y reposabrazos ajustables 3D.', 'oficina', 'mercadolibre', 219900, 319900, 31, 'MXN', '/img/productos/freidora-oster.png', 'https://www.mercadolibre.com.mx/p/MLM2800001', 'MLM2800001', 4.8, 1450, 'active', false)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO price_history (id, product_id, price_cents, recorded_at)
  SELECT
    ('01930000-0000-7000-8000-10000000' || lpad(row_number() OVER ()::text, 4, '0'))::uuid,
    p.id,
    p.original_price_cents,
    now() - interval '90 days'
  FROM products p WHERE p.original_price_cents IS NOT NULL
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO price_history (id, product_id, price_cents, recorded_at)
  SELECT
    ('01930000-0000-7000-8000-20000000' || lpad(row_number() OVER ()::text, 4, '0'))::uuid,
    p.id,
    p.price_cents + (p.original_price_cents - p.price_cents) / 2,
    now() - interval '30 days'
  FROM products p WHERE p.original_price_cents IS NOT NULL
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO price_history (id, product_id, price_cents, recorded_at)
  SELECT
    ('01930000-0000-7000-8000-30000000' || lpad(row_number() OVER ()::text, 4, '0'))::uuid,
    p.id,
    p.price_cents,
    now()
  FROM products p
  ON CONFLICT (id) DO NOTHING;`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent_color varchar(20) NOT NULL DEFAULT '#4338ca';
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url varchar(2048);
  INSERT INTO users (id, name, email, password_hash, is_admin, verified_at)
  VALUES (
    '01930000-0000-7000-8000-000000000099',
    'Carlos M.',
    'carlos@ofertasaldia.online',
    '$2b$12$e/cOaOqjW.8K9b9N2lZ8s.iJ8t7K5y6n1g3q4w5e6r7t8y9u0i1o2',
    false,
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO profiles (user_id, alias, description, location, avatar_url, cover_url, accent_color, social_links)
  VALUES (
    '01930000-0000-7000-8000-000000000099',
    'carlos-tech',
    'Apasionado por la tecnología y los gadgets. Comparto las mejores oportunidades de Amazon y Mercado Libre que realmente valen la pena.',
    'México',
    '/img/afiliado/carlos.png',
    '/img/hero-banner.jpg',
    '#4338ca',
    '[{"red":"youtube","url":"https://www.youtube.com"},{"red":"instagram","url":"https://www.instagram.com"},{"red":"tiktok","url":"https://www.tiktok.com"},{"red":"enlace","url":"https://ofertasaldia.online/c/carlos-tech"}]'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;`,
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
