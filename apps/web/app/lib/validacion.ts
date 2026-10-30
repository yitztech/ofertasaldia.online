import { contrasenaMinima, limites } from "./limites";

export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

/** AGENTS §6.2: letras de cualquier idioma, espacios, apóstrofo, guion y punto. */
export const NOMBRE_RE = /^[\p{L}\p{M}](?:[\p{L}\p{M} '’.-]*[\p{L}\p{M}.])?$/u;
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Quita espacios de los extremos y junta los repetidos antes de validar. */
export const normalizarEspacios = (texto: string) => texto.trim().replace(/\s+/g, " ");

/** Descarta al escribir o pegar lo que no sea una letra del nombre. */
export const limpiarNombre = (texto: string) => texto.replace(/[^\p{L}\p{M} '’.-]/gu, "");

export function validarNombre(valor: string): string | null {
  const nombre = normalizarEspacios(valor);
  if (!nombre) return "Escribe tu nombre.";
  if (nombre.length > limites.nombreCompleto) return `Usa máximo ${limites.nombreCompleto} caracteres.`;
  if (!NOMBRE_RE.test(nombre)) return "Solo letras, espacios, apóstrofo, guion y punto.";
  return null;
}

export function validarCorreo(valor: string): string | null {
  const correo = valor.trim();
  if (!correo) return "Escribe tu correo electrónico.";
  if (correo.length > limites.correo) return `Usa máximo ${limites.correo} caracteres.`;
  if (!CORREO_RE.test(correo)) return "El correo no es válido.";
  return null;
}

export interface ReglaContrasena {
  id: "longitud" | "mayuscula" | "numero" | "simbolo";
  texto: string;
  cumple: boolean;
}

export function reglasContrasena(valor: string): ReglaContrasena[] {
  return [
    { id: "longitud", texto: `Al menos ${contrasenaMinima} caracteres`, cumple: valor.length >= contrasenaMinima },
    { id: "mayuscula", texto: "Una letra mayúscula", cumple: /\p{Lu}/u.test(valor) },
    { id: "numero", texto: "Un número", cumple: /\d/.test(valor) },
    { id: "simbolo", texto: "Un símbolo (ej. !@#$%)", cumple: /[^\p{L}\p{N}\s]/u.test(valor) },
  ];
}

export function validarContrasenaSimple(valor: string): string | null {
  if (!valor) return "Escribe tu contraseña.";
  if (valor.length > limites.contrasena) return `Usa máximo ${limites.contrasena} caracteres.`;
  return null;
}

export function validarContrasenaNueva(valor: string): string | null {
  const simple = validarContrasenaSimple(valor);
  if (simple) return simple;
  if (valor.length < contrasenaMinima) return `Usa mínimo ${contrasenaMinima} caracteres.`;
  return null;
}

export function recolectar(...errores: (ErrorCampo | null)[]): Record<string, string> {
  return Object.fromEntries(errores.filter((e): e is ErrorCampo => e !== null).map((e) => [e.campo, e.mensaje]));
}

export const aError = (campo: string, mensaje: string | null): ErrorCampo | null =>
  mensaje ? { campo, mensaje } : null;
