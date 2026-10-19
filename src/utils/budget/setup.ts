// Mise en route du budget, en 4 questions, une seule fois : rentrées et jour
// de paie ; charges fixes proposées une par une avec leur jour ; ce qui est
// mis de côté en premier (10 % des rentrées proposés) ; solde actuel. Puis le
// mode. Les valeurs de départ viennent du budget en place (modification), sinon
// de l'ancien Cash-flow (reprise), sinon de rien. Fonctions pures, testables
// avec Node.

import type { Budget, BudgetMode, LegacyItem } from './model';
import { mainIncome } from './calc';

// label : la question ; short : le nom de la charge dans le budget
export type ChargeSlot = { key: string; label: string; short: string; category: string; also: string[] };

// Charges proposées, dans l'ordre, avec la catégorie du site où elles vont
export const CHARGE_SLOTS: readonly ChargeSlot[] = [
  { key: 'logement', label: 'Loyer ou crédit', short: 'Loyer', category: 'Loyer', also: ['Prêt / crédit'] },
  { key: 'energie', label: 'Énergie', short: 'Énergie', category: 'Charges (élec, eau, gaz)', also: [] },
  { key: 'telecom', label: 'Téléphone et internet', short: 'Téléphone et internet', category: 'Internet / téléphone', also: [] },
  { key: 'assurances', label: 'Assurances', short: 'Assurances', category: 'Assurances', also: [] },
  { key: 'transport', label: 'Transport', short: 'Transport', category: 'Transport', also: ['Essence'] },
  { key: 'abonnements', label: 'Abonnements', short: 'Abonnements', category: 'Abonnements', also: [] },
  { key: 'autre', label: 'Autre charge fixe', short: 'Autre', category: 'Autres', also: [] },
];

export type ChargeDraft = { key: string; label: string; category: string; amount: number | null; day: number | null };

export type SetupDraft = {
  income: number | null;
  payDay: number | null;
  charges: ChargeDraft[];
  saving: number | null;
  // L'épargne a été touchée : on ne la recalcule plus sur 10 % des rentrées
  savingTouched: boolean;
  balance: number | null;
  mode: BudgetMode;
};

export const SAVING_RATE = 0.1;

// 10 % des rentrées, arrondis à 10 €
export function suggestedSaving(income: number | null): number | null {
  if (income === null || income <= 0) return null;
  return Math.round((income * SAVING_RATE) / 10) * 10;
}

function slotFor(category: string | null): ChargeSlot {
  return CHARGE_SLOTS.find((s) => s.category === category || s.also.includes(category ?? '')) ?? CHARGE_SLOTS[CHARGE_SLOTS.length - 1];
}

function emptyCharges(): ChargeDraft[] {
  return CHARGE_SLOTS.map((s) => ({ key: s.key, label: s.label, category: s.category, amount: null, day: null }));
}

// Charges ajoutées aux cases proposées (deux « Autres » s'additionnent ; le
// jour de la plus grosse est gardé)
function fill(charges: ChargeDraft[], items: { category: string | null; label: string; amount: number; day: number | null }[]): ChargeDraft[] {
  const out = charges.map((c) => ({ ...c }));
  const biggest: Record<string, number> = {};
  for (const it of items) {
    const slot = slotFor(it.category);
    const c = out.find((x) => x.key === slot.key)!;
    c.amount = (c.amount ?? 0) + it.amount;
    if (it.day !== null && it.amount >= (biggest[slot.key] ?? -1)) {
      c.day = it.day;
      biggest[slot.key] = it.amount;
    }
    // Une catégorie précise (« Prêt / crédit ») est gardée
    if (it.category && slot.also.includes(it.category)) c.category = it.category;
  }
  return out;
}

export function draftFrom(budget: Budget | null): SetupDraft {
  const base: SetupDraft = { income: null, payDay: null, charges: emptyCharges(), saving: null, savingTouched: false, balance: null, mode: 'essentiel' };
  if (!budget) return base;
  // Budget déjà en route : on modifie ce qui existe
  if (budget.settings.setupDone && budget.recurring.length > 0) {
    const pay = mainIncome(budget.recurring);
    const charges = budget.recurring.filter((r) => r.type === 'depense');
    const saving = budget.recurring.filter((r) => r.type === 'epargne').reduce((s, r) => s + r.amount, 0);
    return {
      income: budget.recurring.filter((r) => r.type === 'revenu').reduce((s, r) => s + r.amount, 0) || null,
      payDay: pay?.day ?? null,
      charges: fill(emptyCharges(), charges),
      saving: saving || null,
      savingTouched: true,
      balance: budget.balances.length ? budget.balances[budget.balances.length - 1].amount : null,
      mode: budget.settings.mode,
    };
  }
  return fromLegacy(budget.legacy, budget.settings.mode);
}

// Reprise de l'ancien Cash-flow : rentrées additionnées, charges rangées
// dans les cases, épargne additionnée. Les jours sont à choisir.
export function fromLegacy(legacy: readonly LegacyItem[], mode: BudgetMode = 'essentiel'): SetupDraft {
  const income = legacy.filter((l) => l.type === 'revenu').reduce((s, l) => s + l.amount, 0);
  const saving = legacy.filter((l) => l.type === 'epargne').reduce((s, l) => s + l.amount, 0);
  return {
    income: income || null,
    payDay: null,
    charges: fill(
      emptyCharges(),
      legacy.filter((l) => l.type === 'depense').map((l) => ({ ...l, day: null }))
    ),
    saving: saving || null,
    savingTouched: saving > 0,
    balance: null,
    mode,
  };
}

export function chargesTotal(charges: readonly ChargeDraft[]): number {
  return charges.reduce((s, c) => s + (c.amount ?? 0), 0);
}

// Une charge saisie a un montant et un jour
export const chargeReady = (c: ChargeDraft) => c.amount !== null && c.amount > 0 && c.day !== null;

// Chaque étape est-elle complète ? keepBalance : modification d'un budget en
// route, le dernier relevé est gardé (le solde ne se change que par « Mettre à
// jour mon solde »)
export function stepReady(draft: SetupDraft, step: 0 | 1 | 2 | 3, keepBalance = false): boolean {
  if (step === 0) return draft.income !== null && draft.income > 0 && draft.payDay !== null;
  // Une charge commencée doit avoir son jour ; aucune charge, c'est possible
  if (step === 1) return draft.charges.every((c) => c.amount === null || c.amount === 0 || c.day !== null);
  if (step === 2) return draft.saving !== null && draft.saving >= 0;
  return keepBalance || draft.balance !== null;
}

// Nom d'une charge dans le budget : « Loyer », ou « Crédit » pour un prêt
export function chargeName(c: ChargeDraft): string {
  if (c.category === 'Prêt / crédit') return 'Crédit';
  return CHARGE_SLOTS.find((s) => s.key === c.key)?.short ?? c.label;
}

// Corps de POST /budget/setup ; sans solde quand le dernier relevé est gardé
export function setupPayload(draft: SetupDraft, keepBalance = false) {
  return {
    income: { amount: draft.income ?? 0, day: draft.payDay ?? 1, label: 'Paie' },
    charges: draft.charges.filter(chargeReady).map((c) => ({ category: c.category, label: chargeName(c), amount: c.amount, day: c.day })),
    saving: draft.saving && draft.saving > 0 ? { amount: draft.saving, day: draft.payDay ?? 1 } : null,
    ...(keepBalance ? {} : { balance: draft.balance ?? 0 }),
    mode: draft.mode,
  };
}
