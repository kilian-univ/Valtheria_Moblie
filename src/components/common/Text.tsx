import { Children, ReactNode } from 'react';
import { StyleSheet, Text as NativeText, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { frenchSpaces } from '@/src/utils/frenchSpaces';

// Texte affiché avec les espaces insécables à la française (frenchSpaces) :
// un montant, un « % », un « ? » ou un guillemet ne se retrouvent jamais
// seuls en début de ligne, pour les textes de l'app comme pour le contenu
// du site. Remplace le Text de React Native partout (un test l'impose) ;
// AppText passe aussi par ici.

// Morceaux voisins fusionnés avant correction : `{montant} €` arrive en deux
// enfants (« 27 071 » puis « € »). Les éléments imbriqués restent intacts.
export function frenchChildren(children: ReactNode, thin: boolean): ReactNode {
  if (typeof children === 'string') return frenchSpaces(children, { thin });
  if (!Array.isArray(children)) return children;
  const out: ReactNode[] = [];
  let buf: string | null = null;
  for (const c of Children.toArray(children)) {
    if (typeof c === 'string' || typeof c === 'number') buf = (buf ?? '') + String(c);
    else {
      if (buf !== null) out.push(frenchSpaces(buf, { thin }));
      buf = null;
      out.push(c);
    }
  }
  if (buf !== null) out.push(frenchSpaces(buf, { thin }));
  return out;
}

// La police des titres (Fraunces) n'a pas d'espace fine insécable : on y
// met une insécable ordinaire, comme BigNumber et StatBand
export function thinAllowed(style: StyleProp<TextStyle>): boolean {
  const family = StyleSheet.flatten(style)?.fontFamily;
  return !(typeof family === 'string' && family.startsWith('Fraunces'));
}

export default function Text({ children, style, ...props }: TextProps) {
  return (
    <NativeText style={style} {...props}>
      {frenchChildren(children, thinAllowed(style))}
    </NativeText>
  );
}
