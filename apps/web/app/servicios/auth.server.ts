export interface UsuarioSesion {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function obtenerUsuario(request: Request): Promise<UsuarioSesion | null> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  try {
    const res = await fetch(`${process.env.API_URL ?? 'http://api:3001'}/api/auth/me`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return (await res.json()) as UsuarioSesion;
    }
    return null;
  } catch {
    return null;
  }
}

export async function authRequest(request: Request, path: string, body: unknown) {
  const origin = request.headers.get('origin');
  const site = process.env.SITE_URL;
  if (!site || origin !== site) return new Response(null, { status: 403 });
  return fetch(`${process.env.API_URL ?? 'http://api:3001'}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin, 'x-csrf': '1', cookie: request.headers.get('cookie') ?? '', 'x-real-ip': request.headers.get('x-real-ip') ?? '' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
    redirect: 'error',
  });
}
