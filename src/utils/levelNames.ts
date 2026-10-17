// Niveaux de difficulté des modules : clés du site et libellés, une seule
// table pour tout l'affichage (sections d'un univers, sous-titre d'un
// module). Sans React : testable avec Node.

export const LEVEL_ORDER = ['entree', 'debutant', 'inter', 'avance', 'expert'] as const;

const LEVEL_LABELS: Record<string, string> = {
  entree: 'Entrée',
  debutant: 'Débutant',
  inter: 'Intermédiaire',
  avance: 'Avancé',
  expert: 'Expert',
};

// Synonymes déjà vus (anciennes valeurs, anglais) → clé du site
const ALIASES: Record<string, string> = {
  entree: 'entree',
  debutant: 'debutant',
  debutante: 'debutant',
  beginner: 'debutant',
  facile: 'debutant',
  easy: 'debutant',
  inter: 'inter',
  intermediaire: 'inter',
  intermediate: 'inter',
  moyen: 'inter',
  medium: 'inter',
  avance: 'avance',
  avancee: 'avance',
  advanced: 'avance',
  difficile: 'avance',
  hard: 'avance',
  expert: 'expert',
};

function plainKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Clé du niveau d'un module, ou null s'il n'en a pas. Une valeur inconnue
// garde sa propre clé (rangée après les niveaux connus).
export function levelKey(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const key = plainKey(raw);
  return ALIASES[key] ?? key;
}

export function levelLabel(key: string): string {
  return LEVEL_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
