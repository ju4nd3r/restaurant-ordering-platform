# ADR 0004: Cumplimiento de la Normativa Colombiana de Propinas (Ley 1935 de 2019)

## Estado

Aceptado

## Contexto

En Colombia, la Ley 1935 de 2019 y las directrices de la Superintendencia de Industria y Comercio (SIC) regulan estrictamente las propinas en establecimientos gastronómicos:

- La propina es enteramente **voluntaria**.
- La sugerencia estándar en la factura no puede exceder el 10% del valor del servicio.
- El cliente tiene derecho a aceptarla, rechazarla o modificar su monto.
- Las sumas por concepto de propina **no constituyen ingreso operacional del restaurante ni salario básico**; pertenecen exclusivamente a los trabajadores y no generan IVA ni Impuesto Nacional al Consumo (INC).

## Decisión

1. En la interfaz del comensal, la propina se muestra con un porcentaje sugerido del 10%, con opciones rápidas de 0%, 5%, 10%, 15% o valor libre en COP.
2. En la base de datos y modelo contable:
   - `subtotalCop`: costo de platos y extras.
   - `taxCop`: Impuesto Nacional al Consumo (INC 8%) o IVA (19%) calculado exclusivamente sobre el subtotal.
   - `tipCop`: valor de la propina, estrictamente segregado.
   - `totalCop = subtotalCop + taxCop + tipCop`.
3. Soporte para reglas de distribución configurables mediante el patrón Strategy:
   - `ASSIGNED_WAITER`: 100% de la propina al mesero asignado a la mesa.
   - `POOL_SHIFT`: Pozo común distribuido equitativamente entre los trabajadores activos del turno.
   - `CUSTOM_PERCENTAGES`: Reparto porcentual configurable.

## Consecuencias

- Cumplimiento estricto con las inspecciones de la SIC y normatividad laboral colombiana.
- Transparencia total en los reportes de meseros y de nómina.
