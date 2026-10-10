'use client';

import React from 'react';
import Image from 'next/image';
import { Clock, Plus, AlertCircle } from 'lucide-react';
import { MenuItem, getFullImageUrl } from '../../lib/api';
import { formatCOP, DIETARY_LABELS } from '../../lib/format';

interface DishCardProps {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
  isLcpCandidate?: boolean;
}

export function DishCard({ item, onSelect, isLcpCandidate = false }: DishCardProps) {
  const primaryImage = item.images[0];
  const imageUrl = primaryImage ? getFullImageUrl(primaryImage.thumbnailUrl || primaryImage.url) : null;

  return (
    <article
      onClick={() => onSelect(item)}
      className="bg-white rounded-2xl border border-stone-200/90 p-3.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex gap-3.5 items-center justify-between touch-target"
    >
      {/* Dish Information */}
      <div className="flex-1 min-w-0 pr-1">
        {/* Dietary badges */}
        {item.dietaryFlags.length > 0 && (
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {item.dietaryFlags.map((flag) => {
              const meta = DIETARY_LABELS[flag];
              if (!meta) return null;
              return (
                <span
                  key={flag}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.color}`}
                >
                  {meta.icon} {meta.label}
                </span>
              );
            })}
          </div>
        )}

        <h3 className="text-sm font-bold text-stone-900 tracking-tight leading-snug truncate">
          {item.name}
        </h3>

        <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
          {item.description}
        </p>

        {/* Price & Prep time */}
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-sm font-extrabold text-stone-900">
            {formatCOP(item.basePriceCop)}
          </span>

          <div className="flex items-center gap-2">
            {item.prepTimeMinutes > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 text-stone-400" />
                {item.prepTimeMinutes} min
              </span>
            )}
            {item.allergens.length > 0 && (
              <span
                className="flex items-center text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200"
                title={`Alérgenos: ${item.allergens.join(', ')}`}
              >
                <AlertCircle className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dish Photo & Quick Add Button */}
      <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/60 shadow-inner">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover"
            priority={isLcpCandidate}
            fetchPriority={isLcpCandidate ? 'high' : undefined}
            placeholder={primaryImage?.blurPlaceholder ? 'blur' : 'empty'}
            blurDataURL={primaryImage?.blurPlaceholder}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 text-xs font-medium">
            <span>🍽️</span>
          </div>
        )}

        {/* Floating Quick Plus Icon */}
        <div className="absolute bottom-1 right-1 bg-white/95 backdrop-blur-sm rounded-full p-1.5 shadow-md border border-stone-200/80 text-stone-900 flex items-center justify-center">
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
      </div>
    </article>
  );
}
