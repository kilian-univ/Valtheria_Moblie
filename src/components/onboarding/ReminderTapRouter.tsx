import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { onReminderTapped } from '@/src/state/reminder';

// Rappel touché : l'accueil d'Apprendre, d'où partent la leçon et la révision
// du jour ; le rappel du budget ouvre Mon budget. Rien à afficher.
export default function ReminderTapRouter() {
  const router = useRouter();
  useEffect(() => onReminderTapped((target) => router.navigate(target === 'budget' ? '/outils/budget' : '/apprendre')), [router]);
  return null;
}
