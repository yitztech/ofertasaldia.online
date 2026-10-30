---
name: OfertasAlDía
description: Boletín técnico de consumo y ofertas verificadas de Mercado Libre México sobre shadcn/ui
colors:
  primary: "#1d4ed8"
  primary-hover: "#1e40af"
  deal-amber: "#b45309"
  verified-green: "#15803d"
  danger-red: "#b91c1c"
  technical-ivory: "#faf8f5"
  dossier-white: "#ffffff"
  secondary-stone: "#f1eee8"
  cobalt-tint: "#e8eefc"
  carbon-ink: "#141413"
  muted-slate: "#524f49"
  rule-border: "#dbd6cc"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, Instrument Sans Variable, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 750
    lineHeight: 1.08
    letterSpacing: "-0.022em"
  display-mobile:
    fontFamily: "Bricolage Grotesque Variable, Instrument Sans Variable, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 750
    lineHeight: 1.08
  headline:
    fontFamily: "Bricolage Grotesque Variable, Instrument Sans Variable, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.022em"
  headline-mobile:
    fontFamily: "Bricolage Grotesque Variable, Instrument Sans Variable, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.15
  price-card:
    fontFamily: "Bricolage Grotesque Variable, Instrument Sans Variable, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "Instrument Sans Variable, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.32
  body:
    fontFamily: "Instrument Sans Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Instrument Sans Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "44px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.dossier-white}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.dossier-white}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  badge-discount:
    backgroundColor: "{colors.deal-amber}"
    textColor: "{colors.dossier-white}"
    rounded: "{rounded.sm}"
    padding: "2px 10px"
  card-dossier:
    backgroundColor: "{colors.dossier-white}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.xl}"
    padding: "20px"
---

# Design System: OfertasAlDía

## Overview

**Creative North Star: "El Laboratorio del Consumidor"**

OfertasAlDía se diseña como un boletín técnico de pruebas de calidad y verificación de precios (*Revista del Consumidor / PROFECO*) construido con primitivos **shadcn/ui** (`Button`, `Badge`, `Card`, `Input`, `Label`, `NativeSelect`, `Textarea`, `Alert`, `Avatar`, `Separator`, `Table`). Cada producto recomendado por un creador o por la casa se presenta como un expediente verificado: precio actual en cifras tabulares, precio anterior tachado, porcentaje real de rebaja en sello ámbar y marca de tiempo de la última comprobación contra Mercado Libre.

El sistema rechaza tanto el caos visual de las páginas de cupones saturadas como la frialdad anónima de una plantilla SaaS gris por defecto. La superficie combina papel marfil técnico (`#faf8f5`) con fichas blancas de dictamen (`#ffffff`) delimitadas por filetes estructurales de `1px` (`#dbd6cc`), acciones principales en azul cobalto de certificación (`#1d4ed8`) y modo oscuro automático de alto contraste.

**Key Characteristics:**
- Primitivos `shadcn/ui` propios en `apps/web/app/components/ui/` con variantes CVA (`class-variance-authority`) y composición polimórfica (`@radix-ui/react-slot`).
- Cifras tabulares (`tabular-nums`) obligatorias en precios, porcentajes de descuento, contadores y ejes de historial.
- Separación estructural mediante filetes de `1px` y costuras punteadas (`1px dashed`) entre el dictamen del producto y la atribución del creador.
- Áreas táctiles mínimas de `44 × 44 px` (`min-h-11`) en todos los controles interactivos y navegación primero móvil desde `360 px`.

## Colors

La paleta equilibra un fondo cálido de papel técnico con acentos semánticos de certificación (cobalto), hallazgo de ahorro (ámbar) y verificación activa (verde).

### Primary
- **Cobalt Certification** (`#1d4ed8`, hover `#1e40af`, dark `#60a5fa`): Reservado para las acciones primarias (`Comprar en Mercado Libre`, `Buscar`, `Guardar`), enlaces editoriales, anillos de foco (`--ring`) y el emblema de verificación de la marca.

### Secondary
- **Finding Amber** (`#b45309`, dark `#f59e0b`): Exclusivo para los sellos de porcentaje de descuento (`Badge variant="discount"`) y avisos de atención.

### Tertiary
- **Verified Green** (`#15803d`, dark `#4ade80`): Indicador de disponibilidad activa y escudo de «Precio verificado hace X min».
- **Alert Crimson** (`#b91c1c`, dark `#f87171`): Errores de validación por campo (`aria-invalid="true"`) e insignia de producto agotado.

### Neutral
- **Technical Ivory** (`#faf8f5`, dark `#0f1115`): Papel base de la página (`--background`).
- **Dossier White** (`#ffffff`, dark `#161920`): Superficie de tarjetas de producto, cabecera de ficha, tabla del panel y contenedores de formulario (`--card`).
- **Secondary Stone** (`#f1eee8`, dark `#1f242d`): Fondos de garantías, cabeceras de tabla y estados hover secundarios (`--secondary`).
- **Carbon Ink** (`#141413`, dark `#f3f4f6`): Tinta principal de alta legibilidad (`--foreground`).
- **Muted Slate** (`#524f49`, dark `#a3aab8`): Texto secundario, metadatos de verificación y notas de ayuda con contraste WCAG AA ≥ 4.5:1 (`--muted-foreground`).
- **Rule Border** (`#dbd6cc`, dark `#2a303c`): Filete técnico de `1px` en tarjetas, tablas, campos y divisores (`--border`).

### Named Rules
**The Two-Signal Rule.** El azul cobalto (`#1d4ed8`) indica acción o navegación; el ámbar (`#b45309`) indica ahorro porcentual; el verde (`#15803d`) confirma verificación técnica. Nunca se intercambian sus roles.

**The Creator Scope Rule.** En las páginas públicas de creador (`/c/<alias>`), la variable `--acento` elegida por el creador redefine `--primary` y `--ring` dentro de `.pagina-creador`, manteniendo intactos los tokens de superficie, borde y lectura.

## Typography

**Display Font:** `Bricolage Grotesque Variable` (con respaldo en `Instrument Sans Variable` y `system-ui`)
**Body Font:** `Instrument Sans Variable` (con respaldo en `system-ui`, `-apple-system`, `sans-serif`)

**Character:** `Bricolage Grotesque` aporta autoridad editorial e impacto inmediato en precios y titulares, mientras que `Instrument Sans` ofrece lectura clara y compacta en descripciones, tablas, filtros y formularios.

### Hierarchy
- **Display** (`800`, `clamp(2.25rem, 5.2vw, 4rem)`, `line-height: 1.02`, `letter-spacing: -0.035em`): Titular principal de portada y precios destacados (`clamp(2rem, 4vw, 2.75rem)`).
- **Headline H1** (`760`, `clamp(1.75rem, 4.2vw, 2.5rem)`, `line-height: 1.08`, `letter-spacing: -0.024em`): Títulos de ficha de producto, búsqueda, perfil de creador y panel.
- **Section H2** (`720`, `clamp(1.25rem, 2.4vw, 1.55rem)`, `line-height: 1.15`): Encabezados de sección con filete inferior.
- **Card Price** (`800`, `1.35rem`, `line-height: 1`): Precio principal verificado en tarjetas de producto.
- **Card Title H3** (`600`, `0.95rem`, `line-height: 1.32`): Títulos de producto en tarjetas de dos líneas como máximo (`line-clamp-2`).
- **Body** (`400`, `1rem`, `line-height: 1.55`, medida máxima `72ch`): Descripciones de producto, notas de recomendación y textos legales.
- **Label** (`600`, `0.875rem` y `0.75rem`, `line-height: 1.25`): Etiquetas de formulario (`Label` de `shadcn/ui`), migas de pan (`Breadcrumb`), pestañas (`TabsList`) y encabezados de tabla.

### Named Rules
**The Tabular Price Rule.** Todo precio (`$1,299`), precio anterior tachado, porcentaje de descuento (`−35 %`), contador de vistas/clics y leyenda del historial de 90 días se renderiza con `font-variant-numeric: tabular-nums`.

## Layout

El contenedor principal (`.contenedor`) tiene un ancho máximo de `78rem` (`1248px`) con relleno lateral de `16px` en móvil y `24px` desde `720px`.
- **Portada**: Bloque superior dividido en escritorio (`960px+`) entre la presentación con garantías (`1fr`) y el expediente destacado de la mayor rebaja (`minmax(340px, 420px)`), seguido de la barra horizontal de temáticas y carriles de productos (deslizables con `scroll-snap-type: x mandatory` en móvil y rejilla de 5 columnas desde `1100px`).
- **Búsqueda (`/buscar`)**: Panel de filtros en tarjeta superior (`2` columnas en móvil, `4` columnas desde `900px`) sobre una rejilla adaptable (`.rejilla`, `minmax(154px, 1fr)` en móvil y `minmax(210px, 1fr)` desde `720px`).
- **Ficha (`/oferta/…`)**: Cabecera de expediente en dos columnas desde `820px` (`minmax(280px, 400px) 1fr`), seguida de secciones apiladas para descripción, tarjetas de recomendadores, gráfico SVG de 90 días y carril de relacionados.

## Elevation & Depth

El sistema utiliza una jerarquía híbrida de bordes técnicos de `1px` (`--border`) combinados con sombras ambientales suaves de desplazamiento vertical.

### Shadow Vocabulary
- **Resting Card (`--sombra`)** (`0 1px 2px rgb(20 20 19 / 0.05), 0 6px 16px -6px rgb(20 20 19 / 0.09)`): Aplicada a contenedores de ficha, filtros y formularios.
- **Elevated / Hover (`--sombra-alta`)** (`0 2px 4px rgb(20 20 19 / 0.06), 0 16px 32px -12px rgb(20 20 19 / 0.16)`): Aplicada al expediente destacado de portada y al estado `:hover` de las tarjetas de producto junto con una traslación de `translateY(-2px)`.

### Named Rules
**The Border-First Rule.** Ninguna superficie confía únicamente en la sombra para separarse del fondo: toda tarjeta, alerta, tabla y control lleva un borde explícito de `1px solid var(--border)`.

## Shapes

Radio base de `10px` (`--radius: 0.625rem`):
- Botones, campos de entrada (`Input`), selectores (`NativeSelect`) y chips de temática usan `8px–10px` (`rounded-lg`).
- Tarjetas de producto (`Card`), panel de filtros, cabecera de ficha y tabla desplazable usan `14px` (`rounded-xl`).
- Sellos de descuento (`Badge`) usan esquinas técnicas compactas de `6px` (`rounded-md`).

## Components

### Buttons (`app/components/ui/button.tsx`)
- **Shape:** Esquinas técnicas redondeadas (`8px`), altura mínima obligatoria de `44px` (`min-h-11`).
- **Primary (`default`):** Fondo azul cobalto (`#1d4ed8`), texto blanco (`#ffffff`), borde `#1d4ed8`; en `:hover` pasa a `#1e40af` y en `:active` aplica `scale(0.98)`.
- **Secondary (`secondary`):** Fondo de ficha (`--card`), texto `--foreground`, borde `--border`, con `:hover` en `--secondary` (`#f1eee8`).
- **Large CTA (`size="lg"`):** Ancho completo (`w-full`), altura mínima de `52px` (`min-h-13`), usado para el botón principal «Comprar en Mercado Libre».

### Chips (`tema-chip` & `chips`)
- **Style:** Controles de `44px` de alto con fondo `--card`, borde `1px solid var(--border)` e icono coloreado según el tono (`--tono`) de cada categoría en OKLCH.
- **State:** En `:hover` adoptan un tinte suave del tono de la categoría; en filtros activos (`aria-current="page"`) toman fondo `--primary` y texto `--primary-foreground`.

### Cards / Containers (`app/components/ui/card.tsx` & `Tarjeta`)
- **Corner Style:** `14px` (`rounded-xl`).
- **Background & Border:** Fondo `--card` (`#ffffff` en claro, `#161920` en oscuro) con borde `1px solid var(--border)` y recuadro interno de fotografía con su propio filete de `1px`.
- **Attribution Footer:** El pie de cada tarjeta de producto separa al creador mediante una línea punteada (`1px dashed var(--border)`).

### Inputs / Fields (`app/components/ui/input.tsx`, `select.tsx`, `textarea.tsx`)
- **Style:** Altura mínima de `44px` (`min-h-11`), fondo `--card`, borde `1px solid var(--input)` (`#c9c3b8`) y radio de `8px`.
- **Focus:** Borde `--ring` (`#1d4ed8`) y halo `ring-3 ring-ring/20`.
- **Error:** Cuando `aria-invalid="true"`, el borde cambia a `--destructive` (`#b91c1c`) acompañado de mensaje `.error-campo`.

### Navigation (`.cabecera` & `.temas-nav`)
- **Header:** Barra fija superior (`position: sticky; top: 0`) con fondo translúcido (`backdrop-filter: blur(10px)`), logotipo con insignia cobalto, buscador central integrado y botón de acceso a cuenta/panel.

### Signature Component: Product Dossier Card (`Tarjeta` & `VistaFicha`)
Cada producto combina imagen cuadrada (`aspect-ratio: 1`) o lámina temática generativa en OKLCH (`.lamina`), insignia flotante de descuento (`Badge variant="discount"`), precio actual en `Bricolage Grotesque`, estado de verificación con marca de tiempo relativa (`Verificado`) y firma del recomendador con avatar.

## Do's and Don'ts

### Do:
- **Do** usar los primitivos de `apps/web/app/components/ui/` (`Button`, `Badge`, `Card`, `Input`, `Label`, `NativeSelect`, `Textarea`, `Alert`, `Table`) y el helper `cn()` para toda interfaz nueva o modificada.
- **Do** mantener un tamaño mínimo de `44 × 44 px` en botones, enlaces de navegación, casillas y campos de formulario.
- **Do** aplicar `font-variant-numeric: tabular-nums` en cualquier cifra de precio, descuento o métrica.

### Don't:
- **Don't** colocar etiquetas superiores (*kickers* o *eyebrows*) encima de los encabezados `<h1>`, `<h2>` o `<h3>`; los encabezados llevan su propio peso jerárquico.
- **Don't** anidar componentes `<Card>` dentro de otro `<Card>`; usa divisores (`Separator`), bordes punteados o espaciado interno.
- **Don't** usar sombras duras desplazadas (`4px 4px 0`) ni bordes laterales gruesos de color (`border-left: 4px`) en tarjetas o alertas.
