# Restaurant Ordering Platform (Colombia) 🇨🇴🍽️

Plataforma Web Progresiva (**PWA**) **Mobile-First** para restaurantes en Colombia. Permite a los comensales escanear el código QR de su mesa sin instalar ninguna app, explorar el menú interactivo con fotos, ordenar con extras y comentarios personalizados, pagar con **Wompi** (Tarjeta, PSE, Nequi, Bancolombia) o efectivo en caja, dividir la cuenta entre varios celulares y recibir su **Factura Electrónica DIAN**.

El personal del restaurante dispone de un panel en tiempo real (KDS de cocina, despacho de meseros, caja y administración) con alertas sonoras/visuales y Web Push.

---

## 🚀 Arquitectura y Tecnologías

- **Monorepo:** pnpm Workspaces + Turborepo
- **Frontend (apps/web):** Next.js 15 (App Router), TypeScript estricto, Tailwind CSS, shadcn/ui, Framer Motion, TanStack Query, Zustand, PWA con Service Worker y fallback offline.
- **Backend (apps/api):** NestJS modular, Arquitectura Hexagonal / Limpia, DTOs con Zod/class-validator, Documentación OpenAPI/Swagger (`/api/docs`).
- **Base de Datos & ORM:** PostgreSQL 16 + Prisma ORM (diseño multi-tenant y montos monetarios en **enteros COP** sin decimales ni errores de coma flotante).
- **Tiempo Real:** WebSockets (Socket.IO Gateway) + Web Push (VAPID).
- **Colas Asíncronas:** Redis 7 + BullMQ para facturación DIAN, correos y notificaciones.
- **Almacenamiento de Fotos:** MinIO S3 local (desarrollo) con optimización de imágenes WebP.
- **Correos:** Mailpit local (desarrollo) con panel web de inspección de correos.
- **Contenedores:** Docker multi-stage y Docker Compose con healthchecks.

---

## 🛠️ Puesta en Marcha Rápida (Docker)

Todo el ecosistema levanta con un solo comando:

```bash
# 1. Clonar repositorio
git clone https://github.com/ju4nd3r/restaurant-ordering-platform.git
cd restaurant-ordering-platform

# 2. Configurar variables de entorno (usa valores por defecto para desarrollo)
cp .env.example .env

# 3. Construir y levantar todos los servicios
docker compose up --build
```

### Puertos y Servicios Disponibles:

| Servicio                      | URL / Puerto                     | Descripción                                                                |
| ----------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| **Web PWA (Cliente / Staff)** | `http://localhost:3001`          | Aplicación Next.js móvil y de escritorio                                   |
| **Backend REST API**          | `http://localhost:4000/api`      | API NestJS                                                                 |
| **Swagger / OpenAPI**         | `http://localhost:4000/api/docs` | Documentación interactiva de endpoints                                     |
| **PostgreSQL**                | `localhost:5435`                 | Base de datos relacional (usuario: `restaurant_user`)                      |
| **Redis**                     | `localhost:6381`                 | Colas y cache                                                              |
| **MinIO Console**             | `http://localhost:9001`          | Panel de almacenamiento S3 (user: `minioadmin` / pass: `minioadminsecret`) |
| **Mailpit Web UI**            | `http://localhost:8025`          | Bandeja de entrada para correos de prueba                                  |

---

## 💻 Desarrollo Local (Sin Docker para Web/API)

Si prefieres ejecutar PostgreSQL, Redis y MinIO en Docker pero el código de Node.js en tu máquina local:

```bash
# 1. Levantar solo los servicios de soporte
docker compose up -d postgres redis minio minio-init mailpit

# 2. Instalar dependencias del monorepo
pnpm install

# 3. Generar cliente de base de datos Prisma
pnpm --filter @restaurant/api prisma:generate

# 4. Iniciar servidores de desarrollo concurrentes
pnpm dev
```

---

## 🧪 Pruebas y Calidad de Código

```bash
# Ejecutar todas las pruebas unitarias
pnpm test

# Verificación estricta de TypeScript
pnpm type-check

# Linter de código
pnpm lint

# Formato de código
pnpm format
```

---

## 📱 Cómo Probar en un Celular Real (HTTPS, Cámara y PWA)

Para probar la experiencia mobile-first desde tu propio celular conectado a la misma red Wi-Fi o mediante un túnel seguro con HTTPS (imprescindible para la cámara QR y el Service Worker):

### Opción A: Vía Cloudflare Tunnel (Gratuito, sin registro)

```bash
# Instala cloudflared y expone la app web:
npx cloudflared tunnel --url http://localhost:3001
```

Copia la URL pública `https://*.trycloudflare.com` en el navegador de tu celular.

### Opción B: Vía ngrok (Gratuito)

```bash
ngrok http 3001
```

---

## 📚 Documentación de Decisiones de Arquitectura (ADR)

- [ADR 0001: Representación de Moneda en COP (Enteros)](docs/decisions/0001-cop-currency-representation.md)
- [ADR 0002: Flujo de Checkout Wompi en Experiencia Móvil](docs/decisions/0002-wompi-checkout-flow.md)
- [ADR 0003: Ciclo de Vida y Seguridad de la Sesión de Mesa](docs/decisions/0003-table-session-lifecycle.md)
- [ADR 0004: Cumplimiento de la Normativa Colombiana de Propinas (Ley 1935 de 2019)](docs/decisions/0004-tips-colombian-regulation.md)
- [ADR 0005: Facturación Electrónica DIAN y Tratamiento de Datos (Ley 1581 de 2012)](docs/decisions/0005-dian-electronic-invoicing.md)

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia [MIT](LICENSE).
