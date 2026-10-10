import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { fonts, palette, radius, size, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import AppText from './AppText';

const HEIGHT = 52;
const EYE = 20;

type TextFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  // Aide sous le champ (en subtitle), ou erreur (en rouge, prioritaire)
  hint?: string;
  error?: string | null;
  // Mot de passe : masqué, avec le bouton pour l'afficher
  secret?: boolean;
};

// Champ de saisie : libellé au-dessus, bordure dorée au focus, erreur dessous
const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, secret = false, onFocus, onBlur, ...input },
  ref
) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const border = error ? colors.error : focused ? colors.gold : colors.controlBorder;

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" tone="subtitle">
        {label}
      </AppText>
      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: border }]}>
        <TextInput
          ref={ref}
          {...input}
          accessibilityLabel={label}
          secureTextEntry={secret && !visible}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.gold}
          cursorColor={colors.gold}
          maxFontSizeMultiplier={1.4}
          style={[styles.input, { color: colors.text }]}
        />
        {secret ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            style={styles.eye}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={EYE} color={colors.subtitle} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="error" accessibilityRole="alert">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="subtitle">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

export default TextField;

const styles = StyleSheet.create({
  wrap: {
    gap: space[2],
  },
  box: {
    minHeight: HEIGHT,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space[4],
    paddingRight: space[1],
  },
  input: {
    flex: 1,
    minHeight: HEIGHT - 2,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  eye: {
    width: size.tapMin,
    height: size.tapMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
