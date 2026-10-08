import { z } from 'zod';

export const MoneyCopSchema = z
  .number()
  .int('El monto debe ser un entero en COP')
  .nonnegative('El monto no puede ser negativo');

export const CustomerBillingSchema = z.discriminatedUnion('isFinalConsumer', [
  z.object({
    isFinalConsumer: z.literal(true),
    docType: z.literal('FINAL_CONSUMER').default('FINAL_CONSUMER'),
    docNumber: z.literal('222222222222').default('222222222222'),
    fullNameOrLegalName: z.literal('Consumidor Final').default('Consumidor Final'),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    habeasDataAccepted: z.boolean().default(true),
  }),
  z.object({
    isFinalConsumer: z.literal(false),
    docType: z.enum(['CC', 'NIT', 'CE', 'PASSPORT']),
    docNumber: z.string().min(5, 'Número de documento inválido').max(20),
    fullNameOrLegalName: z.string().min(3, 'Nombre o razón social requerida'),
    email: z.string().email('Correo electrónico válido requerido para la factura electrónica'),
    phone: z.string().min(7, 'Teléfono de contacto requerido').optional(),
    address: z.string().min(5, 'Dirección fiscal requerida').optional(),
    habeasDataAccepted: z.literal(true, {
      errorMap: () => ({
        message: 'Debe aceptar la política de tratamiento de datos (Ley 1581 de 2012)',
      }),
    }),
  }),
]);

export const OrderItemOptionSelectionSchema = z.object({
  optionGroupId: z.string().uuid(),
  optionGroupName: z.string(),
  optionId: z.string().uuid(),
  optionName: z.string(),
  additionalPriceCop: MoneyCopSchema,
});

export const OrderItemModifierSelectionSchema = z.object({
  modifierId: z.string().uuid(),
  name: z.string(),
  priceCop: MoneyCopSchema,
});

export const CreateOrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  comment: z.string().max(250).optional(),
  selectedOptions: z.array(OrderItemOptionSelectionSchema).default([]),
  selectedModifiers: z.array(OrderItemModifierSelectionSchema).default([]),
});

export const CreateOrderSchema = z.object({
  tableSessionToken: z.string().min(10),
  items: z.array(CreateOrderItemSchema).min(1, 'Debe incluir al menos un plato en el pedido'),
  customerNotes: z.string().max(300).optional(),
  tipPercentage: z.number().min(0).max(30).default(10),
});

export const BillSplitEqualPartsSchema = z.object({
  tableSessionToken: z.string().min(10),
  numberOfParts: z.number().int().min(2).max(20),
});

export const BillSplitByItemsSchema = z.object({
  tableSessionToken: z.string().min(10),
  selectedItemIds: z.array(z.string().uuid()).min(1),
  tipPercentage: z.number().min(0).max(30).default(10),
});

export const BillSplitCustomAmountSchema = z.object({
  tableSessionToken: z.string().min(10),
  amountCop: MoneyCopSchema.min(1000, 'El monto mínimo a pagar es $1.000 COP'),
});

export const StaffLoginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
