import { describe, it, expect } from 'vitest';
import {
  CreateCategorySchema,
  CreateMenuItemSchema,
  CreateOptionGroupSchema,
  CreateTableSchema,
  CreateModifierSchema,
} from './schemas.js';

describe('Validation Schemas (Menu & Tables)', () => {
  it('validates category creation schema correctly', () => {
    const valid = CreateCategorySchema.parse({
      name: 'Platos Fuertes',
      slug: 'platos-fuertes',
      sortOrder: 1,
      isActive: true,
    });
    expect(valid.name).toBe('Platos Fuertes');
    expect(valid.slug).toBe('platos-fuertes');

    // Invalid slug with uppercase or spaces
    expect(() =>
      CreateCategorySchema.parse({
        name: 'Platos',
        slug: 'Platos Fuertes!',
      }),
    ).toThrow();
  });

  it('validates menu item creation with COP integer price', () => {
    const valid = CreateMenuItemSchema.parse({
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Bandeja Paisa',
      description: 'Tradicional plato antioqueño con frijoles, arroz, chicharrón, carne y huevo',
      basePriceCop: 38000,
      prepTimeMinutes: 20,
      isAvailable: true,
      allergens: ['EGGS'],
      dietaryFlags: [],
    });
    expect(valid.basePriceCop).toBe(38000);

    // Negative price
    expect(() =>
      CreateMenuItemSchema.parse({
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Plato',
        description: 'Desc',
        basePriceCop: -500,
      }),
    ).toThrow();

    // Float price
    expect(() =>
      CreateMenuItemSchema.parse({
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Plato',
        description: 'Desc',
        basePriceCop: 25000.5,
      }),
    ).toThrow();
  });

  it('validates option group min and max selectables', () => {
    const valid = CreateOptionGroupSchema.parse({
      name: 'Término de la carne',
      minSelectable: 1,
      maxSelectable: 1,
    });
    expect(valid.minSelectable).toBe(1);

    // minSelectable > maxSelectable should fail
    expect(() =>
      CreateOptionGroupSchema.parse({
        name: 'Término de la carne',
        minSelectable: 2,
        maxSelectable: 1,
      }),
    ).toThrow(/minSelectable/);
  });

  it('validates table creation schema', () => {
    const valid = CreateTableSchema.parse({
      number: 5,
      label: 'Mesa 5',
      zone: 'Terraza',
      isActive: true,
    });
    expect(valid.number).toBe(5);

    // Non-positive table number
    expect(() =>
      CreateTableSchema.parse({
        number: 0,
        label: 'Mesa 0',
      }),
    ).toThrow();
  });

  it('validates modifier creation schema', () => {
    const valid = CreateModifierSchema.parse({
      name: 'Queso campesino extra',
      priceCop: 4500,
      isAvailable: true,
    });
    expect(valid.priceCop).toBe(4500);
  });
});
