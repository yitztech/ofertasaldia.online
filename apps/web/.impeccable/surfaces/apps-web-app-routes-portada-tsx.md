---
version: 1
slug: "apps-web-app-routes-portada-tsx"
primary_target: "apps/web/app/routes/portada.tsx"
related_targets: ["apps/web/app/root.tsx","apps/web/app/routes/buscar.tsx","apps/web/app/componentes/ficha.tsx","apps/web/app/routes/creador.tsx","apps/web/app/routes/panel.tsx"]
---

# Surface Brief: OfertasAlDía Web (shadcn/ui Redesign)

## Scope & Mode

- **Mode**: Persuade (portada y escaparate de ofertas) + Operate (búsqueda con filtros, fichas de producto, perfiles de creador y panel de administración de recomendaciones).
- **Targets**: `apps/web/app/root.tsx`, `apps/web/app/routes/portada.tsx`, `apps/web/app/routes/buscar.tsx`, `apps/web/app/componentes/ficha.tsx`, `apps/web/app/routes/creador.tsx`, `apps/web/app/routes/panel.tsx`, `apps/web/app/routes/entrar.tsx`, `apps/web/app/routes/registro.tsx`, `apps/web/app/routes/verificar.tsx`.

## Direction contract

- **THESIS**: Un boletín técnico de consumo y pruebas de calidad (*Laboratorio del Consumidor / PROFECO*) construido sobre primitivos `shadcn/ui`, donde cada oferta de Mercado Libre se presenta como un dictamen verificado con sello de descuento, hora exacta de comprobación y curador responsable, rechazando el aspecto de tienda genérica de cupones o plantilla gris sin carácter.
- **OWN-WORLD**: Papel marfil técnico (`#FAF8F5`) y tarjetas blancas de dictamen (`#FFFFFF`) con bordes estructurados de `1px` (`#DDD9D0`), tinta carbón profundo (`#141413`), azul cobalto de certificación (`#1D4ED8`) como acción primaria y sello ámbar de hallazgo (`#D97706`) para los descuentos, con soporte completo de modo oscuro (`#0F1115` / `#161920` / `#60A5FA` / `#F59E0B`), tipografía display `Bricolage Grotesque Variable` combinada con `Instrument Sans Variable` y cifras tabulares estrictas.
- **STORY**: El visitante comprende al instante que cada producto fue elegido por una persona real y su precio fue comprobado técnicamente en Mercado Libre; confía en el porcentaje de rebaja y el historial de 90 días, y actúa filtrando por temática o abriendo la ficha certificada para comprar en Mercado Libre.
- **FIRST VIEWPORT**: Cabecera técnica fija con buscador integrado tipo barra de comando `shadcn/ui`, seguida de un bloque editorial de dos columnas en escritorio (manifiesto y tres garantías de verificación a la izquierda; expediente destacado de «La mayor rebaja ahora» con sello de descuento, precio tabular gigante y firma de verificador a la derecha) y una cinta horizontal de pestañas/chips de temáticas con iconos antes del primer carril de recién publicadas.
- **FORM**: Candidato #1 de la lista fundamentada (*Laboratorio del Consumidor / Boletín de Pruebas*), `seed:1d6071d85393fd99`.
- **FINISH**: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
