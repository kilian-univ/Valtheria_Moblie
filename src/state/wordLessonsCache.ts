import type { Module } from '@/src/context/ApiContext';

// Cache en mémoire du Dictionnaire (hooks/useWordLessons) : la liste des
// modules demandée une fois par ouverture de l'app, et le lot de textes de
// leçons en cours de lecture. Partagé par toute l'app, donc remis à zéro à
// la déconnexion et à la suppression du compte (state/purge) : un autre
// compte ne voit pas les modules du précédent.
export const wordLessonsCache: { modules: Promise<Module[]> | null; fetching: boolean } = { modules: null, fetching: false };

export function resetWordLessonsCache(): void {
  wordLessonsCache.modules = null;
  wordLessonsCache.fetching = false;
}
