# Arquitectura del Sistema: Restaurant Ordering Platform

## 1. Diagrama de Contenedores y Flujo

```
[ Comensal (PWA Móvil) ]               [ Personal / Cocina / Caja (Staff) ]
  - Cámara QR: /m/{token}                 - /staff (KDS FIFO, Mesero, Admin)
  - Carrito Zustand                      - Web Push VAPID
  - Checkout Wompi (Redirect)            - WebSockets / SSE
  - Factura DIAN / Consumidor Final      - Audio Alert + Wake Lock API
           │                                       │
           └───────────────────┬───────────────────┘
                               ▼
               [ Reverse Proxy (Caddy / Nginx) ]
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       [ apps/web (Next.js) ]        [ apps/api (NestJS) ]
       - PWA Service Worker          - REST Endpoints
       - SSR / CSR Hydration         - Gateway WebSockets
       - Safe Area / Touch UX        - Auth RBAC & Table Guards
               │                               │
               └───────────────┬───────────────┘
                               ▼
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
  [ PostgreSQL 16 ]        [ Redis 7 ]          [ MinIO (S3) ]
  - Esquema Relacional     - Colas BullMQ       - Fotos Menú WebP
  - Multi-tenant           - Locks con TTL      - Thumbnails
  - COP en Enteros         - Pub/Sub Sockets
                               │
                       [ BullMQ Workers ]
                       ├─ DIAN Invoicing
                       ├─ Emails (Mailpit)
                       └─ Web Push Dispatch
```

## 2. Flujo de Pedido y Pago de Comensal

```
1. Scan QR (/m/{token}) ──> Backend valida token opaco y genera TableSession
2. Cliente agrega platos ──> Carrito local persistente (Zustand + LocalStorage)
3. Confirmar pedido ─────> POST /api/orders (calcula totales enteros COP en backend)
4. Selección de pago ────> Wompi (Tarjeta, Nequi, PSE) O Efectivo en caja
5. Redirección Wompi ────> Comensal completa en Wompi y regresa a /order/status
6. Webhook Wompi ────────> Backend valida hash de integridad y aprueba pedido
7. Socket.IO Broadcast ──> Cocina y mesero reciben alerta sonora y visual
8. Cola BullMQ ──────────> Generación asíncrona de Factura DIAN + Correo
```
