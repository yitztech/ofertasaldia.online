# Plan de Remediación de Seguridad — OfertasAlDía

> Plan de trabajo dividido en sesiones para corregir las vulnerabilidades y debilidades identificadas en la auditoría de seguridad del backend y frontend.

---

## Índice de Sesiones

| Sesión | Enfoque | Vulnerabilidades que resuelve | Estimación |
|---|---|---|---|
| **Sesión 1** | Autenticación, DoS por Rate Limit y Anti-Enumeración | Vulnerabilidad A (DoS de cuentas) y B (Enumeración en registro) | 1 jornada |
| **Sesión 2** | Retención de datos y resiliencia de PostgreSQL | Vulnerabilidad C (Tablas sin purga) y E (Fragilidad del pool) | 1 jornada |
| **Sesión 3** | Salvaguardas de Administración y Control de Acceso | Vulnerabilidad D (Auto-suspensión de administradores) | Media jornada |
| **Sesión 4** | Verificación de correo y auditoría de proxy de red | Vulnerabilidad F (TRUSTED_PROXY_CIDR) y G (Verificación de buzón) | 1 jornada |

---

## Sesión 1: Autenticación, Mitigación de DoS y Prevención de Enumeración

### Objetivo
Evitar que un atacante anónimo pueda bloquear cuentas legítimas abusando del rate limiter, y eliminar la fuga de información que permite enumerar usuarios en el registro.

### Tareas detalladas

1. **Reestructuración del Rate Limiting (`services/api/src/auth.ts`)**:
   - **Problema actual**: El rate limiter bloquea globalmente la clave `digest(account)` cuando alcanza 20 peticiones, permitiendo que un atacante bloquee al admin o a cualquier usuario.
   - **Acción**:
     - Separar la clave de limitación: limitar por IP (`digest("ip:" + ip)`) con ventana estricta (ej. 20 peticiones / 15 min).
     - Para la cuenta, limitar por la tupla IP + Cuenta (`digest("login:" + ip + ":" + account)`), de modo que los intentos fallidos de una IP hostil no afecten el acceso del usuario legítimo desde otra IP.
     - Registrar intentos únicamente tras fallos de credenciales en `login`, en lugar de incrementar preventivamente antes de validar.
   - **Archivos**: `services/api/src/auth.ts`, `tests/api/hardening.cjs`.

2. **Manejo explícito de colisión en Registro (`services/api/src/auth.ts` y `apps/web/app/routes/registro.tsx`)**:
   - **Problema actual**: `ON CONFLICT DO NOTHING` devuelve 0 filas, responde `{ status: "ok" }` sin `Set-Cookie`, creando un éxito fantasma que revela si el correo existía y deja al usuario desorientado.
   - **Acción**:
     - Responder con `409 Conflict` (o `422` con código `account_already_exists` y Problem Details RFC 9457) cuando el correo ya esté registrado.
     - En el frontend (`apps/web/app/routes/registro.tsx`), mostrar un mensaje accesible: *"Ya existe una cuenta con este correo. Puedes iniciar sesión o recuperar tu contraseña."* con enlace directo a `/entrar`.
   - **Archivos**: `services/api/src/auth.ts`, `apps/web/app/routes/registro.tsx`, `docs/openapi.json`.

3. **Pruebas de verificación**:
   - Ampliar `tests/api/hardening.cjs` con un caso de prueba donde una IP atacante no pueda provocar un 429 en una segunda IP legítima para la misma cuenta.
   - Probar en `tests/api/recovery.cjs` o suite de auth la respuesta 409 al registrar un correo duplicado.

---

## Sesión 2: Retención de Datos y Resiliencia de PostgreSQL

### Objetivo
Prevenir el crecimiento desmedido de tablas de seguridad (agotamiento de disco) y evitar errores 500/503 ante picos moderados de concurrencia.

### Tareas detalladas

1. **Job periódico de purga con `pg-boss` (`services/api/src/database.ts` / `mail.ts`)**:
   - **Problema actual**: `auth_attempts`, `password_tokens` y `sessions` acumulan registros para siempre.
   - **Acción**:
     - Registrar una tarea programada recurrente (cron de `pg-boss` cada hora o cada medianoche):
       ```sql
       -- Purga de intentos fuera de la ventana de bloqueo
       DELETE FROM auth_attempts WHERE window_start < now() - interval '2 hours';
       -- Purga de tokens de contraseña vencidos
       DELETE FROM password_tokens WHERE expires_at < now();
       -- Purga de sesiones expiradas o inactivas > 24h
       DELETE FROM sessions WHERE expires_at < now() OR last_seen_at < now() - interval '24 hours';
       -- Purga de flujos OAuth vencidos
       DELETE FROM oauth_flows WHERE expires_at < now();
       ```
   - **Archivos**: `services/api/src/cleanup.service.ts` (o dentro de worker de mantenimiento), `services/api/src/main.ts`.

2. **Ajuste de configuración del pool PostgreSQL (`services/api/src/database.ts`)**:
   - **Problema actual**: `connectionTimeoutMillis: 500` y `statement_timeout: 500` con `max: 5` provocan 500/503 ante cualquier retraso menor de medio segundo.
   - **Acción**:
     - Subir `connectionTimeoutMillis` a `2500` ms (tiempo prudencial para esperar una conexión libre sin colapsar).
     - Subir `statement_timeout` a `2000` ms (o calibrar según consultas complejas del admin).
     - Evaluar incremento de `max: 8` respetando el límite de memoria del contenedor de Postgres (`512m`).
   - **Archivos**: `services/api/src/database.ts`.

3. **Pruebas de verificación**:
   - Prueba unitaria/de integración que inserte registros vencidos y verifique su eliminación tras ejecutar la función de purga.
   - Prueba de carga corta con 15 peticiones concurrentes para comprobar cero fallos por timeout de conexión.

---

## Sesión 3: Salvaguardas en Administración y Control de Acceso

### Objetivo
Evitar que un administrador pueda auto-suspenderse por descuido o que el sistema quede huérfano sin administradores activos.

### Tareas detalladas

1. **Regla de integridad en Suspensión (`services/api/src/admin.ts`)**:
   - **Problema actual**: `POST /api/admin/users/:id/suspension` no comprueba si el usuario objetivo es el propio actor.
   - **Acción**:
     - Validar que `id !== actor.id`; si coincide, responder `400` con código `cannot_suspend_self` y mensaje: *"No puedes suspender tu propia cuenta."*
     - Validar que, si el usuario a suspender tiene rol `admin`, exista al menos otro administrador activo en la base de datos antes de proceder.
   - **Archivos**: `services/api/src/admin.ts`, `docs/openapi.json`.

2. **Reflejo en la interfaz del panel de administración (`apps/admin/src/main.tsx`)**:
   - Deshabilitar el botón "Suspender" en la fila del propio administrador autenticado.
   - Mostrar indicador visual de "Tu cuenta" en la lista de usuarios.
   - **Archivos**: `apps/admin/src/main.tsx`.

3. **Pruebas de verificación**:
   - Añadir caso en `tests/api/authorization.cjs` intentando suspender al propio actor autenticado y comprobando el rechazo con 400.

---

## Sesión 4: Validación de Red y Verificación de Cuentas

### Objetivo
Fortalecer la confianza en la IP de origen y asegurar que los correos registrados pertenezcan a personas reales.

### Tareas detalladas

1. **Auditoría y robustecimiento de `TRUSTED_PROXY_CIDR` (`gateway/`)**:
   - Documentar en `docs/DESPLIEGUE-BACKEND.md` cómo obtener la CIDR exacta de Traefik en Coolify.
   - Añadir una comprobación en arranque o script de plataforma para alertar si `TRUSTED_PROXY_CIDR` está ausente o tiene valores inseguros (`0.0.0.0/0`).
   - **Archivos**: `docs/DESPLIEGUE-BACKEND.md`, `.github/scripts/reglas-compose.sh`.

2. **Flujo de verificación de correo electrónico (Opcional según roadmap de producto)**:
   - Añadir columna `verification_tokens` o reutilizar tabla de tokens.
   - Al registrarse, enviar correo con enlace firmado (`/verificar#token=...`).
   - Marcar `verified_at = now()` al verificar.
   - Restringir la publicación de ofertas o enlaces de afiliado a cuentas con `verified_at IS NOT NULL`.
   - **Archivos**: `services/api/src/auth.ts`, `services/api/src/mail.ts`, `apps/web/app/routes/verificar.tsx`.

---

## Registro de Progreso

| Tarea | Estado | Fecha de cierre | Notas / PR |
|---|---|---|---|
| Sesión 1: Rate limit por tupla (IP, cuenta) | Completada | 2026-11-02 | Clave `[ip, ip:cuenta]`, solo incrementa en credenciales incorrectas |
| Sesión 1: 409 Conflict en registro duplicado | Completada | 2026-11-02 | RFC 9457 `account_already_exists`, alerta y enlaces en `registro.tsx` |
| Sesión 2: Cron de purga de tablas temporales | Completada | 2026-11-02 | `MaintenanceService` con cron pg-boss y purga al arranque |
| Sesión 2: Calibración de timeouts de PostgreSQL | Completada | 2026-11-02 | Pool max: 8, connectionTimeout: 2500ms, statement_timeout: 2000ms |
| Sesión 3: Bloqueo de auto-suspensión de admin | Completada | 2026-11-02 | `cannot_suspend_self`, `last_admin_protection`, badge "Tu cuenta" y botón deshabilitado |
| Sesión 4: Validación estricta de TRUSTED_PROXY | Pendiente | — | — |
| Sesión 4: Verificación de buzón en registro | Pendiente | — | Marcada como obligatoria por el usuario |
