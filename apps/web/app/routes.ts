import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/portada.tsx"),
  route("entrar", "routes/entrar.tsx"),
  route("registro", "routes/registro.tsx"),
  route("recuperar", "routes/recuperar.tsx"),
  route("restablecer", "routes/restablecer.tsx"),
  route("panel", "routes/panel.tsx"),
  route("c/:alias", "routes/afiliado.tsx"),
  route("*", "routes/no-encontrado.tsx"),
] satisfies RouteConfig;
