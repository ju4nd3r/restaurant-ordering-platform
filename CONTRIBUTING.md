# Contribuyendo a Restaurant Ordering Platform

¡Gracias por contribuir a la plataforma de pedidos y pagos mobile-first para restaurantes en Colombia!

## Estándares de Trabajo

1. **Conventional Commits**: Todos los commits deben seguir la convención:
   - `feat:` Nuevas funcionalidades
   - `fix:` Correcciones de errores
   - `chore:` Mantenimiento, dependencias o configuración
   - `docs:` Documentación
   - `test:` Nuevas pruebas o mejoras de pruebas
   - `refactor:` Refactorización sin cambio de comportamiento
2. **TypeScript Estricto**: Cero uso de `any`, tipado explícito y validación de tipos sin errores.
3. **Flujo de Ramas**:
   - `main`: Código probado y listo para producción.
   - `feature/*` o `fix/*`: Ramas de trabajo para cada funcionalidad.
4. **Verificación Local**:
   - Antes de abrir un PR o hacer push, verifica:
     ```bash
     pnpm lint
     pnpm type-check
     pnpm test
     pnpm build
     ```
5. **Decisiones de Arquitectura**: Cualquier cambio estructural o de negocio relevante debe documentarse como un ADR en `docs/decisions/`.
