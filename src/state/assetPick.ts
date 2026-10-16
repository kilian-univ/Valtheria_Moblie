import { useSyncExternalStore } from 'react';

import type { AssetType } from '@/src/utils/patrimoine/model';

// Actif choisi dans la recherche, repris par « Noter une opération » quand la
// recherche a été ouverte par « Changer » (la recherche se referme alors).

export type PickedAsset = {
  ticker: string;
  name: string;
  type: AssetType;
  logoUrl: string | null;
  // Cours actuel en euros (prérempli dans le prix unitaire), si connu
  priceEur: number | null;
};

let picked: { asset: PickedAsset; at: number } | null = null;
const listeners = new Set<() => void>();

export function pickAsset(asset: PickedAsset) {
  picked = { asset, at: Date.now() };
  listeners.forEach((l) => l());
}

export function usePickedAsset(): { asset: PickedAsset; at: number } | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => picked
  );
}
