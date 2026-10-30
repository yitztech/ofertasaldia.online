import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/portada.tsx"),
  route("*", "routes/no-encontrado.tsx"),
] satisfies RouteConfig;
