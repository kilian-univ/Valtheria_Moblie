import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { fonts, palette, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

export const SEARCH_HEIGHT = 50;
const RADIUS = 14;
const ICON = 18;

type SearchBarProps = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
};

// Recherche : bordure dorée quand le champ a le focus ou du texte, bouton
// effacer dès qu'il y a du texte
export default function SearchBar({ value, onChange, placeholder = 'Rechercher un mot' }: SearchBarProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderColor: active ? colors.gold : colors.controlBorder },
      ]}
    >
      <Ionicons name="search" size={ICON} color={active ? colors.gold : colors.subtitle} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.subtitle}
        selectionColor={colors.gold}
        cursorColor={colors.gold}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        maxFontSizeMultiplier={1.4}
        accessibilityLabel="Rechercher un mot"
        style={[styles.input, { color: colors.text }]}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
          hitSlop={4}
          style={styles.clear}
        >
          <Ionicons name="close-circle" size={ICON} color={colors.subtitle} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: SEARCH_HEIGHT,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space[4],
    gap: space[2],
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.body,
    fontSize: 16,
  },
  clear: {
    width: size.tapMin,
    height: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
