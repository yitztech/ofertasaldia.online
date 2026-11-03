/** Longitudes máximas (AGENTS §6.3). Un solo sitio: frontend y mensajes salen de aquí. */
export const limites = {
  nombreCompleto: 50,
  alias: 50,
  correo: 254,
  contrasena: 128,
  ubicacion: 200,
  busqueda: 100,
  url: 2048,
  descripcion: 5000,
} as const;

export const contrasenaMinima = 8;
