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

// ==============================================================================
// MENU: CATEGORIES, ITEMS, OPTIONS, MODIFIERS & TABLES SCHEMAS
// ==============================================================================

export const AllergenEnum = z.enum([
  'GLUTEN',
  'DAIRY',
  'EGGS',
  'PEANUTS',
  'TREE_NUTS',
  'FISH',
  'SHELLFISH',
  'SOY',
  'SESAME',
]);

export const DietaryFlagEnum = z.enum([
  'VEGETARIAN',
  'VEGAN',
  'GLUTEN_FREE',
  'KETO',
  'HALAL',
]);

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
    .optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CreateMenuItemSchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(120),
  description: z.string().trim().min(2, 'La descripción debe tener al menos 2 caracteres').max(1000),
  basePriceCop: MoneyCopSchema,
  prepTimeMinutes: z.number().int().min(1).max(180).default(15),
  isAvailable: z.boolean().default(true),
  ingredients: z.array(z.string().trim().min(1)).default([]),
  allergens: z.array(AllergenEnum).default([]),
  dietaryFlags: z.array(DietaryFlagEnum).default([]),
  sortOrder: z.number().int().default(0),
});

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();

export const CreateOptionGroupSchema = z
  .object({
    name: z.string().trim().min(2, 'Nombre de grupo requerido').max(80),
    minSelectable: z.number().int().min(0).max(10).default(1),
    maxSelectable: z.number().int().min(1).max(10).default(1),
  })
  .refine((data) => data.minSelectable <= data.maxSelectable, {
    message: 'minSelectable no puede ser mayor que maxSelectable',
    path: ['minSelectable'],
  });

export const UpdateOptionGroupSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  minSelectable: z.number().int().min(0).max(10).optional(),
  maxSelectable: z.number().int().min(1).max(10).optional(),
});

export const CreateOptionSchema = z.object({
  name: z.string().trim().min(1, 'Nombre de opción requerido').max(80),
  additionalPriceCop: MoneyCopSchema.default(0),
  isDefault: z.boolean().default(false),
});

export const UpdateOptionSchema = CreateOptionSchema.partial();

export const CreateModifierSchema = z.object({
  name: z.string().trim().min(1, 'Nombre del adicional requerido').max(80),
  priceCop: MoneyCopSchema,
  isAvailable: z.boolean().default(true),
});

export const UpdateModifierSchema = CreateModifierSchema.partial();

export const CreateTableSchema = z.object({
  number: z.number().int().min(1, 'El número de mesa debe ser positivo').max(999),
  label: z.string().trim().min(1, 'La etiqueta de la mesa es requerida').max(50),
  zone: z.string().trim().max(50).optional(),
  assignedWaiterId: z.string().uuid('ID de mesero inválido').optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UpdateTableSchema = CreateTableSchema.partial();

export const ReorderImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1, 'Debe incluir al menos un ID de imagen'),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof CreateMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>;
export type CreateOptionGroupInput = z.infer<typeof CreateOptionGroupSchema>;
export type UpdateOptionGroupInput = z.infer<typeof UpdateOptionGroupSchema>;
export type CreateOptionInput = z.infer<typeof CreateOptionSchema>;
export type UpdateOptionInput = z.infer<typeof UpdateOptionSchema>;
export type CreateModifierInput = z.infer<typeof CreateModifierSchema>;
export type UpdateModifierInput = z.infer<typeof UpdateModifierSchema>;
export type CreateTableInput = z.infer<typeof CreateTableSchema>;
export type UpdateTableInput = z.infer<typeof UpdateTableSchema>;
export type ReorderImagesInput = z.infer<typeof ReorderImagesSchema>;

