import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

import { buildWordIndex, indexSignature, lessonText, type LessonText, type WordIndex } from '@/src/utils/wordLessonIndex';

// Textes des leçons (pour relier les mots du Dictionnaire aux leçons), gardés
// sur le téléphone : ils ne dépendent pas du compte. Remplis à chaque leçon
// chargée (lecteur, révision) et, depuis la fiche d'un mot, par petits lots.
// L'index mots ↔ leçons est gardé avec sa signature et reconstruit quand les
// mots ou les leçons changent.

const TEXTS_KEY = 'valtheria:lecons-textes';
const INDEX_KEY = 'valtheria:index-mots';
// Un texte plus vieux est relu (la leçon a pu changer)
export const TEXT_MAX_AGE_DAYS = 7;

type Stored = { title: string; text: string; at: string };
type State = { texts: Record<string, Stored>; index: { signature: string; index: WordIndex } | null; loaded: boolean };

let state: State = { texts: {}, index: null, loaded: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
let loading: Promise<void> | null = null;

function load(): Promise<void> {
  if (state.loaded) return Promise.resolve();
  if (loading) return loading;
  loading = (async () => {
    let texts: Record<string, Stored> = {};
    let index: State['index'] = null;
    try {
      const [rawTexts, rawIndex] = await Promise.all([AsyncStorage.getItem(TEXTS_KEY), AsyncStorage.getItem(INDEX_KEY)]);
      const t = rawTexts ? JSON.parse(rawTexts) : {};
      if (t && typeof t === 'object' && !Array.isArray(t)) texts = t;
      const i = rawIndex ? JSON.parse(rawIndex) : null;
      if (i && typeof i.signature === 'string' && i.index && typeof i.index === 'object') index = i;
    } catch {
      // illisible : on repart de zéro
    }
    state = { texts: { ...texts, ...state.texts }, index, loaded: true };
    emit();
  })();
  return loading;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persistTexts() {
  if (saveTimer) clearTimeout(saveTimer);
  // Plusieurs leçons d'affilée : une seule écriture
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(TEXTS_KEY, JSON.stringify(state.texts)).catch(() => {});
  }, 500);
}

// Une leçon chargée (forme du serveur) : son texte est gardé
export function saveLessonText(lessonId: number, data: unknown, title?: string | null): void {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const t = title ?? (typeof d.title === 'string' ? d.title : '');
  state = { ...state, texts: { ...state.texts, [String(lessonId)]: { title: t, text: lessonText(data), at: new Date().toISOString() } } };
  emit();
  persistTexts();
}

export function lessonTextsLoaded(): Promise<void> {
  return load();
}

// Leçons dont le texte manque ou est trop vieux
export function staleLessons(ids: readonly number[], now: Date = new Date()): number[] {
  const limit = now.getTime() - TEXT_MAX_AGE_DAYS * 86400000;
  return ids.filter((id) => {
    const s = state.texts[String(id)];
    return !s || new Date(s.at).getTime() < limit;
  });
}

// Index des mots : celui gardé si rien n'a changé, sinon reconstruit et gardé.
// lessons : toutes les leçons connues (titre), avec leur texte s'il est gardé.
export function wordIndexFor(
  terms: readonly string[],
  lessons: readonly { id: number; title: string }[],
  texts: Record<string, Stored> = state.texts
): WordIndex {
  const list: LessonText[] = lessons.map((l) => ({ lessonId: l.id, title: l.title, text: texts[String(l.id)]?.text ?? '' }));
  const signature = indexSignature(terms, list);
  if (state.index?.signature === signature) return state.index.index;
  const index = buildWordIndex(terms, list);
  state = { ...state, index: { signature, index } };
  AsyncStorage.setItem(INDEX_KEY, JSON.stringify(state.index)).catch(() => {});
  return index;
}

export function useLessonTexts(): State {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => state
  );
  useEffect(() => {
    load();
  }, []);
  return value;
}
