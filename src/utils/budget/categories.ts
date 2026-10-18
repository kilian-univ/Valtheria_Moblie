// Catégories proposées en grosses pastilles pour une dépense (mode Détaillé) :
// les enveloppes d'abord, puis les dépenses courantes les plus fréquentes.
// Sans React : testable avec Node.

import type { BudgetCategory } from './model';

export const COMMON_CATEGORIES = ['Courses', 'Sorties', 'Restaurants', 'Shopping', 'Santé', 'Imprévus', 'Autres'] as const;

const ICONS: Record<string, string> = {
  Courses: 'cart-outline',
  Sorties: 'ticket-outline',
  Restaurants: 'restaurant-outline',
  Shopping: 'bag-outline',
  Santé: 'medkit-outline',
  Imprévus: 'alert-circle-outline',
  Autres: 'ellipsis-horizontal',
  Transport: 'bus-outline',
  Essence: 'car-outline',
  Loyer: 'home-outline',
  Abonnements: 'repeat-outline',
  Assurances: 'shield-checkmark-outline',
  'Internet / téléphone': 'wifi-outline',
  'Charges (élec, eau, gaz)': 'flash-outline',
  'Prêt / crédit': 'card-outline',
};

export function categoryIcon(name: string | null): string {
  return (name && ICONS[name]) ?? 'pricetag-outline';
}

// Nom affiché : « Autre » plutôt que « Autres »
export function categoryLabel(name: string | null): string {
  if (!name || name === 'Autres') return 'Autre';
  return name;
}

// Pastilles : enveloppes, puis les catégories courantes, sans doublon (8 au plus)
export function pillChoices(categories: readonly BudgetCategory[]): string[] {
  const out: string[] = [];
  for (const c of categories) if (c.envelopeCap !== null && !out.includes(c.name)) out.push(c.name);
  for (const c of COMMON_CATEGORIES) if (!out.includes(c)) out.push(c);
  return out.slice(0, 8);
}
