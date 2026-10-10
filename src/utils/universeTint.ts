import { ModuleColors, moduleColors } from '@/src/constants/style/Style';
import type { Universe } from '@/src/lesson/model';
import { MODULE_COLOR_ORDER, universeColorKey } from '@/src/utils/modulePath';
import { UNIVERSE_ICONS } from '@/src/utils/universes';

// Couleur d'un univers d'après son slug : sa position du serveur si les
// univers sont connus, sinon son rang dans la liste des 15 univers du site
// (même règle). Sert aux leçons découvertes, jouées sans compte.
export function universeTint(slug: string, universes: readonly Universe[] = []): ModuleColors {
  const known = universes.find((u) => u.slug === slug);
  if (known) return moduleColors[universeColorKey(known)];
  const rank = Math.max(0, Object.keys(UNIVERSE_ICONS).indexOf(slug));
  return moduleColors[MODULE_COLOR_ORDER[rank % MODULE_COLOR_ORDER.length]];
}
