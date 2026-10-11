'use client';

import { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import {
  Utensils,
  Percent,
  Coins,
  Check,
  Lock,
  Loader2,
  ArrowRight,
  Minus,
  Plus,
} from 'lucide-react';
import {
  OrderDTO,
  initBillSplit,
  lockBillSplitItem,
  unlockBillSplitItem,
  payBillSplit,
  BillSplitDTO,
  PaymentResponseDTO,
} from '@/lib/api';
import { formatCOP } from '@/lib/format';

interface BillSplitSheetProps {
  order: OrderDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentInitiated?: (payment: PaymentResponseDTO) => void;
}

export function BillSplitSheet({
  order,
  isOpen,
  onClose,
  onPaymentInitiated,
}: BillSplitSheetProps) {
  const [splitMode, setSplitMode] = useState<'BY_ITEMS' | 'EQUAL_PARTS' | 'CUSTOM_AMOUNT'>('BY_ITEMS');
  const [billSplit, setBillSplit] = useState<BillSplitDTO | null>(null);
  const [participantId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('participant_guest_id');
      if (stored) return stored;
      const created = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('participant_guest_id', created);
      return created;
    }
    return 'guest_default';
  });

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [equalPersons, setEqualPersons] = useState(2);
  const [customAmountCop, setCustomAmountCop] = useState(20000);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or fetch bill split when opened
  useEffect(() => {
    if (!isOpen || !order) return;

    let mounted = true;
    const setupSplit = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const split = await initBillSplit({
          tableSessionId: order.tableSessionId,
          mode: splitMode,
          totalPersons: equalPersons,
        });
        if (mounted) {
          setBillSplit(split);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Error al iniciar la división');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    setupSplit();
    return () => {
      mounted = false;
    };
  }, [isOpen, order, splitMode, equalPersons]);

  if (!order) return null;

  // Toggle item in BY_ITEMS mode
  const handleToggleItem = async (itemId: string) => {
    if (!billSplit) return;
    const isSelected = selectedItemIds.includes(itemId);

    if (isSelected) {
      // Unlock item
      setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
      await unlockBillSplitItem({
        tableSessionId: order.tableSessionId,
        orderItemId: itemId,
        participantId,
      }).catch(() => {});
    } else {
      // Lock item
      try {
        await lockBillSplitItem({
          tableSessionId: order.tableSessionId,
          orderItemId: itemId,
          participantId,
        });
        setSelectedItemIds((prev) => [...prev, itemId]);
      } catch (err: any) {
        setError(err?.message || 'El plato ya está siendo pagado por otro comensal');
      }
    }
  };

  // Calculations for current selection
  const selectedItems = order.items.filter((i) => selectedItemIds.includes(i.id));
  const selectedSubtotal = selectedItems.reduce((sum, i) => sum + i.totalPriceCop, 0);
  const billSubtotal = order.totalCop - order.taxCop - order.tipCop;
  const ratio = billSubtotal > 0 ? selectedSubtotal / billSubtotal : 0;
  const proratedTax = Math.round(order.taxCop * ratio);
  const proratedTip = Math.round(order.tipCop * ratio);
  const itemsTotalToPay = selectedSubtotal + proratedTax + proratedTip;

  // Equal parts calculation
  const equalQuota = Math.round(order.totalCop / equalPersons);

  // Submit payment
  const handlePaySplit = async (provider: 'WOMPI' | 'CASH') => {
    if (!billSplit) return;
    try {
      setIsSubmitting(true);
      setError(null);

      const result = await payBillSplit({
        billSplitId: billSplit.id,
        participantId,
        provider,
        method: provider === 'CASH' ? 'CASH' : 'CARD',
        selectedItemIds: splitMode === 'BY_ITEMS' ? selectedItemIds : undefined,
        customAmountCop: splitMode === 'CUSTOM_AMOUNT' ? customAmountCop : undefined,
      });

      if (onPaymentInitiated) {
        onPaymentInitiated(result);
      }

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        setIsSubmitting(false);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Error al procesar el pago de la cuota');
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[92vh] flex-col rounded-t-[28px] bg-white outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />

          <div className="p-5 pb-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Dividir Cuenta</h2>
                <p className="text-xs text-slate-500">Mesa {order.table.number} · Total: {formatCOP(order.totalCop)}</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                {error}
              </div>
            )}

            {/* Mode selection tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setSplitMode('BY_ITEMS')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  splitMode === 'BY_ITEMS'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Utensils className="h-4 w-4 mb-1" />
                <span>Por Platos</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('EQUAL_PARTS')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  splitMode === 'EQUAL_PARTS'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Percent className="h-4 w-4 mb-1" />
                <span>Partes Iguales</span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('CUSTOM_AMOUNT')}
                className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  splitMode === 'CUSTOM_AMOUNT'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coins className="h-4 w-4 mb-1" />
                <span>Monto Libre</span>
              </button>
            </div>

            {isLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : (
              <>
                {/* 1. BY_ITEMS VIEW */}
                {splitMode === 'BY_ITEMS' && (
                  <div className="space-y-3 mb-5">
                    <p className="text-xs text-slate-500">Selecciona los platos que tú consumiste:</p>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {order.items.map((item) => {
                        const isSelected = selectedItemIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => !item.isPaid && handleToggleItem(item.id)}
                            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                              item.isPaid
                                ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'bg-emerald-50/70 border-emerald-500'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${
                                  item.isPaid
                                    ? 'bg-slate-200 text-slate-500'
                                    : isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-slate-300'
                                }`}
                              >
                                {item.isPaid ? (
                                  <Lock className="h-3 w-3" />
                                ) : isSelected ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : null}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {item.quantity}x {item.menuItem?.name || 'Plato'}
                                </div>
                                {item.isPaid && (
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                                    Ya pagado
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-slate-900">
                              {formatCOP(item.totalPriceCop)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Breakdown */}
                    {selectedItemIds.length > 0 && (
                      <div className="rounded-2xl bg-emerald-50/50 p-3.5 space-y-1 text-xs text-slate-600 border border-emerald-100">
                        <div className="flex justify-between">
                          <span>Subtotal seleccionado ({selectedItems.length} platos)</span>
                          <span>{formatCOP(selectedSubtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Impuesto INC (8% prorrateado)</span>
                          <span>{formatCOP(proratedTax)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Propina (10% prorrateada)</span>
                          <span>{formatCOP(proratedTip)}</span>
                        </div>
                        <div className="border-t border-emerald-200/60 pt-1.5 flex justify-between font-bold text-emerald-900 text-sm">
                          <span>Mi Total a Pagar</span>
                          <span>{formatCOP(itemsTotalToPay)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. EQUAL PARTS VIEW */}
                {splitMode === 'EQUAL_PARTS' && (
                  <div className="space-y-4 mb-5">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <div className="text-sm font-bold text-slate-900">Número de personas</div>
                        <div className="text-xs text-slate-500">Divide el total en cuotas iguales</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEqualPersons((p) => Math.max(2, p - 1))}
                          className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-base font-extrabold text-slate-900 min-w-[20px] text-center">
                          {equalPersons}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEqualPersons((p) => Math.min(10, p + 1))}
                          className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                      <span className="text-xs text-emerald-700 font-medium block mb-1">
                        Tu cuota exacta (1 de {equalPersons})
                      </span>
                      <span className="text-2xl font-black text-emerald-800">
                        {formatCOP(equalQuota)}
                      </span>
                      <p className="text-[11px] text-emerald-600/80 mt-1">
                        Incluye consumo, impuestos y propina divididos equitativamente
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. CUSTOM AMOUNT VIEW */}
                {splitMode === 'CUSTOM_AMOUNT' && (
                  <div className="space-y-4 mb-5">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Monto que deseas abonar (COP)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        min="1000"
                        max={order.totalCop}
                        value={customAmountCop}
                        onChange={(e) => setCustomAmountCop(Number(e.target.value))}
                        className="w-full text-xl font-bold p-3.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                      <span>Saldo total de la mesa:</span>
                      <span className="font-semibold text-slate-800">{formatCOP(order.totalCop)}</span>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handlePaySplit('WOMPI')}
                    disabled={isSubmitting || (splitMode === 'BY_ITEMS' && selectedItemIds.length === 0)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-600 text-white font-medium shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    <span className="text-sm font-bold">Pagar mi parte con Wompi</span>
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-5 w-5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePaySplit('CASH')}
                    disabled={isSubmitting || (splitMode === 'BY_ITEMS' && selectedItemIds.length === 0)}
                    className="w-full flex items-center justify-center p-3.5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    Pagar mi parte en Efectivo (Caja)
                  </button>
                </div>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
