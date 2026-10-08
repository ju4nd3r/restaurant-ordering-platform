# ADR 0005: Facturación Electrónica DIAN y Tratamiento de Datos (Ley 1581 de 2012)

## Estado

Aceptado

## Contexto

En Colombia, la Dirección de Impuestos y Aduanas Nacionales (DIAN) exige la emisión de factura electrónica de venta o documento equivalente electrónico POS. Todo software que procese transacciones comerciales debe permitir emitir la factura electrónica y acatar la Ley Estatutaria 1581 de 2012 de Protección de Datos Personales (Habeas Data).

## Decisión

1. **Flujo para el Comensal:**
   - Opción por defecto: **"Consumidor Final"** (identificación con NIT/Cédula genérica `222222222222`, sin solicitud de datos adicionales). Cero fricción en el checkout móvil.
   - Opción **"Factura a mis datos"**: formulario con tipo de documento (CC, NIT, CE, Pasaporte), número, razón social/nombre, correo electrónico y dirección. Casilla de consentimiento explícito de tratamiento de datos personales conforme a la Ley 1581 de 2012.
2. **Arquitectura Asíncrona:**
   - La emisión hacia el proveedor tecnológico DIAN se procesa en una cola en segundo plano (BullMQ + Redis) **después** de confirmarse el pago.
   - Cualquier error o lentitud en los servidores de la DIAN no bloquea la confirmación del pedido, la preparación en cocina ni la salida del comensal.
   - En caso de rechazo, el sistema almacena el código de error y habilita reintento manual o automático con backoff exponencial.
3. **Abstracción:**
   - Interfaz `ElectronicInvoiceProvider` con implementaciones:
     - `FakeElectronicInvoiceProvider`: para desarrollo, CI y pruebas locales (sin costos de folios).
     - Proveedores autorizados (Factus / Alegra / Dataico / Siigo).

## Consecuencias

- Cumplimiento de la normativa tributaria colombiana sin degradar la experiencia de usuario ni depender de la disponibilidad en tiempo real de la DIAN.
