'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  StaffUserDTO,
  OrderDTO,
  ShiftInfoDTO,
  WaiterSummaryDTO,
  fetchStaffMe,
  staffLogout,
  fetchActiveKitchenOrders,
  fetchReadyOrders,
  fetchPendingCashOrders,
  fetchCurrentShift,
  startStaffShift,
  endStaffShift,
  fetchWaiterSummary,
} from '@/lib/api';
import { StaffLoginView } from '@/components/staff/staff-login-view';
import { StaffNavbar } from '@/components/staff/staff-navbar';
import { KitchenKdsView } from '@/components/staff/kitchen-kds-view';
import { WaiterView } from '@/components/staff/waiter-view';
import { CashierView } from '@/components/staff/cashier-view';
import { enableAudio, playNewOrderAlert, playOrderReadyAlert, isAudioContextRunning } from '@/lib/audio';
import { requestWakeLock, releaseWakeLock, isWakeLockActive } from '@/lib/wakelock';
import { io, Socket } from 'socket.io-client';
import { Loader2 } from 'lucide-react';

export default function StaffPage() {
  const [user, setUser] = useState<StaffUserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kds' | 'waiter' | 'cashier'>('kds');

  // Operational states
  const [kitchenOrders, setKitchenOrders] = useState<OrderDTO[]>([]);
  const [readyOrders, setReadyOrders] = useState<OrderDTO[]>([]);
  const [pendingCashOrders, setPendingCashOrders] = useState<any[]>([]);
  const [shiftInfo, setShiftInfo] = useState<ShiftInfoDTO | null>(null);
  const [waiterSummary, setWaiterSummary] = useState<WaiterSummaryDTO | null>(null);

  // Audio and WakeLock flags
  const [audioActive, setAudioActive] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // 1. Check logged-in status on mount
  useEffect(() => {
    fetchStaffMe()
      .then((me) => {
        if (me) {
          setUser(me);
          if (me.roles.includes('KITCHEN')) setActiveTab('kds');
          else if (me.roles.includes('WAITER')) setActiveTab('waiter');
          else if (me.roles.includes('CASHIER')) setActiveTab('cashier');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // 2. Fetch staff operational data when user is present
  const refreshData = useCallback(async () => {
    if (!user) return;

    try {
      const [kOrders, rOrders, cOrders, sInfo] = await Promise.all([
        fetchActiveKitchenOrders().catch(() => []),
        fetchReadyOrders().catch(() => []),
        fetchPendingCashOrders().catch(() => []),
        fetchCurrentShift().catch(() => null),
      ]);

      setKitchenOrders(kOrders);
      setReadyOrders(rOrders);
      setPendingCashOrders(cOrders);
      setShiftInfo(sInfo);

      if (user.roles.includes('WAITER') || user.roles.includes('ADMIN')) {
        const wSummary = await fetchWaiterSummary().catch(() => null);
        setWaiterSummary(wSummary);
      }
    } catch (err) {
      console.warn('Error refreshing staff data:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  // 3. Connect real-time WebSocket for Kitchen and Waiter channels
  useEffect(() => {
    if (!user) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const socket: Socket = io(apiUrl, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      // Join kitchen room
      socket.emit('join:kitchen', user.restaurantId);
      // Join waiter room
      socket.emit('join:waiter', user.id);
    });

    // Listen for new orders
    socket.on('order:created', (newOrder: OrderDTO) => {
      playNewOrderAlert();
      setKitchenOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [...prev, newOrder];
      });
    });

    // Listen for order status updates
    socket.on('order:status-changed', (payload: any) => {
      if (payload.newStatus === 'READY') {
        playOrderReadyAlert();
      }
      refreshData();
    });

    // Listen for payment updates (e.g. cash confirmation or Wompi webhook)
    socket.on('order:payment-updated', () => {
      refreshData();
    });

    return () => {
      socket.disconnect();
    };
  }, [user, refreshData]);

  // Audio activation handler
  const handleToggleAudio = async () => {
    const running = await enableAudio();
    setAudioActive(running);
  };

  // Screen WakeLock toggle handler
  const handleToggleWakeLock = async () => {
    if (wakeLockActive) {
      await releaseWakeLock();
      setWakeLockActive(false);
    } else {
      const ok = await requestWakeLock();
      setWakeLockActive(ok);
    }
  };

  // Shift start/end handlers
  const handleStartShift = async () => {
    try {
      const res = await startStaffShift('Inicio de labores');
      setShiftInfo(res);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Error al iniciar turno');
    }
  };

  const handleEndShift = async () => {
    try {
      await endStaffShift('Cierre de turno');
      const sInfo = await fetchCurrentShift();
      setShiftInfo(sInfo);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Error al cerrar turno');
    }
  };

  const handleLogout = async () => {
    await staffLogout();
    await releaseWakeLock();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <StaffLoginView
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          if (loggedInUser.roles.includes('KITCHEN')) setActiveTab('kds');
          else if (loggedInUser.roles.includes('WAITER')) setActiveTab('waiter');
          else if (loggedInUser.roles.includes('CASHIER')) setActiveTab('cashier');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col font-sans select-none safe-bottom">
      <StaffNavbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        audioActive={audioActive}
        onToggleAudio={handleToggleAudio}
        wakeLockActive={wakeLockActive}
        onToggleWakeLock={handleToggleWakeLock}
        shiftInfo={shiftInfo}
        onStartShift={handleStartShift}
        onEndShift={handleEndShift}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'kds' && (
          <KitchenKdsView
            orders={kitchenOrders}
            onOrderUpdated={(updated) => {
              setKitchenOrders((prev) => {
                if (updated.status === 'READY') {
                  // Keep ready in list or transition
                  return prev.map((o) => (o.id === updated.id ? updated : o));
                }
                return prev.map((o) => (o.id === updated.id ? updated : o));
              });
              refreshData();
            }}
          />
        )}

        {activeTab === 'waiter' && (
          <WaiterView
            readyOrders={readyOrders}
            summary={waiterSummary}
            onOrderDelivered={() => refreshData()}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'cashier' && (
          <CashierView
            pendingCashOrders={pendingCashOrders}
            onPaymentConfirmed={refreshData}
          />
        )}
      </main>
    </div>
  );
}
