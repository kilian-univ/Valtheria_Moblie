import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { Module, useApi } from '@/src/context/ApiContext';
import { learningStore } from '@/src/state/learningStore';
import { lessonTextsLoaded, saveLessonText, staleLessons, useLessonTexts, wordIndexFor } from '@/src/state/lessonTexts';
import { wordLessonsCache } from '@/src/state/wordLessonsCache';
import type { DictionaryEntry } from '@/src/utils/dictionary';
import type { WordIndex } from '@/src/utils/wordLessonIndex';

// Leçons relues par passage, au plus (les autres au passage suivant)
const FETCH_PER_PASS = 20;
// La liste des modules demandée une fois (Dictionnaire ouvert sans être
// passé par Apprendre) et le lot de textes en cours vivent dans
// state/wordLessonsCache, remis à zéro à la déconnexion

export type WordLessons = {
  index: WordIndex;
  // Toutes les leçons connues : titre et module
  lessons: Map<number, { title: string; module: Module }>;
};

// Index mots ↔ leçons pour le Dictionnaire : leçons connues (modules
// d'Apprendre, sinon demandés une fois), textes gardés sur le téléphone et
// complétés par petits lots en tâche de fond. Compte connecté seulement.
export function useWordLessons(entries: readonly DictionaryEntry[]): WordLessons | null {
  const { getModules, getLesson, isAuthenticated } = useApi();
  const store = useSyncExternalStore(learningStore.subscribe, learningStore.getState);
  const texts = useLessonTexts();
  const [fallback, setFallback] = useState<Module[] | null>(null);
  // Déconnecté : plus de leçons connues, même si la liste de repli est encore là
  const modules = !isAuthenticated ? null : store.modules.length > 0 ? store.modules : fallback;

  useEffect(() => {
    if (!isAuthenticated || store.modules.length > 0 || fallback) return;
    wordLessonsCache.modules =
      wordLessonsCache.modules ??
      (getModules() as Promise<Module[]>).catch(() => {
        wordLessonsCache.modules = null;
        return [];
      });
    let active = true;
    wordLessonsCache.modules.then((list) => {
      if (active && Array.isArray(list)) setFallback(list);
    });
    return () => {
      active = false;
    };
  }, [isAuthenticated, store.modules.length, fallback, getModules]);

  const lessons = useMemo(() => {
    const out = new Map<number, { title: string; module: Module }>();
    for (const m of modules ?? []) for (const l of m.lessons ?? []) out.set(l.id, { title: l.title, module: m });
    return out;
  }, [modules]);

  // Textes manquants ou trop vieux : relus par petits lots
  useEffect(() => {
    if (!isAuthenticated || lessons.size === 0 || !texts.loaded || wordLessonsCache.fetching) return;
    const missing = staleLessons([...lessons.keys()]).slice(0, FETCH_PER_PASS);
    if (missing.length === 0) return;
    wordLessonsCache.fetching = true;
    (async () => {
      await lessonTextsLoaded();
      for (const id of missing) {
        try {
          saveLessonText(id, await getLesson(id), lessons.get(id)?.title ?? null);
        } catch {
          // hors ligne ou leçon indisponible : on garde le titre seul
        }
      }
    })().finally(() => {
      wordLessonsCache.fetching = false;
    });
  }, [isAuthenticated, lessons, texts.loaded, getLesson]);

  const terms = useMemo(() => entries.map((e) => e.term), [entries]);
  const index = useMemo(
    () =>
      texts.loaded && lessons.size > 0 && terms.length > 0
        ? wordIndexFor(terms, [...lessons].map(([id, l]) => ({ id, title: l.title })), texts.texts)
        : null,
    // Un texte de plus : l'index est recalculé (ou relu s'il n'a pas changé)
    [texts.loaded, texts.texts, lessons, terms]
  );
  return index ? { index, lessons } : null;
}
