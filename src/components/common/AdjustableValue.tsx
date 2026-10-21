import { type ReactNode, useEffect, useRef } from 'react';
import { type AccessibilityActionEvent, type StyleProp, View, type ViewStyle } from 'react-native';

import { announce } from '@/src/utils/announce';

type AdjustableValueProps = {
  // Nom lu par le lecteur d'écran (« jour », « heures »)
  label: string;
  // Valeur lue, avec son unité si elle en a une (« 12 », « 19 heures »)
  valueText: string;
  onIncrement: () => void;
  onDecrement: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

// Valeur réglée par des boutons + et − (jour, mois, année, heures,
// minutes), réglable aussi au lecteur d'écran comme un curseur : balayer vers
// le haut ou le bas ajuste d'un cran. iOS lit la valeur juste après le geste,
// avant que l'écran ne l'ait mise à jour : la nouvelle valeur est annoncée.
export default function AdjustableValue({ label, valueText, onIncrement, onDecrement, style, children }: AdjustableValueProps) {
  // Un ajustement vient d'être demandé au lecteur d'écran : la valeur qui
  // arrive est annoncée
  const pending = useRef(false);
  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    announce(valueText);
  }, [valueText]);

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const action = e.nativeEvent.actionName;
    if (action === 'increment') {
      pending.current = true;
      onIncrement();
    } else if (action === 'decrement') {
      pending.current = true;
      onDecrement();
    }
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityHint="Balaie vers le haut ou le bas pour ajuster."
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAccessibilityAction}
      style={style}
    >
      {children}
    </View>
  );
}
