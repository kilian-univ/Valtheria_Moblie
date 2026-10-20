import { DarkTheme } from 'expo-router/react-navigation';

import { palette } from './style/Style';

// Thème de navigation aligné sur la palette de Style.ts (source unique des
// couleurs). Thème unique : sombre.
export const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.dark.gold,
    // Transparent : le fond commun (AppBackground) est dessiné à la racine
    background: 'transparent',
    card: palette.dark.surface,
    text: palette.dark.text,
    border: palette.dark.border,
  },
};
