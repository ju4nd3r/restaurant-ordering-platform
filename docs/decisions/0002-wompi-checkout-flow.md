# ADR 0002: Flujo de Checkout Wompi en Experiencia Móvil

## Estado

Aceptado

## Contexto

Wompi ofrece tres modalidades de integración:

1. **Widget Web (iframe / modal script):** Inserta un modal dentro de la página.
2. **Checkout URL / Redirección:** Se genera una sesión de pago en el backend y se redirige al comensal a la pasarela segura de Wompi, retornando con `redirect_url`.
3. **API Directa con Tokenización:** El cliente tokeniza la tarjeta directamente.

En dispositivos móviles y especialmente al escanear códigos QR con aplicaciones como WhatsApp, Instagram o la cámara nativa de iOS/Android, las vistas Web (in-app webviews) bloquean con frecuencia iframes de terceros o restringen popups y almacenamiento local de cookies entre dominios.

## Decisión

Se adopta **Checkout con Redirección (Hosted Checkout)** con las siguientes salvaguardas:

1. El backend genera la referencia de pago, calcula el total inmutable y firma criptográficamente la transacción (`integrity_signature`).
2. El cliente navega a la URL de checkout de Wompi.
3. Al finalizar, Wompi redirige a `/m/{token}/order/{orderId}` con el parámetro `id`.
4. La pantalla móvil muestra el estado "Verificando pago" y escucha eventos en tiempo real (WebSockets / Polling diferido).
5. **Seguridad:** El estado del pedido NUNCA se aprueba con los query params de redirección. Solo se aprueba cuando el webhook firmado por Wompi es recibido y validado en el backend con la llave de eventos (`WOMPI_EVENTS_SECRET`).

## Consecuencias

- 100% de compatibilidad en webviews de iOS/Android y navegadores móviles.
- Mayor confiabilidad y cumplimiento PCI DSS, delegando la captura de datos sensibles íntegramente a Wompi.
