import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";

export const streamTimeout = 5_000;

/**
 * El gateway fija la CSP con `'nonce-<X-Request-ID>'` (gateway/snippets/security-headers.conf):
 * ese identificador aleatorio, que el gateway sobrescribe en cada petición, es el nonce de los
 * scripts en línea de React Router. Sin gateway (desarrollo) no hay CSP y no se necesita.
 */
function nonceDe(request: Request) {
  const id = request.headers.get("x-request-id");
  return id && /^[a-f0-9]{32}$/.test(id) ? id : undefined;
}

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  // https://httpwg.org/specs/rfc9110.html#HEAD
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  return new Promise<Response>((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");

    // Los robots esperan al contenido completo; el resto recibe el HTML en cuanto está el armazón.
    const readyOption = (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";

    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(() => abort(), streamTimeout + 1000);

    const nonce = nonceDe(request);
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} nonce={nonce} />,
      {
        // También los scripts en línea que React inyecta al hacer streaming
        nonce,
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          pipe(body);
          resolve(new Response(stream, { headers: responseHeaders, status: responseStatusCode }));
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Los errores del armazón ya los registra handleDocumentRequest; aquí solo los del streaming.
          if (shellRendered) console.error(error);
        },
      },
    );
  });
}
