import { createContext, useContext, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark';

type ThemeContextValue = {
  colorScheme: ColorScheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  // Thème de départ = celui du système, ensuite l'utilisateur peut le forcer
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    systemScheme === 'dark' ? 'dark' : 'light'
  );

  const toggleTheme = () => {
    setColorScheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme doit être utilisé à l\'intérieur d\'un <ThemeProvider>');
  }
  return ctx;
}