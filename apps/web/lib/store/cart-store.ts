import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SelectedOption {
  optionGroupId: string;
  optionGroupName: string;
  optionId: string;
  optionName: string;
  additionalPriceCop: number;
}

export interface SelectedModifier {
  modifierId: string;
  name: string;
  priceCop: number;
}

export interface CartItem {
  cartItemId: string; // unique hash/uuid per customized item
  menuItemId: string;
  name: string;
  imageUrl?: string;
  basePriceCop: number;
  unitPriceCop: number;
  quantity: number;
  totalPriceCop: number;
  selectedOptions: SelectedOption[];
  selectedModifiers: SelectedModifier[];
  comment?: string;
}

export interface TableContext {
  qrToken: string;
  tableId: string;
  tableNumber: number;
  tableLabel: string;
  tableZone?: string;
  sessionId: string;
  sessionToken: string;
  restaurantId: string;
  restaurantName: string;
  taxPercentage: number;
  defaultTipPercentage: number;
  waiterName?: string;
}

interface CartState {
  tableContext: TableContext | null;
  items: CartItem[];
  setTableContext: (context: TableContext) => void;
  addItem: (item: Omit<CartItem, 'cartItemId' | 'unitPriceCop' | 'totalPriceCop'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getSubtotalCop: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tableContext: null,
      items: [],

      setTableContext: (context) => {
        set({ tableContext: context });
      },

      addItem: (newItem) => {
        const optionsSum = newItem.selectedOptions.reduce(
          (acc, o) => acc + o.additionalPriceCop,
          0,
        );
        const modifiersSum = newItem.selectedModifiers.reduce(
          (acc, m) => acc + m.priceCop,
          0,
        );
        const unitPriceCop = newItem.basePriceCop + optionsSum + modifiersSum;
        const totalPriceCop = unitPriceCop * newItem.quantity;

        // Generate deterministic key for identical item customization
        const customizationSignature = JSON.stringify({
          menuItemId: newItem.menuItemId,
          options: [...newItem.selectedOptions].sort((a, b) => a.optionId.localeCompare(b.optionId)),
          modifiers: [...newItem.selectedModifiers].sort((a, b) =>
            a.modifierId.localeCompare(b.modifierId),
          ),
          comment: newItem.comment?.trim() || '',
        });
        const cartItemId = `${newItem.menuItemId}_${btoa(customizationSignature).slice(0, 16)}`;

        const existingItems = get().items;
        const existingIndex = existingItems.findIndex((it) => it.cartItemId === cartItemId);

        if (existingIndex > -1) {
          const updatedItems = [...existingItems];
          const found = updatedItems[existingIndex];
          if (found) {
            const newQty = found.quantity + newItem.quantity;
            updatedItems[existingIndex] = {
              ...found,
              quantity: newQty,
              totalPriceCop: found.unitPriceCop * newQty,
            };
          }
          set({ items: updatedItems });
        } else {
          set({
            items: [
              ...existingItems,
              {
                ...newItem,
                cartItemId,
                unitPriceCop,
                totalPriceCop,
              },
            ],
          });
        }
      },

      removeItem: (cartItemId) => {
        set({ items: get().items.filter((it) => it.cartItemId !== cartItemId) });
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set({
          items: get().items.map((it) =>
            it.cartItemId === cartItemId
              ? {
                  ...it,
                  quantity,
                  totalPriceCop: it.unitPriceCop * quantity,
                }
              : it,
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getSubtotalCop: () => {
        return get().items.reduce((acc, it) => acc + it.totalPriceCop, 0);
      },

      getItemCount: () => {
        return get().items.reduce((acc, it) => acc + it.quantity, 0);
      },
    }),
    {
      name: 'resto_pwa_cart_storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    },
  ),
);
