import crypto from "node:crypto";

/**
 * Genera un identificador UUIDv7 conforme a RFC 9562 (§21 de AGENTS.md).
 * Prioriza crypto.randomUUIDv7 nativo y recurre a implementación estándar RFC 9562 si no existe.
 */
export function uuidv7(): string {
  const nodeCrypto = crypto as typeof crypto & {
    randomUUIDv7?: () => string;
  };
  if (typeof nodeCrypto.randomUUIDv7 === "function") {
    return nodeCrypto.randomUUIDv7();
  }

  const now = Date.now();
  const bytes = crypto.randomBytes(16);

  // 48 bits de timestamp Unix en milisegundos
  bytes[0] = Math.floor(now / 0x10000000000) & 0xff;
  bytes[1] = Math.floor(now / 0x100000000) & 0xff;
  bytes[2] = Math.floor(now / 0x1000000) & 0xff;
  bytes[3] = Math.floor(now / 0x10000) & 0xff;
  bytes[4] = Math.floor(now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // Versión 7 (0111) en los 4 bits más significativos del byte 6
  bytes[6] = 0x70 | (bytes[6] & 0x0f);

  // Variante RFC 4122/9562 (10xx) en los 2 bits más significativos del byte 8
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
