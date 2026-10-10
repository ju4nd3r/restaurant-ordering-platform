'use client';

import React from 'react';
import { Utensils, User, MapPin } from 'lucide-react';
import { TableContext } from '../../lib/store/cart-store';

interface MenuHeaderProps {
  tableContext: TableContext;
}

export function MenuHeader({ tableContext }: MenuHeaderProps) {
  return (
    <header className="bg-white border-b border-stone-200 px-4 pt-4 pb-3 shadow-sm sticky top-0 z-30">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700 tracking-wide uppercase">
              Mesa en vivo
            </span>
          </div>
          <h1 className="text-xl font-black text-stone-900 tracking-tight leading-tight mt-0.5">
            {tableContext.restaurantName}
          </h1>
          <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
            <span className="truncate">Bogotá, Colombia</span>
          </div>
        </div>

        {/* Table Badge */}
        <div className="flex flex-col items-end">
          <div className="bg-amber-500 text-white font-extrabold text-sm px-3 py-1.5 rounded-xl shadow-sm shadow-amber-500/20 flex items-center gap-1.5 touch-target">
            <Utensils className="w-3.5 h-3.5" />
            <span>Mesa {tableContext.tableNumber}</span>
          </div>
          {tableContext.tableZone && (
            <span className="text-[11px] font-medium text-stone-500 mt-1">
              {tableContext.tableZone}
            </span>
          )}
        </div>
      </div>

      {tableContext.waiterName && (
        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-stone-400" />
            <span>
              Mesero asignado: <strong className="text-stone-800 font-semibold">{tableContext.waiterName}</strong>
            </span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
            Propina sugerida {tableContext.defaultTipPercentage}%
          </span>
        </div>
      )}
    </header>
  );
}
