const tintColorLight = '#D4A63A';
const tintColorDark = '#D4A63A';
import {
  DarkTheme,
  DefaultTheme
} from 'expo-router/react-navigation';

export const Colors = {
  light: {
    text: '#0D1B2A',
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#EAF0F2',
    background: '#0D1B2A',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    text: Colors.light.text,
  },
};

export const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    text: Colors.dark.text,
  },
};