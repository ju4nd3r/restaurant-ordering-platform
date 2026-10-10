'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { DIETARY_LABELS } from '../../lib/format';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDietaryFlag: string | null;
  onSelectDietaryFlag: (flag: string | null) => void;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  selectedDietaryFlag,
  onSelectDietaryFlag,
}: SearchFilterBarProps) {
  const dietaryOptions = [
    { key: null, label: 'Todos los platos', icon: '🍽️' },
    { key: 'VEGETARIAN', label: DIETARY_LABELS.VEGETARIAN?.label || 'Vegetariano', icon: '🥗' },
    { key: 'VEGAN', label: DIETARY_LABELS.VEGAN?.label || 'Vegano', icon: '🌱' },
    { key: 'GLUTEN_FREE', label: DIETARY_LABELS.GLUTEN_FREE?.label || 'Sin Gluten', icon: '🌾🚫' },
  ];

  return (
    <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
      {/* Search Input */}
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3.5 w-4 h-4 text-stone-400 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar plato, ingrediente..."
          className="w-full bg-white border border-stone-200 pl-10 pr-9 py-2.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 touch-target"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dietary filter chips */}
      <div className="flex items-center gap-2 mt-2.5 overflow-x-auto no-scrollbar py-0.5">
        {dietaryOptions.map((opt) => {
          const isSelected = selectedDietaryFlag === opt.key;
          return (
            <button
              key={opt.key || 'all'}
              onClick={() => onSelectDietaryFlag(opt.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all touch-target ${
                isSelected
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
