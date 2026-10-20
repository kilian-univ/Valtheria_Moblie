import { AccessibilityInfo } from 'react-native';
import type { ReactNode } from 'react';

// Annonce au lecteur d'écran (VoiceOver, TalkBack) : verdict d'une réponse,
// erreur, confirmation. `accessibilityLiveRegion` ne vaut que sur Android ;
// sur iOS, rien n'est lu sans cette annonce (audit I13).
export function announce(text: string, delay = 0): void {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return;
  const say = () => AccessibilityInfo.announceForAccessibility(clean);
  if (delay > 0) setTimeout(say, delay);
  else say();
}

// Texte brut d'un contenu React simple (chaîne, nombre, tableau de ceux-ci) ;
// vide si le contenu est un élément
export function plainTextOf(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(plainTextOf).join('');
  return '';
}
