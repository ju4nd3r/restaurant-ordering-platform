'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { CreditCard, Banknote, Users, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { OrderDTO, createOrderPayment, PaymentResponseDTO } from '@/lib/api';
import { formatCOP } from '@/lib/format';

interface PaymentSheetProps {
  order: OrderDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSplit: () => void;
  onPaymentInitiated?: (payment: PaymentResponseDTO) => void;
}

export function PaymentSheet({
  order,
  isOpen,
  onClose,
  onOpenSplit,
  onPaymentInitiated,
}: PaymentSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const handlePayFullWompi = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const result = await createOrderPayment({
        orderId: order.id,
        provider: 'WOMPI',
        method: 'CARD',
      });

      if (onPaymentInitiated) {
        onPaymentInitiated(result);
      }

      if (result.paymentUrl) {
        // Redirect to Wompi hosted checkout
        window.location.href = result.paymentUrl;
      }
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar el pago con Wompi');
      setIsSubmitting(false);
    }
  };

  const handlePayCash = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const result = await createOrderPayment({
        orderId: order.id,
        provider: 'CASH',
        method: 'CASH',
      });

      if (onPaymentInitiated) {
        onPaymentInitiated(result);
      }

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al solicitar pago en efectivo');
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[90vh] flex-col rounded-t-[28px] bg-white outline-none">
          {/* Grab handle */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />

          <div className="p-5 pb-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Pagar Pedido #{order.orderNumber}</h2>
                <p className="text-xs text-slate-500">Mesa {order.table.number} · {order.table.label}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total a pagar</span>
                <span className="text-xl font-extrabold text-emerald-600">{formatCOP(order.totalCop)}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                {error}
              </div>
            )}

            {/* Breakdown summary */}
            <div className="rounded-2xl bg-slate-50 p-3.5 mb-5 space-y-1.5 text-xs text-slate-600 border border-slate-100">
              <div className="flex justify-between">
                <span>Subtotal ({order.items.length} platos)</span>
                <span>{formatCOP(order.subtotalCop)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuesto al Consumo (INC 8%)</span>
                <span>{formatCOP(order.taxCop)}</span>
              </div>
              <div className="flex justify-between">
                <span>Propina voluntaria sugerida</span>
                <span>{formatCOP(order.tipCop)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total</span>
                <span>{formatCOP(order.totalCop)}</span>
              </div>
            </div>

            {/* Payment Options */}
            <div className="space-y-3">
              {/* Wompi Online */}
              <button
                type="button"
                onClick={handlePayFullWompi}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-600 text-white font-medium shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold">Pagar con Wompi</div>
                    <div className="text-[11px] text-emerald-100">Tarjetas, PSE, Nequi, Bancolombia</div>
                  </div>
                </div>
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </button>

              {/* Cash at cashier */}
              <button
                type="button"
                onClick={handlePayCash}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800 font-medium active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Banknote className="h-5 w-5 text-amber-700" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900">Pagar en Caja (Efectivo)</div>
                    <div className="text-[11px] text-slate-500">Abona directamente con el cajero</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </button>

              {/* Split with friends */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSplit();
                }}
                disabled={isSubmitting}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-slate-800 font-medium active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-indigo-700" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-900">Dividir cuenta con acompañantes</div>
                    <div className="text-[11px] text-slate-500">Por platos, partes iguales o monto libre</div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-indigo-400" />
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
