import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { API_BASE_URL } from '@/src/context/ApiContext';
import { parseFigures, withFallback, type Figure, type Figures } from '@/src/utils/regulatoryFigures';

// Chiffres réglementaires du site (GET /regulatory-figures, public, sans
// compte), gardés sur le téléphone : relus au démarrage, redemandés au plus
// une fois toutes les 12 h. Route muette ou hors ligne : les derniers
// chiffres reçus, sinon les valeurs de secours. Rien de personnel : la purge
// d'un compte n'y touche pas.

const STORAGE_KEY = 'valtheria:chiffres-reglementaires';
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;

type Stored = { at: number; figures: Record<string, Figure> };

let figures: Figures = withFallback(null);
let fetchedAt = 0;
let running: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Figures) {
  figures = next;
  listeners.forEach((l) => l());
}

async function readStored(): Promise<Stored | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;
    const { at, figures: stored } = parsed as Partial<Stored>;
    return typeof at === 'number' && stored && typeof stored === 'object' ? { at, figures: stored } : null;
  } catch {
    return null;
  }
}

async function fetchFigures(): Promise<Record<string, Figure> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/regulatory-figures`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return parseFigures(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Au démarrage et avant une leçon découverte. Ne lève jamais d'erreur.
export function loadRegulatoryFigures(): Promise<void> {
  if (running) return running;
  running = (async () => {
    if (fetchedAt === 0) {
      const stored = await readStored();
      if (stored) {
        fetchedAt = stored.at;
        set(withFallback(stored.figures));
      }
    }
    if (Date.now() - fetchedAt < MAX_AGE_MS) return;
    const received = await fetchFigures();
    if (!received) return;
    fetchedAt = Date.now();
    set(withFallback(received));
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ at: fetchedAt, figures: received } satisfies Stored));
    } catch {
      // stockage indisponible : les chiffres restent en mémoire
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

// Chiffres du moment (secours compris), hors React
export function getRegulatoryFigures(): Figures {
  return figures;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useRegulatoryFigures(): Figures {
  return useSyncExternalStore(subscribe, () => figures);
}
