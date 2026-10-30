/** Dominio público para los enlaces de perfil. Con backend saldrá de SITE_URL (README). */
export const SITIO = "https://ofertasaldia.online";

export const urlPerfil = (alias: string) => `${SITIO}/c/${alias}`;
