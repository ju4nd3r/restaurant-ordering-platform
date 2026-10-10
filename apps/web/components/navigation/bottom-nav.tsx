'use client';

import React from 'react';
import { UtensilsCrossed, ClipboardList, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../lib/store/cart-store';
import { formatCOP } from '../../lib/format';

export type ActiveTab = 'menu' | 'orders' | 'cart';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCart?: () => void;
}

export function BottomNav({ activeTab, onTabChange, onOpenCart }: BottomNavProps) {
  const itemCount = useCartStore((state) => state.getItemCount());
  const subtotal = useCartStore((state) => state.getSubtotalCop());

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 max-w-lg mx-auto bg-white/95 backdrop-blur-md border-t border-stone-200/90 pb-safe shadow-lg">
      {/* Floating cart highlight banner if items exist in cart */}
      {itemCount > 0 && activeTab !== 'cart' && (
        <div className="px-4 pt-2 pb-1">
          <button
            onClick={() => {
              if (onOpenCart) onOpenCart();
              else onTabChange('cart');
            }}
            className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white px-4 py-2.5 rounded-xl shadow-md flex items-center justify-between text-xs font-bold transition-all touch-target"
          >
            <div className="flex items-center gap-2">
              <span className="bg-stone-900 text-white text-[11px] px-2 py-0.5 rounded-full font-black">
                {itemCount}
              </span>
              <span>Ver pedido actual</span>
            </div>
            <span>{formatCOP(subtotal)}</span>
          </button>
        </div>
      )}

      {/* Navigation tabs */}
      <nav aria-label="Navegación principal" className="flex items-center justify-around px-2 py-1">
        <button
          onClick={() => onTabChange('menu')}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors touch-target ${
            activeTab === 'menu' ? 'text-stone-900 font-bold' : 'text-stone-400 font-medium hover:text-stone-600'
          }`}
        >
          <UtensilsCrossed className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Menú</span>
        </button>

        <button
          onClick={() => onTabChange('orders')}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors touch-target ${
            activeTab === 'orders' ? 'text-stone-900 font-bold' : 'text-stone-400 font-medium hover:text-stone-600'
          }`}
        >
          <ClipboardList className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mi Mesa</span>
        </button>

        <button
          onClick={() => onTabChange('cart')}
          className={`flex-1 flex flex-col items-center justify-center py-2 relative transition-colors touch-target ${
            activeTab === 'cart' ? 'text-stone-900 font-bold' : 'text-stone-400 font-medium hover:text-stone-600'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Mi Cuenta</span>
        </button>
      </nav>
    </div>
  );
}
