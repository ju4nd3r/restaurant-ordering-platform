export function formatCOP(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export const ALLERGEN_LABELS: Record<string, { label: string; icon: string }> = {
  GLUTEN: { label: 'Gluten', icon: '🌾' },
  DAIRY: { label: 'Lácteos', icon: '🥛' },
  EGGS: { label: 'Huevo', icon: '🥚' },
  PEANUTS: { label: 'Maní', icon: '🥜' },
  TREE_NUTS: { label: 'Nueces', icon: '🌰' },
  FISH: { label: 'Pescado', icon: '🐟' },
  SHELLFISH: { label: 'Mariscos', icon: '🦐' },
  SOY: { label: 'Soya', icon: '🌱' },
  SESAME: { label: 'Ajonjolí', icon: '🌱' },
};

export const DIETARY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  VEGETARIAN: { label: 'Vegetariano', icon: '🥗', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  VEGAN: { label: 'Vegano', icon: '🌱', color: 'bg-green-50 text-green-700 border-green-200' },
  GLUTEN_FREE: { label: 'Sin Gluten', icon: '🌾🚫', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  KETO: { label: 'Keto', icon: '🥩', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  HALAL: { label: 'Halal', icon: '🌙', color: 'bg-blue-50 text-blue-700 border-blue-200' },
};
