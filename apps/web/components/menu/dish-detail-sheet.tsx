'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Drawer } from 'vaul';
import { Minus, Plus, X, Clock, Check, AlertTriangle } from 'lucide-react';
import { MenuItem, getFullImageUrl } from '../../lib/api';
import { formatCOP, ALLERGEN_LABELS, DIETARY_LABELS } from '../../lib/format';
import { useCartStore, SelectedOption, SelectedModifier } from '../../lib/store/cart-store';

interface DishDetailSheetProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DishDetailSheet({ item, isOpen, onClose }: DishDetailSheetProps) {
  const addItem = useCartStore((state) => state.addItem);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Quantity state
  const [quantity, setQuantity] = useState(1);

  // Selected options state: Record<optionGroupId, optionId>
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    if (!item) return {};
    const initial: Record<string, string> = {};
    item.optionGroups.forEach((group) => {
      const defaultOpt = group.options.find((o) => o.isDefault) || group.options[0];
      if (defaultOpt) {
        initial[group.id] = defaultOpt.id;
      }
    });
    return initial;
  });

  // Selected modifiers state: Set of modifierIds
  const [selectedModifiers, setSelectedModifiers] = useState<Set<string>>(new Set());

  // Customer comment
  const [comment, setComment] = useState('');

  // Reset selections when a new item is opened
  React.useEffect(() => {
    if (item) {
      setActiveImageIndex(0);
      setQuantity(1);
      setComment('');
      setSelectedModifiers(new Set());
      const initialOptions: Record<string, string> = {};
      item.optionGroups.forEach((group) => {
        const defaultOpt = group.options.find((o) => o.isDefault) || group.options[0];
        if (defaultOpt) {
          initialOptions[group.id] = defaultOpt.id;
        }
      });
      setSelectedOptions(initialOptions);
    }
  }, [item]);

  // Reactive price calculations
  const unitPriceCop = useMemo(() => {
    if (!item) return 0;
    let total = item.basePriceCop;

    // Add selected options prices
    item.optionGroups.forEach((group) => {
      const selectedId = selectedOptions[group.id];
      const opt = group.options.find((o) => o.id === selectedId);
      if (opt) {
        total += opt.additionalPriceCop;
      }
    });

    // Add selected modifiers prices
    item.modifiers.forEach((mod) => {
      if (selectedModifiers.has(mod.id)) {
        total += mod.priceCop;
      }
    });

    return total;
  }, [item, selectedOptions, selectedModifiers]);

  const totalPriceCop = unitPriceCop * quantity;

  if (!item) return null;

  const handleToggleModifier = (modId: string) => {
    setSelectedModifiers((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) {
        next.delete(modId);
      } else {
        next.add(modId);
      }
      return next;
    });
  };

  const handleAddToCart = () => {
    const formattedOptions: SelectedOption[] = [];
    item.optionGroups.forEach((group) => {
      const selectedId = selectedOptions[group.id];
      const opt = group.options.find((o) => o.id === selectedId);
      if (opt) {
        formattedOptions.push({
          optionGroupId: group.id,
          optionGroupName: group.name,
          optionId: opt.id,
          optionName: opt.name,
          additionalPriceCop: opt.additionalPriceCop,
        });
      }
    });

    const formattedModifiers: SelectedModifier[] = [];
    item.modifiers.forEach((mod) => {
      if (selectedModifiers.has(mod.id)) {
        formattedModifiers.push({
          modifierId: mod.id,
          name: mod.name,
          priceCop: mod.priceCop,
        });
      }
    });

    addItem({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.images[0]?.url,
      basePriceCop: item.basePriceCop,
      quantity,
      selectedOptions: formattedOptions,
      selectedModifiers: formattedModifiers,
      comment: comment.trim() || undefined,
    });

    // Haptic feedback
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }

    onClose();
  };

  const images = item.images.length > 0 ? item.images : [];

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[28px] max-h-[92vh] fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto outline-none shadow-2xl">
          {/* Grab Handle */}
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-stone-300 my-3" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full p-2 touch-target z-10 transition-colors"
            aria-label="Cerrar detalle"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-5 pb-28 pt-1 flex-1">
            {/* Image Gallery */}
            {images.length > 0 && (
              <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-stone-100 mb-4 shadow-sm">
                <Image
                  src={getFullImageUrl(images[activeImageIndex]?.url)}
                  alt={item.name}
                  fill
                  sizes="(max-width: 512px) 100vw, 512px"
                  className="object-cover transition-opacity duration-300"
                  placeholder={images[activeImageIndex]?.blurPlaceholder ? 'blur' : 'empty'}
                  blurDataURL={images[activeImageIndex]?.blurPlaceholder}
                />

                {/* Gallery swipe indicators */}
                {images.length > 1 && (
                  <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-1.5 z-10">
                    {images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === activeImageIndex
                            ? 'w-6 bg-white shadow-sm'
                            : 'w-2 bg-white/60 hover:bg-white'
                        }`}
                        aria-label={`Ver foto ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dietary Flags */}
            {item.dietaryFlags.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                {item.dietaryFlags.map((flag) => {
                  const meta = DIETARY_LABELS[flag];
                  if (!meta) return null;
                  return (
                    <span
                      key={flag}
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${meta.color}`}
                    >
                      {meta.icon} {meta.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Title & Prep Time */}
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-black text-stone-900 tracking-tight leading-tight">
                {item.name}
              </h2>
              {item.prepTimeMinutes > 0 && (
                <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  {item.prepTimeMinutes} min
                </span>
              )}
            </div>

            <p className="text-sm font-extrabold text-amber-600 mt-1">
              {formatCOP(item.basePriceCop)}
            </p>

            <p className="text-xs text-stone-600 leading-relaxed mt-2.5">
              {item.description}
            </p>

            {/* Ingredients */}
            {item.ingredients.length > 0 && (
              <div className="mt-3.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Ingredientes principales
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {item.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="text-xs font-medium bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Allergens Notice */}
            {item.allergens.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-amber-800">
                    Aviso de alérgenos:
                  </span>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
                    Contiene{' '}
                    {item.allergens
                      .map((a) => ALLERGEN_LABELS[a]?.label || a)
                      .join(', ')}
                    . Notifique al personal si presenta alergias severas.
                  </p>
                </div>
              </div>
            )}

            {/* Option Groups (e.g. Término de la carne) */}
            {item.optionGroups.map((group) => (
              <div key={group.id} className="mt-5 pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    {group.name}
                  </span>
                  <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
                    Obligatorio
                  </span>
                </div>

                <div className="space-y-2">
                  {group.options.map((opt) => {
                    const isSelected = selectedOptions[group.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setSelectedOptions((prev) => ({ ...prev, [group.id]: opt.id }))
                        }
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all touch-target ${
                          isSelected
                            ? 'border-stone-900 bg-stone-900 text-white font-semibold shadow-sm'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-white bg-white text-stone-900' : 'border-stone-400'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs">{opt.name}</span>
                        </div>
                        {opt.additionalPriceCop > 0 && (
                          <span
                            className={`text-xs ${
                              isSelected ? 'text-amber-300' : 'text-stone-500'
                            }`}
                          >
                            +{formatCOP(opt.additionalPriceCop)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Modifiers (Extras con precio) */}
            {item.modifiers.length > 0 && (
              <div className="mt-5 pt-4 border-t border-stone-100">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-2.5 block">
                  Adicionales / Extras
                </span>

                <div className="space-y-2">
                  {item.modifiers.map((mod) => {
                    const isChecked = selectedModifiers.has(mod.id);
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => handleToggleModifier(mod.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all touch-target ${
                          isChecked
                            ? 'border-amber-500 bg-amber-50/70 text-stone-900 font-semibold'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'border-stone-400 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs">{mod.name}</span>
                        </div>
                        <span className="text-xs font-bold text-amber-700">
                          +{formatCOP(mod.priceCop)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer Special Requests / Comments */}
            <div className="mt-5 pt-4 border-t border-stone-100">
              <label
                htmlFor="dish-comments"
                className="text-xs font-bold uppercase tracking-wider text-stone-800 mb-1.5 block"
              >
                Comentarios o instrucciones especiales
              </label>
              <textarea
                id="dish-comments"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 200))}
                placeholder="Ej. Sin cebolla, término bien asado, salsa aparte..."
                rows={2}
                maxLength={200}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
              <span className="text-[10px] text-stone-400 block text-right mt-0.5">
                {comment.length}/200 caracteres
              </span>
            </div>
          </div>

          {/* Sticky Bottom Action Footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 shadow-lg flex items-center gap-3">
            {/* Quantity Selector */}
            <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200 shrink-0">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-9 h-9 rounded-lg bg-white disabled:opacity-40 shadow-sm flex items-center justify-center text-stone-800 touch-target active:scale-95"
                aria-label="Disminuir cantidad"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-extrabold text-stone-900">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-stone-800 touch-target active:scale-95"
                aria-label="Aumentar cantidad"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add to Order Button */}
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-between shadow-md transition-all touch-target"
            >
              <span>Agregar al pedido</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-md font-extrabold text-xs">
                {formatCOP(totalPriceCop)}
              </span>
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
