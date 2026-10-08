# ADR 0001: Representación de Moneda en COP (Enteros)

## Estado

Aceptado

## Contexto

En Colombia, la moneda oficial es el Peso Colombiano (COP). Desde hace varias décadas, los centavos no circulan ni tienen validez práctica en transacciones comerciales. Usar números de punto flotante (`float`, `double` o `Number` de JavaScript) introduce errores de redondeo de punto flotante binario (ej. `0.1 + 0.2 !== 0.3`).

## Decisión

1. Todos los precios, subtotales, propinas, impuestos y totales se almacenarán y procesarán como **enteros positivos (`Int` en base de datos PostgreSQL/Prisma)**.
2. No se usarán decimales en ninguna entidad financiera.
3. Se implementará un Value Object reutilizable (`MoneyCOP`) en el paquete compartido para encapsular operaciones aritméticas, porcentajes (impuesto al consumo del 8% o IVA) y algoritmos de división sin pérdida de pesos.

## Consecuencias

- Cero discrepancias por redondeo de coma flotante.
- Compatibilidad directa con la API de Wompi (que espera `amount_in_cents` o montos enteros en COP).
- Menor tamaño de almacenamiento en base de datos.
