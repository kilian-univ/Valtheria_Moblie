import { useEffect, useState } from 'react';

import { useApi } from '@/src/context/ApiContext';
import { getLastProfile, LastProfile, setLastProfile } from '@/src/state/lastProfile';

// Lecture lancée dès le chargement de l'app, avant même celle du token par
// ApiContext : le pseudo mémorisé est prêt quand le logo de démarrage s'efface.
const startupProfile = getLastProfile();

// Pseudo à afficher dès le démarrage, sans attendre le profil réseau :
// - pseudo : le vrai s'il est arrivé, sinon le dernier connu sur ce téléphone ;
// - pending : aucun pseudo connu pour l'instant mais il peut encore arriver
//   (première connexion) → afficher un squelette à la place du nom.
export function useKnownPseudo(): { pseudo?: string; pending: boolean } {
  const { user, isAuthenticated, isLoading: authPending } = useApi();
  const [cached, setCached] = useState<LastProfile | null>(null);
  const [cacheRead, setCacheRead] = useState(false);

  useEffect(() => {
    let active = true;
    startupProfile.then((profile) => {
      if (!active) return;
      setCached(profile);
      setCacheRead(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Le profil arrive (ou change) : il devient le dernier pseudo connu
  const userId: number | undefined = user?.id;
  const userPseudo: string | undefined = user?.pseudo?.trim() || undefined;
  useEffect(() => {
    if (userId === undefined || !userPseudo) return;
    setLastProfile({ userId, pseudo: userPseudo });
  }, [userId, userPseudo]);

  if (!isAuthenticated) return { pseudo: undefined, pending: false };
  if (userPseudo) return { pseudo: userPseudo, pending: false };
  if (cached) return { pseudo: cached.pseudo, pending: false };
  // Rien en mémoire : on attend la lecture locale puis le profil réseau.
  // Profil indisponible (hors ligne) : la salutation se passe du nom.
  return { pseudo: undefined, pending: !cacheRead || authPending };
}
