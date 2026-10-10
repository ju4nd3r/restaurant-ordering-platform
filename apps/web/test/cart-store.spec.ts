import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../lib/store/cart-store';

describe('useCartStore (Zustand)', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('adds an item to cart and calculates unit and total prices with options and modifiers', () => {
    useCartStore.getState().addItem({
      menuItemId: 'item-1',
      name: 'Bandeja Paisa',
      basePriceCop: 38000,
      quantity: 2,
      selectedOptions: [
        {
          optionGroupId: 'group-1',
          optionGroupName: 'Término de la carne',
          optionId: 'opt-1',
          optionName: 'Bien asada',
          additionalPriceCop: 0,
        },
      ],
      selectedModifiers: [
        {
          modifierId: 'mod-1',
          name: 'Aguacate extra',
          priceCop: 4000,
        },
      ],
      comment: 'Sin cebolla',
    });

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    // Unit price: 38000 + 0 + 4000 = 42000
    expect(items[0]?.unitPriceCop).toBe(42000);
    // Total price: 42000 * 2 = 84000
    expect(items[0]?.totalPriceCop).toBe(84000);
    expect(useCartStore.getState().getSubtotalCop()).toBe(84000);
    expect(useCartStore.getState().getItemCount()).toBe(2);
  });

  it('updates quantity of an item', () => {
    useCartStore.getState().addItem({
      menuItemId: 'item-2',
      name: 'Ajiaco',
      basePriceCop: 30000,
      quantity: 1,
      selectedOptions: [],
      selectedModifiers: [],
    });

    const cartItemId = useCartStore.getState().items[0]?.cartItemId;
    expect(cartItemId).toBeDefined();

    useCartStore.getState().updateQuantity(cartItemId!, 3);

    expect(useCartStore.getState().getItemCount()).toBe(3);
    expect(useCartStore.getState().getSubtotalCop()).toBe(90000);
  });

  it('removes an item if quantity is set to 0', () => {
    useCartStore.getState().addItem({
      menuItemId: 'item-3',
      name: 'Limonada',
      basePriceCop: 8000,
      quantity: 1,
      selectedOptions: [],
      selectedModifiers: [],
    });

    const cartItemId = useCartStore.getState().items[0]?.cartItemId;
    useCartStore.getState().updateQuantity(cartItemId!, 0);

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().getItemCount()).toBe(0);
  });
});
