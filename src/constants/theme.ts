import {
  DarkTheme,
  DefaultTheme
} from 'expo-router/react-navigation';

import { palette } from './style/Style';

// Thème de navigation aligné sur la palette de Style.ts (source unique des couleurs)
export const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.light.gold,
    // Transparent : le fond commun (AppBackground) est dessiné à la racine
    background: 'transparent',
    card: palette.light.surface,
    text: palette.light.text,
    border: palette.light.border,
  },
};

export const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: palette.dark.gold,
    background: 'transparent',
    card: palette.dark.surface,
    text: palette.dark.text,
    border: palette.dark.border,
  },
};
