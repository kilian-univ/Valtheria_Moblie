import { createContext, useContext } from 'react';

type ColorScheme = 'dark';

type ThemeContextValue = {
  colorScheme: ColorScheme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Thème unique : sombre (décision du 17 octobre 2026). La palette claire a
// été retirée le 20 octobre 2026 : plus aucun code du thème clair.
const VALUE: ThemeContextValue = { colorScheme: 'dark' };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={VALUE}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme doit être utilisé à l\'intérieur d\'un <ThemeProvider>');
  }
  return ctx;
}
