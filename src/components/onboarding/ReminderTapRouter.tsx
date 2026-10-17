import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { onReminderTapped } from '@/src/state/reminder';

// Rappel touché : l'accueil d'Apprendre, d'où partent la leçon et la révision
// du jour. Rien à afficher.
export default function ReminderTapRouter() {
  const router = useRouter();
  useEffect(() => onReminderTapped(() => router.navigate('/apprendre')), [router]);
  return null;
}
