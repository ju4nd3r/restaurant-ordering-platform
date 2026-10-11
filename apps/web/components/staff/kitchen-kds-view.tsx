'use client';

import React, { useState, useEffect } from 'react';
import { OrderDTO, updateOrderStatus } from '@/lib/api';
import { formatMoneyCop } from '@/lib/format';
import { playOrderReadyAlert } from '@/lib/audio';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  Flame,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface KitchenKdsViewProps {
  orders: OrderDTO[];
  onOrderUpdated: (updatedOrder: OrderDTO) => void;
}

export function KitchenKdsView({ orders, onOrderUpdated }: KitchenKdsViewProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Re-render every 15s to update elapsed time badges accurately
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const handleAdvanceStatus = async (order: OrderDTO) => {
    let nextStatus: 'IN_PREPARATION' | 'READY' | null = null;
    if (order.status === 'RECEIVED') nextStatus = 'IN_PREPARATION';
    else if (order.status === 'IN_PREPARATION') nextStatus = 'READY';

    if (!nextStatus) return;

    setUpdatingId(order.id);
    try {
      const updated = await updateOrderStatus(order.id, nextStatus);
      if (nextStatus === 'READY') {
        playOrderReadyAlert();
      }
      onOrderUpdated(updated);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado del pedido');
    } finally {
      setUpdatingId(null);
    }
  };

  const getElapsedMinutes = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime();
    return Math.max(0, Math.floor((now - createdTime) / 60000));
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[50vh]">
        <div className="w-16 h-16 rounded-3xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-500 mb-4">
          <ChefHat className="w-8 h-8 text-amber-500/80" />
        </div>
        <h3 className="text-lg font-bold text-white">Cocina al día</h3>
        <p className="text-sm text-stone-400 mt-1 max-w-xs">
          No hay pedidos pendientes en preparación. Los nuevos pedidos sonarán automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Comanda de Cocina (KDS)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              FIFO: {orders.length} activos
            </span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Orden de llegada estricto · Toca para avanzar a preparación o marcar listo
          </p>
        </div>
      </div>

      {/* Responsive Grid: 1 col on mobile, 2 on tablet, 3-4 on large screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.map((order, index) => {
          const elapsed = getElapsedMinutes(order.createdAt);
          const isUrgent = elapsed >= 20;
          const isWarn = elapsed >= 12 && !isUrgent;

          const isReceived = order.status === 'RECEIVED';
          const isInPrep = order.status === 'IN_PREPARATION';
          const isReady = order.status === 'READY';

          return (
            <div
              key={order.id}
              className={`rounded-2xl border flex flex-col justify-between transition-all ${
                isUrgent
                  ? 'bg-red-950/30 border-red-800/80 shadow-lg shadow-red-950/50'
                  : isWarn
                  ? 'bg-amber-950/20 border-amber-700/60'
                  : 'bg-stone-800/90 border-stone-700'
              }`}
            >
              {/* Header: Table, Order Number, Timer */}
              <div className="p-4 border-b border-stone-700/60">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-white tracking-tight">
                      Mesa {order.table?.number || '?'}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-900 text-stone-300 border border-stone-700">
                      #{order.orderNumber}
                    </span>
                  </div>

                  {/* Elapsed Timer badge */}
                  <div
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                      isUrgent
                        ? 'bg-red-500 text-white animate-pulse'
                        : isWarn
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-700 text-stone-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsed}m</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-stone-400">
                  <span>Mesero: {order.waiter?.fullName || 'Sin asignar'}</span>
                  <span className="text-[11px] font-mono text-stone-400">
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {order.customerNotes && (
                  <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-1.5 text-xs text-amber-200">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span className="font-medium">
                      <strong>Nota mesa:</strong> {order.customerNotes}
                    </span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[360px]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-stone-900/80 rounded-xl border border-stone-700/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 font-black text-xs flex items-center justify-center shrink-0">
                          {item.quantity}x
                        </span>
                        <div>
                          <div className="text-white text-sm font-bold leading-tight">
                            {item.menuItem?.name || 'Ítem'}
                          </div>

                          {/* Selected Options */}
                          {item.options && item.options.length > 0 && (
                            <div className="text-xs text-amber-400/90 mt-0.5 flex flex-wrap gap-1">
                              {item.options.map((opt) => (
                                <span
                                  key={opt.id}
                                  className="px-1.5 py-0.5 bg-stone-800 rounded text-[11px]"
                                >
                                  {opt.optionGroupName}: {opt.optionName}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Modifiers / Extras */}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="text-xs text-emerald-400/90 mt-0.5 flex flex-wrap gap-1">
                              {item.modifiers.map((mod) => (
                                <span
                                  key={mod.id}
                                  className="px-1.5 py-0.5 bg-stone-800 rounded text-[11px]"
                                >
                                  + {mod.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Kitchen item comment (e.g. sin cebolla) */}
                          {item.comment && (
                            <div className="text-xs font-semibold text-rose-300 mt-1 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/50">
                              ⚠️ {item.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Actions: One-touch status advance */}
              <div className="p-4 border-t border-stone-700/60 bg-stone-900/40 rounded-b-2xl">
                {isReceived && (
                  <button
                    onClick={() => handleAdvanceStatus(order)}
                    disabled={updatingId === order.id}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-black py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all touch-target shadow-lg shadow-amber-500/10"
                  >
                    <Flame className="w-4 h-4 fill-stone-950" />
                    <span>Empezar Preparación</span>
                  </button>
                )}

                {isInPrep && (
                  <button
                    onClick={() => handleAdvanceStatus(order)}
                    disabled={updatingId === order.id}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all touch-target shadow-lg shadow-emerald-500/10"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Marcar Plato Listo!</span>
                  </button>
                )}

                {isReady && (
                  <div className="w-full bg-emerald-950/60 border border-emerald-700 text-emerald-300 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 text-center">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Listo en mesón · Esperando mesero</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
