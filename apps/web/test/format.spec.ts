import { describe, it, expect } from 'vitest';
import { formatCOP, ALLERGEN_LABELS, DIETARY_LABELS } from '../lib/format';

describe('Format Utilities (Web PWA)', () => {
  it('formats Colombian Peso amounts correctly without decimals', () => {
    const formatted = formatCOP(38000);
    // es-CO Intl formats to $ 38.000 or $38.000
    expect(formatted).toContain('38.000');
    expect(formatCOP(0)).toContain('0');
  });

  it('provides allergen and dietary labels dictionary', () => {
    expect(ALLERGEN_LABELS.GLUTEN?.label).toBe('Gluten');
    expect(DIETARY_LABELS.VEGETARIAN?.label).toBe('Vegetariano');
    expect(DIETARY_LABELS.GLUTEN_FREE?.label).toBe('Sin Gluten');
  });
});
