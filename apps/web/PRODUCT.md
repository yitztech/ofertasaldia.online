# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Compradores en México**: Personas que buscan ofertas reales en Mercado Libre México (tecnología, hogar, cocina, audio, videojuegos, mascotas, cuidado personal y deporte) sin caer en descuentos inflados o falsos. Quieren saber de un vistazo si el precio está verificado, cuánto bajó respecto al precio regular, cómo se ha comportado en los últimos 90 días y quién recomienda el producto.
- **Creadores de contenido y curadores**: Recomendadores que comparten hallazgos de Mercado Libre con su audiencia a través de enlaces de afiliado (`meli.la` y `mercadolibre.com.mx`), mantienen su propia página pública (`/c/<alias>`) y gestionan sus publicaciones y clics desde su panel (`/panel`).

## Product Purpose

OfertasAlDía reúne recomendaciones de productos de Mercado Libre México curadas por personas (creadores y el equipo editorial de la casa) y respaldadas por verificación automática y periódica de precios y disponibilidad. El éxito significa que el visitante descubre ofertas legítimas en segundos, confía en el dato de verificación e historial, y pasa a Mercado Libre a concretar su compra con atribución justa para el creador.

## Positioning

A diferencia de los agregadores automáticos llenos de ruido o de los listados algorítmicos sin contexto, cada oferta en OfertasAlDía combina la recomendación escrita por una persona con la comprobación técnica del precio y disponibilidad directamente contra Mercado Libre, incluyendo la marca de tiempo de verificación y el historial de 90 días.

## Operating Context

- Navegación principalmente desde móvil y escritorio en México (`es-MX`, precios en `MXN` con centavos enteros).
- Integración con el catálogo y CDN de imágenes de Mercado Libre (`http2.mlstatic.com`) y láminas temáticas cuando un producto no tiene fotografía.
- Páginas públicas cacheadas en el gateway con SSR en React Router 8, encabezados CSP estrictos con `nonce` por petición, y redirección de afiliado en `/ir/<id>`.

## Capabilities and Constraints

- **Rutas y flujos existentes que deben preservarse**:
  - Portada (`/`) con escaparate de la mayor rebaja, navegación por temáticas, carril de recién publicadas y carriles por categoría.
  - Buscador y filtros (`/buscar`) con autocompletado (`/api/buscar/sugerencias`), filtro por temática, rango de precio en pesos, descuento mínimo, disponibilidad, orden y paginación por cursor.
  - Ficha de producto (`/oferta/<slug>-<id>` y `/c/<alias>/<slug>-<id>`) con precio verificado, sello de descuento, estado de disponibilidad, botón de compra a `/ir/<id>`, seguir oferta, solicitar revalidación de precio, compartir (WhatsApp, correo, Web Share / copiar enlace), envío por correo, historial SVG de 90 días, lista de quién lo recomienda y productos relacionados/alternativas.
  - Perfil público de creador (`/c/<alias>`) con su color de acento (`--acento`), descripción, enlaces a redes, filtro por categoría y tarjetas de recomendaciones.
  - Autenticación (`/entrar`, `/registro`, `/verificar`, `/salir`) y panel de creador (`/panel`) para editar página (`/c/<alias>`), publicar ofertas con enlace de afiliado y administrar el estado (`publicada` / `retirada`) y clics de cada recomendación.
  - Páginas legales (`/privacidad`, `/terminos`) y manejo de errores 404/410.
- **Restricciones técnicas y de plataforma**:
  - Idioma único: español de México, tuteo.
  - Librería de componentes: arquitectura **shadcn/ui** sobre Tailwind CSS y primitivas accesibles (Radix UI / CVA / `cn`).
  - Cumplimiento estricto de `AGENTS.md`: controles táctiles de mínimo 44 px, sin desplazamiento horizontal a 360 px, validación de nombres (`NOMBRE_CARACTER_RE`) y longitudes máximas (`@ofertas/contrato`), HTML semántico y accesibilidad WCAG 2.2 AA, y compatibilidad total con CSP por nonce y pruebas automatizadas.

## Brand Commitments

- Nombre del sitio: **OfertasAlDía**.
- Voz clara, directa, en español de México (tuteo), honesta sobre los enlaces de afiliado y sobre el hecho de que la compra siempre ocurre en Mercado Libre.

## Evidence on Hand

- Catálogo real y de demostración sincronizado desde Mercado Libre (9 temáticas × 10 productos, creadores verificados y recomendaciones de la casa) en `services/sync/cmd/meli-doble/catalogo.json`.
- Historial de precios de 90 días renderizado en servidor como gráfico SVG accesible.
- Contadores reales de vistas, comparticiones, seguidores y clics por recomendación.

## Product Principles

1. **La prueba antes que la promesa**: el precio actual, el descuento real, la disponibilidad y hace cuánto se verificó siempre son protagonistas y se leen con precisión tabular.
2. **Curaduría con rostro**: toda oferta muestra claramente quién la recomienda (la casa o un creador con su nota y enlace propio) sin ocultar la naturaleza de afiliado.
3. **Velocidad y claridad móvil**: primero móvil (360 px+), controles táctiles generosos (44 px), carga inmediata con SSR y cero fricción entre descubrir, filtrar y comprar en Mercado Libre.
4. **Componentes consistentes y accesibles**: sistema de diseño estructurado con primitivos `shadcn/ui`, semántica nativa y estados claros de foco, carga, vacío y error.

## Accessibility & Inclusion

- Cumplimiento WCAG 2.2 AA: navegación completa por teclado, enlace para saltar al contenido, asociación explícita de `label` y mensajes de error/ayuda (`aria-invalid`, `aria-describedby`), contraste verificado, `prefers-reduced-motion` respetado y áreas táctiles mínimas de 44 × 44 px.
