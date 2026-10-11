'use client';

import React, { useState } from 'react';
import { StaffUserDTO, staffLogin } from '@/lib/api';
import { ChefHat, Lock, Mail, Loader2, Sparkles } from 'lucide-react';

interface StaffLoginViewProps {
  onLoginSuccess: (user: StaffUserDTO) => void;
}

export function StaffLoginView({ onLoginSuccess }: StaffLoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await staffLogin(email.trim(), password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('RestoPass123!');
  };

  return (
    <div className="min-h-screen bg-stone-900 flex flex-col justify-center px-4 py-8 safe-bottom">
      <div className="max-w-md w-full mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-stone-900 shadow-xl shadow-amber-500/20 mb-4">
            <ChefHat className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Portal del Personal</h1>
          <p className="text-sm text-stone-400 mt-1">
            KDS Cocina · Meseros · Caja · Administración
          </p>
        </div>

        <div className="bg-stone-800 border border-stone-700/80 rounded-3xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-2xl text-red-200 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ej. cocina@restaurantedemo.co"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 touch-target disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ingresar al Turno'}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-5 border-t border-stone-700/60">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-3 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Accesos rápidos de demostración:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemo('cocina@restaurantedemo.co')}
                className="py-2 px-2.5 bg-stone-900 hover:bg-stone-700 text-stone-200 rounded-lg text-left border border-stone-700 transition-colors"
              >
                🍳 <strong>Cocina (KDS)</strong>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('mesero1@restaurantedemo.co')}
                className="py-2 px-2.5 bg-stone-900 hover:bg-stone-700 text-stone-200 rounded-lg text-left border border-stone-700 transition-colors"
              >
                🛎️ <strong>Mesero (Carlos)</strong>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('caja@restaurantedemo.co')}
                className="py-2 px-2.5 bg-stone-900 hover:bg-stone-700 text-stone-200 rounded-lg text-left border border-stone-700 transition-colors"
              >
                💵 <strong>Cajero</strong>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@restaurantedemo.co')}
                className="py-2 px-2.5 bg-stone-900 hover:bg-stone-700 text-stone-200 rounded-lg text-left border border-stone-700 transition-colors"
              >
                👑 <strong>Admin</strong>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
