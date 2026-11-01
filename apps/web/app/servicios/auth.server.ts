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
