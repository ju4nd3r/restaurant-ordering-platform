'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Drawer } from 'vaul';
import { Trash2, Minus, Plus, X, ShoppingBag, Send, AlertCircle } from 'lucide-react';
import { useCartStore } from '../../lib/store/cart-store';
import { formatCOP } from '../../lib/format';
import { createOrder, getFullImageUrl, OrderDTO } from '../../lib/api';

interface CartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: OrderDTO) => void;
}

export function CartSheet({ isOpen, onClose, onOrderCreated }: CartSheetProps) {
  const items = useCartStore((state) => state.items);
  const tableContext = useCartStore((state) => state.tableContext);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const getSubtotalCop = useCartStore((state) => state.getSubtotalCop);

  // Tip percentage selection (Default 10% per Ley 1935)
  const defaultTip = tableContext?.defaultTipPercentage ?? 10;
  const [tipPercentage, setTipPercentage] = useState<number>(defaultTip);

  // General order notes
  const [customerNotes, setCustomerNotes] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Financial calculations
  const subtotalCop = getSubtotalCop();
  const taxPercentage = tableContext?.taxPercentage ?? 8;
  const taxCop = Math.round(subtotalCop * (taxPercentage / 100));
  const tipCop = Math.round(subtotalCop * (tipPercentage / 100));
  const totalCop = subtotalCop + taxCop + tipCop;

  const handleConfirmOrder = async () => {
    if (!tableContext) {
      setErrorMessage('No hay sesión de mesa activa conectada.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Agrega al menos un plato antes de enviar el pedido.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const order = await createOrder({
        tableSessionToken: tableContext.sessionToken,
        customerNotes: customerNotes.trim() || undefined,
        tipPercentage,
        items: items.map((it) => ({
          menuItemId: it.menuItemId,
          quantity: it.quantity,
          comment: it.comment,
          selectedOptions: it.selectedOptions.map((o) => ({
            optionGroupId: o.optionGroupId,
            optionGroupName: o.optionGroupName,
            optionId: o.optionId,
            optionName: o.optionName,
            additionalPriceCop: o.additionalPriceCop,
          })),
          selectedModifiers: it.selectedModifiers.map((m) => ({
            modifierId: m.modifierId,
            name: m.name,
            priceCop: m.priceCop,
          })),
        })),
      });

      // Clear cart
      clearCart();

      // Mobile haptic vibration
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([20, 50, 20]);
      }

      onClose();
      onOrderCreated(order);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Error al enviar el pedido a la cocina');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tipOptions = [
    { value: 10, label: '10% (Sugerida)' },
    { value: 0, label: '0% (Sin propina)' },
    { value: 5, label: '5%' },
    { value: 15, label: '15%' },
  ];

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[28px] max-h-[92vh] fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto outline-none shadow-2xl">
          {/* Handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-stone-300 my-3" />

          {/* Header */}
          <div className="px-5 pb-3 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-stone-900 tracking-tight">
                  Tu Pedido
                </h2>
                <span className="text-xs text-stone-500">
                  Mesa {tableContext?.tableNumber ?? ''} · {items.length} {items.length === 1 ? 'plato' : 'platos'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 touch-target"
              aria-label="Cerrar pedido"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-5 py-4 pb-36 flex-1 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12 px-4 bg-stone-50 rounded-2xl border border-stone-200/80 my-4">
                <span className="text-4xl block mb-2">🍽️</span>
                <h3 className="text-sm font-bold text-stone-800">El carrito está vacío</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                  Selecciona los platos y bebidas que deseas pedir para tu mesa.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 bg-stone-900 text-white font-semibold text-xs px-4 py-2.5 rounded-xl touch-target"
                >
                  Ver Menú
                </button>
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="space-y-3">
                  {items.map((it) => (
                    <div
                      key={it.cartItemId}
                      className="p-3.5 bg-stone-50 border border-stone-200/90 rounded-2xl flex items-start justify-between gap-3"
                    >
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {it.imageUrl ? (
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-stone-200">
                            <Image
                              src={getFullImageUrl(it.imageUrl)}
                              alt={it.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-stone-200 flex items-center justify-center shrink-0 text-lg">
                            🍽️
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-stone-900 leading-snug truncate">
                            {it.name}
                          </h4>
                          <span className="text-xs font-bold text-amber-700 block mt-0.5">
                            {formatCOP(it.unitPriceCop)}
                          </span>

                          {/* Selected options & modifiers */}
                          {it.selectedOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {it.selectedOptions.map((o) => (
                                <span
                                  key={o.optionId}
                                  className="text-[10px] bg-white border border-stone-200 px-1.5 py-0.5 rounded text-stone-600"
                                >
                                  {o.optionName}
                                </span>
                              ))}
                            </div>
                          )}

                          {it.selectedModifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {it.selectedModifiers.map((m) => (
                                <span
                                  key={m.modifierId}
                                  className="text-[10px] bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-amber-800 font-medium"
                                >
                                  +{m.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {it.comment && (
                            <p className="text-[10px] text-stone-500 italic mt-1 line-clamp-1">
                              &ldquo;{it.comment}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Quantity controls & Delete */}
                      <div className="flex flex-col items-end justify-between h-full gap-2 shrink-0">
                        <button
                          onClick={() => removeItem(it.cartItemId)}
                          className="text-stone-400 hover:text-rose-500 p-1 touch-target transition-colors"
                          aria-label={`Eliminar ${it.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center bg-white border border-stone-200 rounded-lg p-0.5 shadow-sm">
                          <button
                            onClick={() => updateQuantity(it.cartItemId, it.quantity - 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-stone-700 active:scale-90"
                            aria-label="Restar uno"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-black text-stone-900">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(it.cartItemId, it.quantity + 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-stone-700 active:scale-90"
                            aria-label="Sumar uno"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Customer order notes */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <label
                    htmlFor="order-general-notes"
                    className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 block"
                  >
                    Instrucciones para el mesero o cocina
                  </label>
                  <textarea
                    id="order-general-notes"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value.slice(0, 300))}
                    placeholder="Ej. Servir bebidas primero, cubiertos adicionales..."
                    rows={2}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>

                {/* Tip Selector (Ley 1935 de 2019) */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                      Propina voluntaria
                    </span>
                    <span className="text-[11px] font-semibold text-stone-500">
                      Ley 1935 de 2019
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {tipOptions.map((opt) => {
                      const isSelected = tipPercentage === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTipPercentage(opt.value)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center touch-target ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-stone-900">{formatCOP(subtotalCop)}</span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600">
                    <span>Impuesto al Consumo (INC {taxPercentage}%):</span>
                    <span className="font-semibold text-stone-900">{formatCOP(taxCop)}</span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600">
                    <span>Propina voluntaria ({tipPercentage}%):</span>
                    <span className="font-semibold text-amber-700">{formatCOP(tipCop)}</span>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-sm font-black text-stone-900">
                    <span>Total a Pagar:</span>
                    <span className="text-base text-stone-900">{formatCOP(totalCop)}</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sticky Bottom Confirmation */}
          {items.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 shadow-lg">
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-between shadow-md transition-all touch-target"
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Enviando a cocina...' : 'Confirmar y Enviar Pedido'}</span>
                </div>
                <span className="bg-stone-900/40 px-2.5 py-1 rounded-lg text-xs font-black">
                  {formatCOP(totalCop)}
                </span>
              </button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
