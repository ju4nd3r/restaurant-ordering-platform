'use client';

import React, { useState } from 'react';
import { OrderDTO, updateOrderStatus, WaiterSummaryDTO } from '@/lib/api';
import { formatMoneyCop } from '@/lib/format';
import {
  CheckCircle2,
  Table,
  Coins,
  BellRing,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface WaiterViewProps {
  readyOrders: OrderDTO[];
  summary: WaiterSummaryDTO | null;
  onOrderDelivered: (order: OrderDTO) => void;
  onRefresh: () => void;
}

export function WaiterView({
  readyOrders,
  summary,
  onOrderDelivered,
  onRefresh,
}: WaiterViewProps) {
  const [deliveringId, setDeliveringId] = useState<string | null>(null);

  const handleMarkDelivered = async (orderId: string) => {
    setDeliveringId(orderId);
    try {
      const updated = await updateOrderStatus(orderId, 'DELIVERED');
      onOrderDelivered(updated);
    } catch (err: any) {
      alert(err.message || 'Error al marcar como entregado');
    } finally {
      setDeliveringId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Waiter KPI Header: Assigned tables & Tips */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-4 bg-stone-800 border border-stone-700 rounded-2xl">
          <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
            <Table className="w-4 h-4 text-amber-500" />
            <span>Mesas Asignadas</span>
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {summary?.assignedTablesCount ?? 0}
          </div>
        </div>

        <div className="p-4 bg-stone-800 border border-stone-700 rounded-2xl">
          <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>Mis Propinas de Turno</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatMoneyCop(summary?.totalTipsCop ?? 0)}
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 p-4 bg-stone-800 border border-stone-700 rounded-2xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-stone-400 font-medium">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>Ley 1935 de 2019</span>
            </div>
            <div className="text-xs text-stone-300 mt-1">Propina 100% para el personal</div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold">
            Vigente
          </span>
        </div>
      </div>

      {/* Orders Ready for Delivery Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-500 animate-bounce" />
            <h3 className="text-lg font-black text-white tracking-tight">
              Platos Listos para Llevar a la Mesa ({readyOrders.length})
            </h3>
          </div>
        </div>

        {readyOrders.length === 0 ? (
          <div className="p-8 bg-stone-800/50 border border-stone-700/60 rounded-2xl text-center">
            <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-white font-bold text-sm">No hay pedidos esperando entrega</div>
            <p className="text-stone-400 text-xs mt-0.5">
              Cuando la cocina marque un plato listo, te aparecerá aquí de inmediato.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 bg-emerald-950/20 border-2 border-emerald-600/80 rounded-2xl flex flex-col justify-between shadow-lg shadow-emerald-950/40"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-black text-white">
                      Mesa {order.table?.number || '?'}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500 text-stone-950">
                      ¡LISTO!
                    </span>
                  </div>

                  <div className="text-xs text-stone-400 mb-3">
                    Pedido #{order.orderNumber} · Subtotal: {formatMoneyCop(order.subtotalCop)}
                  </div>

                  {/* List of items */}
                  <div className="space-y-1.5 mb-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="text-xs text-stone-200 flex items-center justify-between"
                      >
                        <span className="font-semibold">
                          {item.quantity}x {item.menuItem?.name || 'Ítem'}
                        </span>
                        {item.comment && (
                          <span className="text-[11px] text-amber-300 font-mono">
                            ({item.comment})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleMarkDelivered(order.id)}
                  disabled={deliveringId === order.id}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all touch-target shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Entregar a la Mesa</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waiter's Assigned Tables Section */}
      {summary && summary.assignedTables.length > 0 && (
        <div className="pt-4 border-t border-stone-800">
          <h3 className="text-base font-bold text-white mb-3">
            Mesas asignadas a tu atención ({summary.assignedTables.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {summary.assignedTables.map((tbl: any) => {
              const activeSession = tbl.sessions?.[0];
              const ordersCount = activeSession?.orders?.length || 0;

              return (
                <div
                  key={tbl.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    ordersCount > 0
                      ? 'bg-amber-950/20 border-amber-600/60'
                      : 'bg-stone-800/80 border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Mesa {tbl.number}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ordersCount > 0
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-700 text-stone-300'
                      }`}
                    >
                      {ordersCount > 0 ? `${ordersCount} pedidos` : 'Libre'}
                    </span>
                  </div>
                  <div className="text-xs text-stone-400 mt-1">Zona: {tbl.zone || 'Principal'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
