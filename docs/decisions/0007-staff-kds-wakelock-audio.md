# ADR-0007: Arquitectura del Panel Operativo y Gestión en Tiempo Real (KDS, Screen WakeLock y Web Audio)

## Estado
Aceptado

## Contexto
El personal del restaurante (cocineros, meseros, cajeros y administradores) opera en entornos de alta demanda física donde no es viable interactuar constantemente con teclados o ratones. Además:
1. Las cocinas y mesones de despacho necesitan pantallas o tablets montadas que permanezcan encendidas sin que el sistema operativo apague la pantalla por inactividad.
2. Los navegadores modernos bloquean la reproducción automática de sonido (Audio autoplay policy) a menos que haya una interacción explícita previa del usuario.
3. Los pedidos deben ser despachados estrictamente en orden de llegada (FIFO), destacando tiempos de espera para evitar platos fríos o demoras excesivas.

## Decisión
1. **Screen Wake Lock API**: Se implementa un servicio dedicado en el frontend (`lib/wakelock.ts`) que solicita `navigator.wakeLock.request('screen')` con control visual directo para el personal. Si el dispositivo no soporta la API nativa, degrada limpiamente sin arrojar errores.
2. **Alertas Sonoras con Web Audio API**: Se implementa un generador de tonos puros (`lib/audio.ts`) usando osciladores (`OscillatorNode` y `GainNode`), sin depender de archivos de audio externos (MP3/WAV) que podrían fallar por red o permisos CORS. Se añade un botón explícito de alta visibilidad *"Activar Sonido"* que despierta el `AudioContext` en el primer toque del usuario, cumpliendo con la política de autoplay.
3. **KDS FIFO con Alertas Visuales**: Las comandas se ordenan de forma ascendente por fecha de creación (`createdAt: 'asc'`). Se implementa cálculo en vivo del tiempo transcurrido en minutos con badges de colores (verde <12m, ámbar 12-20m, rojo parpadeante >20m).
4. **WebSocket Rooms Especializadas**: La pasarela de WebSocket distribuye eventos en salas aisladas:
   - `kitchen:{restaurantId}`: nuevos pedidos, pagos confirmados.
   - `waiter:{waiterId}`: platos listos para servir en la mesa.
   - `table:{tableSessionId}`: estado del pedido para los comensales.

## Consecuencias
- Cero consumo de ancho de banda para efectos de sonido.
- Operatividad continua en tablets de cocina sin bloqueos de pantalla.
- Notificaciones acústicas y visuales instantáneas al llegar o prepararse un plato.
