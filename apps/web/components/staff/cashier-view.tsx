'use client';

import React, { useState } from 'react';
import { formatMoneyCop } from '@/lib/format';
import { Check, DollarSign, Receipt, CreditCard, Banknote, ShieldCheck } from 'lucide-react';

interface CashierViewProps {
  pendingCashOrders: any[];
  onPaymentConfirmed: () => void;
}

export function CashierView({
  pendingCashOrders,
  onPaymentConfirmed,
}: CashierViewProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleConfirmCash = async (transactionId: string) => {
    setConfirmingId(transactionId);
    try {
      const res = await fetch(`/api/payments/cash/${encodeURIComponent(transactionId)}/confirm`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al confirmar pago en caja');
      }
      onPaymentConfirmed();
    } catch (err: any) {
      alert(err.message || 'Error al confirmar pago');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Control de Caja y Pagos en Efectivo</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {pendingCashOrders.length} por confirmar
          </span>
        </h2>
        <p className="text-xs text-stone-400 mt-0.5">
          Confirma cobros en efectivo para autorizar y liberar comandas hacia la cocina
        </p>
      </div>

      {pendingCashOrders.length === 0 ? (
        <div className="p-8 bg-stone-800/50 border border-stone-700/60 rounded-2xl text-center">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <div className="text-white font-bold text-sm">Caja al día</div>
          <p className="text-stone-400 text-xs mt-0.5">
            No hay solicitudes de pago en efectivo pendientes de confirmación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingCashOrders.map((order) => {
            const cashTx = order.transactions?.[0];

            return (
              <div
                key={order.id}
                className="p-5 bg-stone-800 border-2 border-amber-600/60 rounded-2xl flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-black text-white">
                      Mesa {order.table?.number || '?'}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-stone-950 flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5" />
                      Efectivo Pendiente
                    </span>
                  </div>

                  <div className="text-xs text-stone-400 mb-3">
                    Pedido #{order.orderNumber} · Mesero: {order.waiter?.fullName || 'Sin asignar'}
                  </div>

                  <div className="p-3 bg-stone-900 rounded-xl mb-4 border border-stone-700 space-y-1">
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Subtotal:</span>
                      <span>{formatMoneyCop(order.subtotalCop)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Impuesto (INC/IVA):</span>
                      <span>{formatMoneyCop(order.taxCop)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-stone-400">
                      <span>Propina voluntaria:</span>
                      <span>{formatMoneyCop(order.tipCop)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-white pt-1 border-t border-stone-800">
                      <span>Total a Recibir:</span>
                      <span className="text-emerald-400">{formatMoneyCop(order.totalCop)}</span>
                    </div>
                  </div>
                </div>

                {cashTx && (
                  <button
                    onClick={() => handleConfirmCash(cashTx.id)}
                    disabled={confirmingId === cashTx.id}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all touch-target shadow-lg"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirmar Cobro en Caja</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
