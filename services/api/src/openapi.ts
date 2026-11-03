export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "OfertasAlDía API",
    version: "1.0.0",
    description: "API de OfertasAlDía para autenticación, catálogo, ofertas y administración.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/api/health": {
      get: {
        summary: "Salud del servicio y conectividad a base de datos",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "Servicio disponible y base de datos conectada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["ok"] } },
                },
              },
            },
          },
          "503": {
            description: "Base de datos inaccesible o migraciones pendientes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["error"] } },
                },
              },
            },
          },
        },
      },
    },
    "/api/categories": {
      get: {
        summary: "Listado de categorías",
        operationId: "getCategories",
        responses: {
          "200": {
            description: "Lista de categorías",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "nextCursor"],
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "name"],
                        properties: {
                          id: { type: "string", maxLength: 50 },
                          name: { type: "string", maxLength: 150 },
                        },
                      },
                    },
                    nextCursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/products": {
      get: {
        summary: "Listado de productos y ofertas con filtros avanzados",
        operationId: "getProducts",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
          { name: "category", in: "query", schema: { type: "string", maxLength: 50 } },
          { name: "platform", in: "query", schema: { type: "string", enum: ["amazon", "mercadolibre"] } },
          { name: "minDiscount", in: "query", schema: { type: "integer", minimum: 0, maximum: 99 } },
          { name: "minPriceCents", in: "query", schema: { type: "integer", minimum: 0 } },
          { name: "maxPriceCents", in: "query", schema: { type: "integer", minimum: 0 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["active", "paused", "closed"] } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["recent", "discount", "price_asc", "price_desc", "rating"] } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "cursor", in: "query", schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          "200": {
            description: "Lista paginada de productos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "nextCursor"],
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Product" },
                    },
                    nextCursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/products/suggestions": {
      get: {
        summary: "Sugerencias de autocompletado para el buscador de productos",
        operationId: "getProductSuggestions",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          "200": {
            description: "Lista de sugerencias rápidas",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items"],
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "title", "categoryId", "platform", "priceCents"],
                        properties: {
                          id: { type: "string", format: "uuid" },
                          title: { type: "string", maxLength: 150 },
                          categoryId: { type: "string", maxLength: 50 },
                          categoryName: { type: ["string", "null"] },
                          platform: { type: "string", enum: ["amazon", "mercadolibre"] },
                          priceCents: { type: "string" },
                          discountPercentage: { type: ["integer", "null"] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/buscar/sugerencias": {
      get: {
        summary: "Sugerencias de autocompletado en tiempo real para el buscador (/buscar)",
        operationId: "getBuscarSugerencias",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          "200": {
            description: "Lista de sugerencias rápidas de productos y categorías",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items"],
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "title", "categoryId", "platform", "priceCents"],
                        properties: {
                          id: { type: "string", format: "uuid" },
                          title: { type: "string", maxLength: 150 },
                          categoryId: { type: "string", maxLength: 50 },
                          categoryName: { type: ["string", "null"] },
                          platform: { type: "string", enum: ["amazon", "mercadolibre"] },
                          priceCents: { type: "string" },
                          discountPercentage: { type: ["integer", "null"] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/products/{id}": {
      get: {
        summary: "Detalle de producto con historial de precios",
        operationId: "getProductById",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Detalle completo del producto e historial de 90 días",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProductDetail" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/products/{id}/check-price": {
      post: {
        summary: "Revalidar precio en vivo contra Mercado Libre",
        operationId: "checkProductPrice",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Resultado de la comprobación de precio",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "productId", "currentPriceCents", "previousPriceCents", "lastCheckedAt", "changed"],
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    productId: { type: "string", format: "uuid" },
                    currentPriceCents: { type: "integer" },
                    previousPriceCents: { type: "integer" },
                    discountPercentage: { type: ["integer", "null"] },
                    lastCheckedAt: { type: "string", format: "date-time" },
                    changed: { type: "boolean" },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Registro de nuevo usuario",
        operationId: "registerUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password", "termsAccepted"],
                properties: {
                  name: { type: "string", minLength: 1, maxLength: 50 },
                  email: { type: "string", format: "email", maxLength: 254 },
                  password: { type: "string", minLength: 1, maxLength: 128 },
                  termsAccepted: { type: "boolean", enum: [true] },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Registro exitoso; emite cookie de sesión __Host-session",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    requiresVerification: { type: "boolean" },
                  },
                },
              },
            },
          },
          "409": { $ref: "#/components/responses/Conflict" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Inicio de sesión con credenciales",
        operationId: "loginUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", maxLength: 254 },
                  password: { type: "string", minLength: 1, maxLength: 128 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Inicio de sesión correcto; emite cookie de sesión",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["ok"] } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        summary: "Cierre de sesión",
        operationId: "logoutUser",
        responses: {
          "204": { description: "Sesión revocada y cookie eliminada" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        summary: "Obtener datos del usuario con sesión activa",
        operationId: "getMe",
        responses: {
          "200": {
            description: "Datos del usuario actual",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["id", "name", "email", "role"],
                  properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    role: { type: "string", enum: ["user", "admin"] },
                    verifiedAt: { type: ["string", "null"], format: "date-time" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/recover": {
      post: {
        summary: "Solicitar enlace de recuperación de contraseña",
        operationId: "recoverPassword",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email", maxLength: 254 } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Petición procesada (si el correo existe, se envía el mensaje)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["ok"] } },
                },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/auth/reset": {
      post: {
        summary: "Restablecer contraseña con token de un solo uso",
        operationId: "resetPassword",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: { type: "string", minLength: 64, maxLength: 64 },
                  password: { type: "string", minLength: 1, maxLength: 128 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Contraseña actualizada exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["ok"] } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/auth/verify-email": {
      post: {
        summary: "Confirmar dirección de correo electrónico mediante token",
        operationId: "verifyEmail",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: { token: { type: "string", minLength: 43, maxLength: 43 } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Correo verificado exitosamente",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["ok"] } },
                },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/auth/resend-verification": {
      post: {
        summary: "Reenviar enlace de verificación de correo",
        operationId: "resendVerification",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email", maxLength: 254 } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Petición procesada (si el usuario existe y no está verificado, se envía el correo)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["ok"] } },
                },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
          "429": { $ref: "#/components/responses/RateLimited" },
        },
      },
    },
    "/api/auth/oauth/{provider}": {
      get: {
        summary: "Iniciar flujo OAuth con Google o Apple",
        operationId: "oauthStart",
        parameters: [
          { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["google", "apple"] } },
        ],
        responses: {
          "302": { description: "Redirección hacia el proveedor de identidad" },
          "404": { description: "Proveedor no soportado" },
          "503": { description: "Proveedor no configurado en este entorno" },
        },
      },
    },
    "/api/auth/oauth/{provider}/callback": {
      get: {
        summary: "Callback de OAuth (Google)",
        operationId: "oauthCallbackGet",
        parameters: [
          { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["google", "apple"] } },
          { name: "state", in: "query", schema: { type: "string" } },
          { name: "code", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "302": { description: "Redirección a portada (éxito) o a /entrar con error (fallo)" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        summary: "Callback de OAuth (Apple form_post)",
        operationId: "oauthCallbackPost",
        parameters: [
          { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["google", "apple"] } },
        ],
        requestBody: {
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                properties: {
                  state: { type: "string" },
                  code: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "302": { description: "Redirección a portada (éxito) o a /entrar con error (fallo)" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/admin/stats": {
      get: {
        summary: "Estadísticas generales del administrador",
        operationId: "getAdminStats",
        responses: {
          "200": {
            description: "Totales de usuarios, productos y suscriptores activos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["users", "products", "subscribers"],
                  properties: {
                    users: { type: "integer" },
                    products: { type: "integer" },
                    subscribers: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/users": {
      get: {
        summary: "Listado de usuarios para administración",
        operationId: "getAdminUsers",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
          { name: "cursor", in: "query", schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          "200": {
            description: "Lista de usuarios",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "nextCursor"],
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "name", "email", "role"],
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string" },
                          email: { type: "string", format: "email" },
                          role: { type: "string" },
                          verifiedAt: { type: ["string", "null"] },
                          suspendedAt: { type: ["string", "null"] },
                          createdAt: { type: "string", format: "date-time" },
                          subscriptionExpiresAt: { type: ["string", "null"] },
                        },
                      },
                    },
                    nextCursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/users/{id}/subscription": {
      post: {
        summary: "Activar o extender suscripción de usuario manualmente",
        operationId: "setAdminUserSubscription",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["expiresAt"],
                properties: { expiresAt: { type: "string", format: "date-time" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Suscripción activada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["ok"] } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/admin/users/{id}/suspension": {
      post: {
        summary: "Suspender o reactivar usuario",
        operationId: "setAdminUserSuspension",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["suspended"],
                properties: { suspended: { type: "boolean" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Estado de suspensión actualizado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["ok"] } },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/admin/products": {
      get: {
        summary: "Listado de productos para administración",
        operationId: "getAdminProducts",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
          { name: "cursor", in: "query", schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          "200": {
            description: "Lista de productos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "nextCursor"],
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Product" },
                    },
                    nextCursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/audit": {
      get: {
        summary: "Registro de auditoría administrativa",
        operationId: "getAdminAudit",
        parameters: [
          { name: "cursor", in: "query", schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          "200": {
            description: "Lista de registros de auditoría",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "nextCursor"],
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "actorId", "action", "targetId", "createdAt"],
                        properties: {
                          id: { type: "string", format: "uuid" },
                          actorId: { type: "string", format: "uuid" },
                          action: { type: "string" },
                          targetId: { type: "string", format: "uuid" },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                    nextCursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/coupons": {
      get: {
        summary: "Listado de cupones promocionales de suscripción",
        operationId: "getAdminCoupons",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
          { name: "cursor", in: "query", schema: { type: "string", maxLength: 100 } },
        ],
        responses: {
          "200": {
            description: "Lista paginada de cupones promocionales",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "nextCursor"],
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/PromoCoupon" },
                    },
                    nextCursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        summary: "Crear un nuevo cupón promocional de suscripción",
        operationId: "createAdminCoupon",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code", "description", "discountType", "discountValue"],
                properties: {
                  code: { type: "string", minLength: 3, maxLength: 40 },
                  description: { type: "string", minLength: 3, maxLength: 150 },
                  discountType: { type: "string", enum: ["percent", "amount_cents"] },
                  discountValue: { type: "integer", minimum: 1 },
                  maxRedemptions: { type: ["integer", "null"], minimum: 1 },
                  expiresAt: { type: ["string", "null"], format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Cupón promocional creado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PromoCoupon" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { $ref: "#/components/responses/Conflict" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/admin/coupons/{id}/toggle": {
      post: {
        summary: "Activar o desactivar un cupón promocional",
        operationId: "toggleAdminCoupon",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["active"],
                properties: {
                  active: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Estado del cupón actualizado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "active"],
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    active: { type: "boolean" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/admin/maintenance/purge": {
      post: {
        summary: "Ejecutar purga manual de registros vencidos",
        operationId: "purgeExpiredRecords",
        responses: {
          "200": {
            description: "Purga completada con éxito",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "purged"],
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    purged: {
                      type: "object",
                      required: ["authAttempts", "passwordTokens", "emailVerificationTokens", "sessions", "oauthFlows"],
                      properties: {
                        authAttempts: { type: "integer" },
                        passwordTokens: { type: "integer" },
                        emailVerificationTokens: { type: "integer" },
                        sessions: { type: "integer" },
                        oauthFlows: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/catalog/sync": {
      post: {
        summary: "Sincronización del catálogo contra Mercado Libre",
        operationId: "syncAdminCatalog",
        responses: {
          "200": {
            description: "Resultado de la sincronización de productos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "total", "updated", "syncedAt"],
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    total: { type: "integer" },
                    updated: { type: "integer" },
                    syncedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/payments/plans": {
      get: {
        summary: "Listado de planes y suscripciones disponibles",
        operationId: "getPaymentPlans",
        responses: {
          "200": {
            description: "Planes de suscripción",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["plans"],
                  properties: {
                    plans: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "name", "description", "priceCents", "currency", "interval", "features"],
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          description: { type: "string" },
                          priceCents: { type: "integer" },
                          currency: { type: "string" },
                          interval: { type: "string", enum: ["month", "year"] },
                          popular: { type: "boolean" },
                          features: { type: "array", items: { type: "string" } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/payments/subscription": {
      get: {
        summary: "Estado de la suscripción del usuario autenticado",
        operationId: "getUserSubscription",
        responses: {
          "200": {
            description: "Estado de suscripción",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "planId"],
                  properties: {
                    status: { type: "string", enum: ["active", "none", "canceled"] },
                    planId: { type: "string" },
                    startsAt: { type: ["string", "null"] },
                    expiresAt: { type: ["string", "null"] },
                    provider: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/payments/coupons/validate": {
      post: {
        summary: "Validar un código de cupón promocional para el Plan Pro",
        operationId: "validatePaymentCoupon",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code"],
                properties: {
                  code: { type: "string", minLength: 1, maxLength: 40 },
                  planId: { type: "string", enum: ["pro"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cupón válido y desglose de descuento en centavos MXN",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: [
                    "valid",
                    "couponId",
                    "code",
                    "description",
                    "discountType",
                    "discountValue",
                    "originalPriceCents",
                    "discountCents",
                    "finalPriceCents",
                  ],
                  properties: {
                    valid: { type: "boolean", enum: [true] },
                    couponId: { type: "string", format: "uuid" },
                    code: { type: "string" },
                    description: { type: "string" },
                    discountType: { type: "string", enum: ["percent", "amount_cents"] },
                    discountValue: { type: "integer" },
                    stripeCouponId: { type: ["string", "null"] },
                    originalPriceCents: { type: "integer" },
                    discountCents: { type: "integer" },
                    finalPriceCents: { type: "integer" },
                  },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/payments/cancel": {
      post: {
        summary: "Cancelar la suscripción activa del usuario autenticado",
        operationId: "cancelUserSubscription",
        responses: {
          "200": {
            description: "Suscripción cancelada con éxito",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "planId"],
                  properties: {
                    status: { type: "string", enum: ["canceled"] },
                    planId: { type: "string", enum: ["gratuito"] },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/payments/checkout-session": {
      post: {
        summary: "Crear sesión de checkout para suscripción",
        operationId: "createCheckoutSession",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["planId"],
                properties: {
                  planId: { type: "string", enum: ["pro"] },
                  couponCode: { type: "string", maxLength: 40 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sesión creada con éxito",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url", "sessionId"],
                  properties: {
                    url: { type: "string" },
                    sessionId: { type: "string" },
                    discountCents: { type: "integer" },
                    finalPriceCents: { type: "integer" },
                    couponCode: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/public/v1/webhooks/payments": {
      post: {
        summary: "Webhook para eventos del proveedor de pagos (Stripe)",
        operationId: "handlePaymentWebhook",
        responses: {
          "200": {
            description: "Evento recibido y procesado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["received"],
                  properties: {
                    received: { type: "boolean" },
                    duplicate: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/articles": {
      get: {
        summary: "Listado de artículos y reseñas públicas",
        operationId: "listArticles",
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "q", in: "query", schema: { type: "string", maxLength: 100 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
          { name: "cursor", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Lista de artículos publicados",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "nextCursor"],
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Article" },
                    },
                    nextCursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: "Crear un nuevo artículo o reseña de producto (requiere Plan Pro)",
        operationId: "createArticle",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "summary", "content", "status"],
                properties: {
                  title: { type: "string", minLength: 5, maxLength: 150 },
                  summary: { type: "string", minLength: 10, maxLength: 500 },
                  content: { type: "string", minLength: 20, maxLength: 50000 },
                  coverImageUrl: { type: ["string", "null"], maxLength: 2048 },
                  categoryId: { type: ["string", "null"], maxLength: 50 },
                  productId: { type: ["string", "null"], format: "uuid" },
                  status: { type: "string", enum: ["draft", "published"] },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Artículo creado con éxito",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ArticleDetail" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/articles/my-articles": {
      get: {
        summary: "Listado de artículos del autor autenticado",
        operationId: "listMyArticles",
        responses: {
          "200": {
            description: "Artículos del autor",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["articles"],
                  properties: {
                    articles: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Article" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/articles/{slug}": {
      get: {
        summary: "Obtener un artículo por su slug",
        operationId: "getArticleBySlug",
        parameters: [
          { name: "slug", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Detalle del artículo",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ArticleDetail" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/articles/{id}": {
      put: {
        summary: "Actualizar un artículo existente (requiere Plan Pro y ser el autor)",
        operationId: "updateArticle",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "summary", "content", "status"],
                properties: {
                  title: { type: "string", minLength: 5, maxLength: 150 },
                  summary: { type: "string", minLength: 10, maxLength: 500 },
                  content: { type: "string", minLength: 20, maxLength: 50000 },
                  coverImageUrl: { type: ["string", "null"], maxLength: 2048 },
                  categoryId: { type: ["string", "null"], maxLength: 50 },
                  productId: { type: ["string", "null"], format: "uuid" },
                  status: { type: "string", enum: ["draft", "published"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Artículo actualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ArticleDetail" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        summary: "Eliminar un artículo (requiere ser el autor o admin)",
        operationId: "deleteArticle",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Artículo eliminado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", enum: ["ok"] } },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/profiles/me": {
      get: {
        summary: "Obtener perfil del usuario autenticado",
        operationId: "getMyProfile",
        responses: {
          "200": {
            description: "Perfil del usuario autenticado",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Profile" } },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      put: {
        summary: "Actualizar perfil del creador/usuario autenticado",
        operationId: "updateMyProfile",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ProfileUpdateInput" } },
          },
        },
        responses: {
          "200": {
            description: "Perfil actualizado correctamente",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Profile" } },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { $ref: "#/components/responses/Conflict" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/profiles/{alias}": {
      get: {
        summary: "Obtener perfil público de un creador y sus ofertas",
        operationId: "getPublicProfile",
        parameters: [
          { name: "alias", in: "path", required: true, schema: { type: "string", maxLength: 50 } },
        ],
        responses: {
          "200": {
            description: "Perfil público del creador con ofertas recomendadas",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/PublicCreatorProfile" } },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/profiles/me/analytics": {
      get: {
        summary: "Obtener métricas y estadísticas del creador autenticado para el panel",
        operationId: "getMyAnalytics",
        responses: {
          "200": {
            description: "Estadísticas de clics y resumen de conversión del creador",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["summary", "dailyClicks", "productClicks"],
                  properties: {
                    summary: {
                      type: "object",
                      required: ["clics", "productosVistos", "gananciaCentavos", "variacionPorcentaje"],
                      properties: {
                        clics: { type: "integer" },
                        productosVistos: { type: "integer" },
                        gananciaCentavos: { type: "integer" },
                        variacionPorcentaje: { type: "number" },
                      },
                    },
                    dailyClicks: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["dia", "clics"],
                        properties: {
                          dia: { type: "integer" },
                          clics: { type: "integer" },
                          fecha: { type: "string" },
                        },
                      },
                    },
                    productClicks: {
                      type: "object",
                      additionalProperties: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/redirect/{id}": {
      get: {
        summary: "Redirección con atribución y registro de clic de afiliado",
        operationId: "redirectToAffiliate",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "o", in: "query", required: false, schema: { type: "string", enum: ["ficha", "portada", "pagina", "articulo", "correo", "busqueda", "panel"] } },
          { name: "c", in: "query", required: false, schema: { type: "string", maxLength: 50 } },
        ],
        responses: {
          "302": {
            description: "Redirección inmediata a la tienda asociada (Amazon o Mercado Libre)",
            headers: {
              Location: { schema: { type: "string" }, description: "URL de destino con etiquetas de afiliado" },
              "Cache-Control": { schema: { type: "string", example: "no-store" } },
              "X-Robots-Tag": { schema: { type: "string", example: "noindex, nofollow" } },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/favorites": {
      get: {
        summary: "Listado de productos guardados en favoritos por el usuario autenticado",
        operationId: "listFavorites",
        responses: {
          "200": {
            description: "Productos guardados en favoritos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "productIds"],
                  properties: {
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Product" },
                    },
                    productIds: {
                      type: "array",
                      items: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/favorites/{productId}": {
      post: {
        summary: "Guardar producto en favoritos",
        operationId: "addFavorite",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Producto añadido a favoritos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "productId", "saved"],
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    productId: { type: "string", format: "uuid" },
                    saved: { type: "boolean", enum: [true] },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        summary: "Eliminar producto de favoritos",
        operationId: "removeFavorite",
        parameters: [
          { name: "productId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Producto eliminado de favoritos",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "productId", "saved"],
                  properties: {
                    status: { type: "string", enum: ["ok"] },
                    productId: { type: "string", format: "uuid" },
                    saved: { type: "boolean", enum: [false] },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
  },
  components: {
    schemas: {
      Product: {
        type: "object",
        required: ["id", "title", "categoryId", "platform", "currency", "isDemo"],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string", maxLength: 150 },
          description: { type: ["string", "null"], maxLength: 5000 },
          categoryId: { type: "string", maxLength: 50 },
          categoryName: { type: ["string", "null"] },
          platform: { type: "string", enum: ["amazon", "mercadolibre"] },
          priceCents: { type: ["string", "null"] },
          originalPriceCents: { type: ["string", "null"] },
          discountPercentage: { type: ["integer", "null"] },
          currency: { type: "string", minLength: 3, maxLength: 3 },
          imageUrl: { type: ["string", "null"], maxLength: 2048 },
          affiliateUrl: { type: ["string", "null"], maxLength: 2048 },
          externalId: { type: ["string", "null"], maxLength: 50 },
          rating: { type: ["number", "null"] },
          reviewsCount: { type: ["integer", "null"] },
          status: { type: "string", enum: ["active", "paused", "closed"] },
          lastCheckedAt: { type: ["string", "null"], format: "date-time" },
          isDemo: { type: "boolean" },
          couponCode: { type: ["string", "null"], maxLength: 50 },
          couponDescription: { type: ["string", "null"], maxLength: 150 },
        },
      },
      PromoCoupon: {
        type: "object",
        required: [
          "id",
          "code",
          "description",
          "discountType",
          "discountValue",
          "timesRedeemed",
          "active",
          "createdAt",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string", maxLength: 40 },
          description: { type: "string", maxLength: 150 },
          discountType: { type: "string", enum: ["percent", "amount_cents"] },
          discountValue: { type: "integer" },
          maxRedemptions: { type: ["integer", "null"] },
          timesRedeemed: { type: "integer" },
          active: { type: "boolean" },
          expiresAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ProductDetail: {
        allOf: [
          { $ref: "#/components/schemas/Product" },
          {
            type: "object",
            required: ["priceHistory"],
            properties: {
              priceHistory: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "priceCents", "recordedAt"],
                  properties: {
                    id: { type: "string", format: "uuid" },
                    priceCents: { type: "string" },
                    recordedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        ],
      },
      Article: {
        type: "object",
        required: ["id", "title", "slug", "summary", "status", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string", maxLength: 150 },
          slug: { type: "string", maxLength: 160 },
          summary: { type: "string", maxLength: 500 },
          coverImageUrl: { type: ["string", "null"] },
          categoryId: { type: ["string", "null"] },
          categoryName: { type: ["string", "null"] },
          productId: { type: ["string", "null"], format: "uuid" },
          productTitle: { type: ["string", "null"] },
          status: { type: "string", enum: ["draft", "published"] },
          publishedAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          authorId: { type: "string", format: "uuid" },
          authorName: { type: "string" },
          authorAlias: { type: ["string", "null"] },
          authorAvatarUrl: { type: ["string", "null"] },
        },
      },
      ArticleDetail: {
        type: "object",
        required: ["id", "title", "slug", "summary", "content", "status", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string", maxLength: 150 },
          slug: { type: "string", maxLength: 160 },
          summary: { type: "string", maxLength: 500 },
          content: { type: "string" },
          coverImageUrl: { type: ["string", "null"] },
          categoryId: { type: ["string", "null"] },
          categoryName: { type: ["string", "null"] },
          productId: { type: ["string", "null"], format: "uuid" },
          productTitle: { type: ["string", "null"] },
          productDescription: { type: ["string", "null"] },
          productPriceCents: { type: ["string", "null"] },
          productCurrency: { type: ["string", "null"] },
          productImageUrl: { type: ["string", "null"] },
          productPlatform: { type: ["string", "null"] },
          status: { type: "string", enum: ["draft", "published"] },
          publishedAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          authorName: { type: "string" },
          authorAlias: { type: ["string", "null"] },
          authorAvatarUrl: { type: ["string", "null"] },
          authorDescription: { type: ["string", "null"] },
        },
      },
      Profile: {
        type: "object",
        required: ["userId", "alias", "name", "email", "description", "location", "avatarUrl", "accentColor", "socialLinks", "verified", "createdAt", "updatedAt"],
        properties: {
          userId: { type: "string", format: "uuid" },
          alias: { type: "string", maxLength: 50 },
          name: { type: "string", maxLength: 50 },
          email: { type: "string", maxLength: 254 },
          description: { type: "string", maxLength: 5000 },
          location: { type: "string", maxLength: 200 },
          avatarUrl: { type: ["string", "null"], maxLength: 2048 },
          coverUrl: { type: ["string", "null"], maxLength: 2048 },
          accentColor: { type: "string", maxLength: 20 },
          socialLinks: {
            type: "array",
            items: {
              type: "object",
              required: ["red", "url"],
              properties: {
                red: { type: "string", maxLength: 30 },
                url: { type: "string", maxLength: 2048 },
              },
            },
          },
          verified: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ProfileUpdateInput: {
        type: "object",
        properties: {
          alias: { type: "string", maxLength: 50 },
          name: { type: "string", maxLength: 50 },
          description: { type: "string", maxLength: 5000 },
          location: { type: "string", maxLength: 200 },
          avatarUrl: { type: ["string", "null"], maxLength: 2048 },
          coverUrl: { type: ["string", "null"], maxLength: 2048 },
          accentColor: { type: "string", maxLength: 20 },
          socialLinks: {
            type: "array",
            items: {
              type: "object",
              required: ["red", "url"],
              properties: {
                red: { type: "string", maxLength: 30 },
                url: { type: "string", maxLength: 2048 },
              },
            },
          },
        },
      },
      PublicCreatorProfile: {
        type: "object",
        required: ["profile", "products", "collections"],
        properties: {
          profile: {
            type: "object",
            required: ["alias", "nombre", "avatar", "verificado", "descripcion", "redes", "ubicacion", "miembroDesde", "estadisticas", "categorias", "conteoPlataformas", "conteoPrecios"],
            properties: {
              alias: { type: "string" },
              nombre: { type: "string" },
              avatar: { type: "string" },
              coverUrl: { type: ["string", "null"] },
              verificado: { type: "boolean" },
              descripcion: { type: "string" },
              redes: {
                type: "array",
                items: {
                  type: "object",
                  required: ["red", "url"],
                  properties: {
                    red: { type: "string" },
                    url: { type: "string" },
                  },
                },
              },
              ubicacion: { type: "string" },
              miembroDesde: { type: "string" },
              estadisticas: {
                type: "object",
                required: ["seguidores", "productos", "colecciones", "valoracion"],
                properties: {
                  seguidores: { type: "string" },
                  productos: { type: "integer" },
                  colecciones: { type: "integer" },
                  valoracion: { type: "number" },
                },
              },
              categorias: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "nombre", "productos"],
                  properties: {
                    id: { type: "string" },
                    nombre: { type: "string" },
                    productos: { type: "integer" },
                  },
                },
              },
              conteoPlataformas: {
                type: "object",
                additionalProperties: { type: "integer" },
              },
              conteoPrecios: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "etiqueta", "productos"],
                  properties: {
                    id: { type: "string" },
                    etiqueta: { type: "string" },
                    productos: { type: "integer" },
                  },
                },
              },
              accentColor: { type: "string" },
            },
          },
          products: {
            type: "array",
            items: { $ref: "#/components/schemas/Product" },
          },
          collections: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "titulo", "productos", "imagen"],
              properties: {
                id: { type: "string" },
                titulo: { type: "string" },
                productos: { type: "integer" },
                imagen: { type: "string" },
              },
            },
          },
        },
      },
      ProblemDetails: {
        type: "object",
        required: ["type", "title", "status", "code", "detail"],
        properties: {
          type: { type: "string", default: "about:blank" },
          title: { type: "string" },
          status: { type: "integer" },
          code: { type: "string" },
          detail: { type: "string" },
          errors: {
            type: "object",
            additionalProperties: { type: "string" },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Petición mal formada (RFC 9457)",
        content: {
          "application/problem+json": { schema: { $ref: "#/components/schemas/ProblemDetails" } },
        },
      },
      Unauthorized: {
        description: "Credenciales inválidas o sesión requerida (RFC 9457)",
        content: {
          "application/problem+json": { schema: { $ref: "#/components/schemas/ProblemDetails" } },
        },
      },
      Forbidden: {
        description: "Acceso denegado o cuenta suspendida (RFC 9457)",
        content: {
          "application/problem+json": { schema: { $ref: "#/components/schemas/ProblemDetails" } },
        },
      },
      NotFound: {
        description: "Recurso no encontrado (RFC 9457)",
        content: {
          "application/problem+json": { schema: { $ref: "#/components/schemas/ProblemDetails" } },
        },
      },
      Conflict: {
        description: "Conflicto con el estado actual del recurso (RFC 9457)",
        content: {
          "application/problem+json": { schema: { $ref: "#/components/schemas/ProblemDetails" } },
        },
      },
      ValidationError: {
        description: "Datos que no superan la validación (RFC 9457 con errors[])",
        content: {
          "application/problem+json": { schema: { $ref: "#/components/schemas/ProblemDetails" } },
        },
      },
      RateLimited: {
        description: "Límite de peticiones excedido (RFC 9457 con cabecera Retry-After)",
        headers: {
          "Retry-After": {
            schema: { type: "string", example: "900" },
            description: "Segundos de espera recomendados",
          },
        },
        content: {
          "application/problem+json": { schema: { $ref: "#/components/schemas/ProblemDetails" } },
        },
      },
    },
  },
} as const;
