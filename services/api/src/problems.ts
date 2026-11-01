import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
@Catch()
export class Problems implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    if (request.url.split("?")[0] === "/api/health")
      return reply.code(503).send({ status: "error" });
    const raw = error instanceof HttpException ? error.getResponse() : null;
    const body =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const header = request.headers["x-request-id"];
    const requestId =
      typeof header === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(header)
        ? header
        : randomUUID();
    if (status >= 500)
      console.error(
        JSON.stringify({
          time: new Date().toISOString(),
          level: "error",
          requestId,
          event: "request_failed",
          status,
        }),
      );
    if (status === 429) reply.header("Retry-After", "900");
    return reply
      .code(status)
      .type("application/problem+json")
      .send({
        type: "about:blank",
        title:
          typeof body.title === "string"
            ? body.title
            : "No se pudo completar la solicitud",
        status,
        code:
          typeof body.code === "string"
            ? body.code
            : status === 404
              ? "not_found"
              : "request_failed",
        detail:
          typeof body.detail === "string" ? body.detail : "Inténtalo de nuevo.",
        requestId,
      });
  }
}
