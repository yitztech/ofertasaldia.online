import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/portada.tsx"),
  route("healthz", "routes/healthz.ts"),
  route("entrar", "routes/entrar.tsx"),
  route("registro", "routes/registro.tsx"),
  route("recuperar", "routes/recuperar.tsx"),
  route("restablecer", "routes/restablecer.tsx"),
  route("verificar", "routes/verificar.tsx"),
  route("planes", "routes/planes.tsx"),
  route("blog", "routes/blog.tsx"),
  route("blog/:slug", "routes/articulo.tsx"),
  route("panel", "routes/panel.tsx"),
  route("panel/articulos", "routes/panel-articulos.tsx"),
  route("panel/articulos/nuevo", "routes/panel-articulo-nuevo.tsx"),
  route("c/:alias", "routes/afiliado.tsx"),
  route("*", "routes/no-encontrado.tsx"),
] satisfies RouteConfig;
