# Acceso con Google y Apple

La API implementa el flujo de código de autorización OpenID Connect. Los botones del frontend navegan a `/api/auth/oauth/google` y `/api/auth/oauth/apple`.

## Variables de la API

- `SITE_URL`: origen público exacto, sin barra final. HTTPS en producción.
- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`: cliente web confidencial de Google.
- `APPLE_CLIENT_ID`: Services ID de Apple.
- `APPLE_CLIENT_SECRET`: JWT de cliente generado con la clave de Sign in with Apple según la documentación de Apple. Es un secreto con caducidad; renovarlo antes de vencer y no guardarlo en Git.

La ausencia de un proveedor lo deja inactivo (503), sin crear sesiones ni usuarios. No enviar estos secretos al frontend.

Registrar exactamente estos callbacks:

- Google: `https://ofertasaldia.online/api/auth/oauth/google/callback`.
- Apple: `https://ofertasaldia.online/api/auth/oauth/apple/callback`.

En desarrollo Google admite `http://localhost:8080/api/auth/oauth/google/callback` si está registrado. Apple requiere un dominio HTTPS registrado: localhost HTTP no es válido. Configurar la API y gateway detrás de ese dominio antes de probarlo.

## Seguridad y cuentas

El estado se consume una sola vez, vence en diez minutos y está asociado a una cookie HttpOnly del navegador. Google usa PKCE S256. Ambos validan firma del ID token, emisor, audiencia, caducidad y nonce mediante openid-client. Apple retorna por POST; su cookie de correlación usa SameSite=None y Secure en producción.

Solo se aceptan correos verificados. Se usa el `sub` del proveedor como identidad. Una coincidencia de correo con una cuenta existente se rechaza con `account_link_required`; no se fusionan cuentas automáticamente. La vinculación explícita de cuentas existentes no está implementada. Las cuentas nuevas empiezan con nombre `Usuario`, rol normal y sin plan.

## Verificación

`tests/api/oauth.cjs` verifica el modo sin credenciales. Las pruebas reales requieren configurar ambos clientes y comprobar: consentimiento, cancelación, acceso repetido con la misma identidad, sesión, cuenta suspendida, correo existente y eliminación/caducidad de estado. No se han verificado accesos reales con Google o Apple en este checkout.

Fuentes: https://github.com/panva/openid-client y https://developer.apple.com/documentation/signinwithapplerestapi

Pruebas ejecutadas en Docker:

```sh
docker compose -f compose.dev.yml exec -T api node < tests/api/oauth.cjs
docker compose -f compose.dev.yml run --rm --no-deps -T -e GOOGLE_CLIENT_ID=oauth-test-client -e GOOGLE_CLIENT_SECRET=oauth-test-secret api node < tests/api/oauth-state.cjs
```

La segunda usa un cliente ficticio para verificar redirección, PKCE, nonce, cookie, estado incorrecto, rechazo del código inválido y consumo único. No prueba una identidad válida ni autorización del cliente real.
