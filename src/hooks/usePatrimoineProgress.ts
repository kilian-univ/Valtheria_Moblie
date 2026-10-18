import { useEffect, useMemo, useState } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { updatePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import type { UserKey } from '@/src/state/userMemory';
import { parseOperations } from '@/src/utils/patrimoine/model';
import type { PatrimoinePrefs } from '@/src/utils/patrimoine/prefs';
import { bestStreak, currentStreak, depositMonths } from '@/src/utils/patrimoine/regularity';

// Pages d'achats relues au plus (100 par page)
const MAX_PAGES = 5;

// Régularité : mois avec un achat (relus chez le serveur), un dépôt sur un
// livret (gardés sur le téléphone) ou de l'épargne mise de côté dans le
// budget (`budgetMonths`). Les mois sont retenus dans les préférences, pour
// le profil.
export function usePatrimoineProgress(user: UserKey, prefs: PatrimoinePrefs | null, refreshKey: number | null, budgetMonths: readonly string[] = []) {
  const { get } = useApi();
  const [buys, setBuys] = useState<{ key: number | null; dates: string[] } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const dates: string[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const raw = await get(`/portfolio/operations?side=buy&per_page=100&page=${page}`);
        const ops = parseOperations(raw);
        dates.push(...ops.filter((o) => o.side === 'buy').map((o) => o.executedAt));
        const last = (raw as { pagination?: { last_page?: number } })?.pagination?.last_page ?? 1;
        if (page >= last || ops.length === 0) break;
      }
      return dates;
    })()
      .catch(() => null)
      .then((dates) => {
        if (active && dates) setBuys({ key: refreshKey, dates });
      });
    return () => {
      active = false;
    };
  }, [get, refreshKey]);

  const deposits = prefs?.livretDeposits;
  const months = useMemo(() => {
    if (!buys) return null;
    return [...new Set([...depositMonths([...buys.dates.map((at) => ({ at, side: 'buy' as const })), ...(deposits ?? []).map((d) => ({ at: d.at }))]), ...budgetMonths])].sort();
  }, [buys, deposits, budgetMonths]);

  // Mois retenus pour le profil (sans écraser une mémoire plus riche par un échec)
  const stored = prefs?.months;
  useEffect(() => {
    if (!months || !stored) return;
    const merged = [...new Set([...stored, ...months])].sort();
    if (merged.length !== stored.length) updatePatrimoinePrefs(user, (p) => ({ ...p, months: merged }));
  }, [months, stored, user]);

  const all = months ? [...new Set([...(stored ?? []), ...months])] : (stored ?? []);
  const [now] = useState(() => new Date());
  return { ready: months !== null, streak: currentStreak(all, now), best: bestStreak(all) };
}
