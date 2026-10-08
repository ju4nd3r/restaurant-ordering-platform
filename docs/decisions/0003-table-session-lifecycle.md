# ADR 0003: Ciclo de Vida y Seguridad de la Sesión de Mesa (`/m/{token}`)

## Estado

Aceptado

## Contexto

El cliente accede mediante un código QR sin usuario ni contraseña. Se requiere identificar la mesa de manera opaca para impedir que un usuario altere la URL (`/m/1`, `/m/2`) para ver o alterar pedidos ajenos. Asimismo, varios comensales deben poder ingresar a la misma mesa simultáneamente para dividir la cuenta.

## Decisión

1. **Tokens Opacos:** Cada mesa física posee un `qrToken` estático opaco generado con alta entropía (NanoID alfanumérico seguro de 21 caracteres).
2. **Sesión Activa (`TableSession`):**
   - Al escanear el QR, el backend asocia la solicitud a la `TableSession` activa de esa mesa o abre una nueva si no existe una abierta.
   - El cliente recibe una cookie `table_session_id` (`HttpOnly`, `SameSite=Lax`, `Secure`).
3. **Expiración y Cierre de Sesión:**
   - Una sesión se cierra automáticamente cuando todos los pedidos de la mesa están en estado `DELIVERED` y la cuenta total está 100% pagada (`PAID`), tras un periodo de cortesía de 30 minutos.
   - Puede ser cerrada inmediatamente por el personal del restaurante (cajero/admin) al desocupar la mesa.
   - Si no hay actividad durante 6 horas continuas, la sesión expira automáticamente.

## Consecuencias

- Seguridad por diseño: Imposibilidad de enumeración de mesas por fuerza bruta.
- Soporte para múltiples celulares en la misma mesa física sincronizados en tiempo real.
