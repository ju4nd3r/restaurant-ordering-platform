'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSessionOrders, OrderDTO } from '../../lib/api';
import { formatCOP } from '../../lib/format';
import { getSocket } from '../../lib/socket';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  Utensils,
  PlusCircle,
  Receipt,
  User,
} from 'lucide-react';

interface OrderTrackerProps {
  tableSessionId: string;
  tableNumber: number;
  restaurantName: string;
  onOrderMore: () => void;
  onGoToBill?: () => void;
}

export function OrderTracker({
  tableSessionId,
  tableNumber,
  restaurantName,
  onOrderMore,
  onGoToBill,
}: OrderTrackerProps) {
  const queryClient = useQueryClient();
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  // 1. Fetch Session Orders
  const { data: orders = [], isLoading, refetch } = useQuery<OrderDTO[]>({
    queryKey: ['sessionOrders', tableSessionId],
    queryFn: () => fetchSessionOrders(tableSessionId),
    enabled: !!tableSessionId,
    refetchInterval: 15000, // Poll fallback every 15s in addition to WebSockets
  });

  // 2. Real-time WebSocket subscriptions
  useEffect(() => {
    if (!tableSessionId) return;

    const socket = getSocket();

    // Join table room
    socket.emit('join:table', tableSessionId);

    // Listen for status changes
    const handleStatusChanged = (payload: { orderId: string; newStatus: string }) => {
      queryClient.invalidateQueries({ queryKey: ['sessionOrders', tableSessionId] });

      const statusMessages: Record<string, string> = {
        IN_PREPARATION: '¡Tu pedido comenzó a prepararse en la cocina!',
        READY: '🔔 ¡Tu pedido está listo y va en camino a tu mesa!',
        DELIVERED: '✅ ¡Tu pedido ha sido entregado en tu mesa. Buen provecho!',
      };

      if (statusMessages[payload.newStatus]) {
        setNotificationMessage(statusMessages[payload.newStatus]);
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
        setTimeout(() => setNotificationMessage(null), 5000);
      }
    };

    const handleOrderCreated = () => {
      queryClient.invalidateQueries({ queryKey: ['sessionOrders', tableSessionId] });
    };

    socket.on('order:status-changed', handleStatusChanged);
    socket.on('order:created', handleOrderCreated);

    return () => {
      socket.emit('leave:table', tableSessionId);
      socket.off('order:status-changed', handleStatusChanged);
      socket.off('order:created', handleOrderCreated);
    };
  }, [tableSessionId, queryClient]);

  const steps = [
    { key: 'RECEIVED', label: 'Recibido', icon: Clock },
    { key: 'IN_PREPARATION', label: 'En Preparación', icon: ChefHat },
    { key: 'READY', label: '¡Listo!', icon: BellRing },
    { key: 'DELIVERED', label: 'Entregado', icon: CheckCircle2 },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 0;
      case 'IN_PREPARATION':
        return 1;
      case 'READY':
        return 2;
      case 'DELIVERED':
        return 3;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 font-medium">Consultando estado de tu mesa...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-5 pb-32">
      {/* Real-time Alert Toast */}
      {notificationMessage && (
        <div className="sticky top-20 z-40 bg-stone-900 text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-stone-800 animate-in fade-in slide-in-from-top-4">
          <span className="text-lg">📢</span>
          <p className="text-xs font-bold leading-snug flex-1">{notificationMessage}</p>
        </div>
      )}

      {/* Header Summary */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
            Sesión de Mesa Activa
          </span>
          <h2 className="text-lg font-black text-stone-900 tracking-tight">
            Mesa {tableNumber} · {restaurantName}
          </h2>
          <span className="text-xs text-stone-500 mt-0.5 block">
            {orders.length} {orders.length === 1 ? 'pedido realizado' : 'pedidos realizados'}
          </span>
        </div>

        <button
          onClick={onOrderMore}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm touch-target"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Pedir más</span>
        </button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-2xl border border-stone-200/80 my-4 shadow-sm">
          <span className="text-4xl block mb-2">📋</span>
          <h3 className="text-sm font-bold text-stone-800">Aún no hay pedidos en esta mesa</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
            Explora el menú y arma tu primer pedido para enviarlo directamente a la cocina.
          </p>
          <button
            onClick={onOrderMore}
            className="mt-4 bg-stone-900 text-white font-semibold text-xs px-4 py-2.5 rounded-xl touch-target"
          >
            Ver Menú
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const currentStepIdx = getStepIndex(order.status);
            const isDelivered = order.status === 'DELIVERED';

            return (
              <article
                key={order.id}
                className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-4"
              >
                {/* Order Top Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="bg-stone-900 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                      #{order.orderNumber}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      {new Date(order.createdAt).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      isDelivered
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                    }`}
                  >
                    {order.status === 'RECEIVED'
                      ? 'Recibido'
                      : order.status === 'IN_PREPARATION'
                        ? 'En Cocina'
                        : order.status === 'READY'
                          ? '¡Listo para servir!'
                          : order.status === 'DELIVERED'
                            ? 'Entregado'
                            : order.status}
                  </span>
                </div>

                {/* Progress Stepper */}
                <div className="py-2">
                  <div className="flex items-center justify-between relative">
                    {/* Connecting line */}
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-stone-200 -z-0">
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{
                          width: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
                        }}
                      />
                    </div>

                    {steps.map((st, idx) => {
                      const isComplete = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      const Icon = st.icon;

                      return (
                        <div
                          key={st.key}
                          className="flex flex-col items-center relative z-10"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              isComplete
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-stone-100 text-stone-400 border border-stone-200'
                            } ${isCurrent && !isDelivered ? 'ring-4 ring-amber-100 animate-bounce' : ''}`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span
                            className={`text-[10px] mt-1.5 font-bold ${
                              isComplete ? 'text-stone-900' : 'text-stone-400'
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-stone-50 rounded-xl p-3 space-y-2 border border-stone-100 text-xs">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="font-extrabold text-stone-900 shrink-0">
                          {it.quantity}x
                        </span>
                        <div>
                          <span className="font-bold text-stone-800">{it.menuItem.name}</span>
                          {it.options.length > 0 && (
                            <div className="text-[10px] text-stone-500">
                              {it.options.map((o) => o.optionName).join(', ')}
                            </div>
                          )}
                          {it.modifiers.length > 0 && (
                            <div className="text-[10px] text-amber-700 font-medium">
                              {it.modifiers.map((m) => `+${m.name}`).join(', ')}
                            </div>
                          )}
                          {it.comment && (
                            <div className="text-[10px] text-stone-400 italic">
                              &ldquo;{it.comment}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="font-bold text-stone-800 shrink-0">
                        {formatCOP(it.totalPriceCop)}
                      </span>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between text-xs font-black text-stone-900">
                    <span>Total del Pedido:</span>
                    <span>{formatCOP(order.totalCop)}</span>
                  </div>
                </div>

                {order.waiter && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-1">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span>Atendido por: {order.waiter.fullName}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
