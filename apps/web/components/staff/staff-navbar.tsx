'use client';

import React from 'react';
import { StaffUserDTO, ShiftInfoDTO } from '@/lib/api';
import { Volume2, VolumeX, Eye, LogOut, Clock, Play, Square } from 'lucide-react';

interface StaffNavbarProps {
  user: StaffUserDTO;
  activeTab: 'kds' | 'waiter' | 'cashier';
  setActiveTab: (tab: 'kds' | 'waiter' | 'cashier') => void;
  audioActive: boolean;
  onToggleAudio: () => void;
  wakeLockActive: boolean;
  onToggleWakeLock: () => void;
  shiftInfo: ShiftInfoDTO | null;
  onStartShift: () => void;
  onEndShift: () => void;
  onLogout: () => void;
}

export function StaffNavbar({
  user,
  activeTab,
  setActiveTab,
  audioActive,
  onToggleAudio,
  wakeLockActive,
  onToggleWakeLock,
  shiftInfo,
  onStartShift,
  onEndShift,
  onLogout,
}: StaffNavbarProps) {
  const isCheckedIn = shiftInfo?.isUserCheckedIn ?? false;

  return (
    <header className="sticky top-0 z-30 bg-stone-900 border-b border-stone-800 px-4 py-3 select-none">
      <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left: User Identity & Role */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-900 flex items-center justify-center font-black text-sm">
            {user.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm tracking-tight">{user.fullName}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-800 text-amber-400 border border-stone-700 uppercase">
                {user.roles.join(' · ')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
              <Clock className="w-3 h-3 text-stone-400" />
              {isCheckedIn ? (
                <span className="text-emerald-400 font-medium">Turno activo</span>
              ) : (
                <span className="text-stone-400">Sin turno registrado</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Mobile Navigation Pill Tabs */}
        <div className="hidden sm:flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
          {(user.roles.includes('KITCHEN') || user.roles.includes('ADMIN')) && (
            <button
              onClick={() => setActiveTab('kds')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'kds'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              🍳 Cocina (KDS)
            </button>
          )}

          {(user.roles.includes('WAITER') || user.roles.includes('ADMIN')) && (
            <button
              onClick={() => setActiveTab('waiter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'waiter'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              🛎️ Mesero
            </button>
          )}

          {(user.roles.includes('CASHIER') || user.roles.includes('ADMIN')) && (
            <button
              onClick={() => setActiveTab('cashier')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'cashier'
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              💵 Caja
            </button>
          )}
        </div>

        {/* Right: Sound, WakeLock & Shift Actions */}
        <div className="flex items-center gap-1.5">
          {/* Sound toggle button */}
          <button
            onClick={onToggleAudio}
            title={audioActive ? 'Alerta sonora activa' : 'Activar sonido de pedidos'}
            className={`p-2.5 rounded-xl border transition-all touch-target flex items-center gap-1.5 text-xs font-semibold ${
              audioActive
                ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                : 'bg-stone-800 border-stone-700 text-amber-400 animate-pulse'
            }`}
          >
            {audioActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{audioActive ? 'Sonido OK' : 'Activar Sonido'}</span>
          </button>

          {/* Screen Wake Lock toggle */}
          <button
            onClick={onToggleWakeLock}
            title={wakeLockActive ? 'Pantalla encendida permanente' : 'Activar mantener pantalla activa'}
            className={`p-2.5 rounded-xl border transition-all touch-target flex items-center gap-1.5 text-xs font-semibold ${
              wakeLockActive
                ? 'bg-sky-950/60 border-sky-600 text-sky-400'
                : 'bg-stone-800 border-stone-700 text-stone-400'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden md:inline">{wakeLockActive ? 'Pantalla ON' : 'Mantener ON'}</span>
          </button>

          {/* Shift CheckIn / CheckOut */}
          {isCheckedIn ? (
            <button
              onClick={onEndShift}
              title="Finalizar turno"
              className="p-2.5 bg-red-950/50 hover:bg-red-900 border border-red-800 text-red-300 rounded-xl transition-all touch-target flex items-center gap-1 text-xs font-semibold"
            >
              <Square className="w-3.5 h-3.5 fill-red-400" />
              <span className="hidden md:inline">Cerrar Turno</span>
            </button>
          ) : (
            <button
              onClick={onStartShift}
              title="Iniciar turno"
              className="p-2.5 bg-emerald-950/50 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl transition-all touch-target flex items-center gap-1 text-xs font-semibold"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-400" />
              <span className="hidden md:inline">Iniciar Turno</span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-2.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 rounded-xl transition-all touch-target"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile bottom pill switcher for phones */}
      <div className="flex sm:hidden items-center justify-around mt-2.5 pt-2 border-t border-stone-800">
        {(user.roles.includes('KITCHEN') || user.roles.includes('ADMIN')) && (
          <button
            onClick={() => setActiveTab('kds')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'kds'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400'
            }`}
          >
            🍳 Cocina
          </button>
        )}

        {(user.roles.includes('WAITER') || user.roles.includes('ADMIN')) && (
          <button
            onClick={() => setActiveTab('waiter')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'waiter'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400'
            }`}
          >
            🛎️ Mesero
          </button>
        )}

        {(user.roles.includes('CASHIER') || user.roles.includes('ADMIN')) && (
          <button
            onClick={() => setActiveTab('cashier')}
            className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cashier'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400'
            }`}
          >
            💵 Caja
          </button>
        )}
      </div>
    </header>
  );
}
