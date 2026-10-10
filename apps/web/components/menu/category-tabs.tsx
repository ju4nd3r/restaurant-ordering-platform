'use client';

import React, { useRef, useEffect } from 'react';
import { CategoryWithItems } from '../../lib/api';

interface CategoryTabsProps {
  categories: CategoryWithItems[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategoryId,
  onSelectCategory,
}: CategoryTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll the active tab into view horizontally when activeCategoryId changes
  useEffect(() => {
    if (activeTabRef.current && containerRef.current) {
      const container = containerRef.current;
      const tab = activeTabRef.current;
      const scrollLeft =
        tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [activeCategoryId]);

  return (
    <nav
      aria-label="Categorías del Menú"
      className="sticky top-[89px] z-20 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-2.5 shadow-sm"
    >
      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onSelectCategory(cat.id)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200 touch-target ${
                isActive
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 active:scale-95'
              }`}
            >
              {cat.name}
              <span
                className={`ml-1.5 text-[11px] font-semibold px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-stone-700 text-stone-200' : 'bg-stone-200 text-stone-500'
                }`}
              >
                {cat.items.length}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
