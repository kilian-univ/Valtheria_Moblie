import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { useEmailConfirmation } from '@/src/hooks/useEmailConfirmation';
import { resendLabel } from '@/src/utils/emailConfirmation';
import { tap } from '@/src/utils/haptics';

// Bandeau discret au-dessus des onglets, tant que l'adresse n'est pas
// confirmée : rien n'est bloqué, l'apprentissage continue
export default function EmailConfirmBanner() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const c = useEmailConfirmation();
  if (!c.pending) return null;

  const waiting = c.left > 0 || c.sending;
  // L'adresse d'envoi, pour repérer une faute de frappe ; après 7 jours, les
  // cartes et les pages concernées disent déjà ce qui attend
  const detail = c.note ?? (c.email ? `Lien envoyé à ${c.email}` : 'Un lien t’attend par courriel');

  return (
    <View style={[styles.banner, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <Ionicons name="mail-unread-outline" size={20} color={colors.gold} style={styles.icon} accessibilityElementsHidden importantForAccessibility="no" />
      <View style={styles.texts}>
        <AppText maxFontSizeMultiplier={1.3} numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          Confirme ton adresse e-mail
        </AppText>
        {/* Le détail, puis le renvoi sur la même ligne : deux lignes en tout */}
        <View style={styles.row}>
          <AppText
            maxFontSizeMultiplier={1.3}
            numberOfLines={c.note ? 2 : 1}
            ellipsizeMode="middle"
            accessibilityLiveRegion="polite"
            style={[styles.detail, { color: colors.subtitle }]}
          >
            {detail}
          </AppText>
          <Pressable
            onPress={() => {
              tap();
              c.resend();
            }}
            disabled={waiting}
            accessibilityRole="button"
            accessibilityState={{ disabled: waiting, busy: c.sending }}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <AppText maxFontSizeMultiplier={1.3} style={[styles.actionLabel, { color: waiting ? colors.subtitle : colors.gold }]}>
              {c.sending ? 'Envoi…' : resendLabel(c.left)}
            </AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderTopWidth: 1,
  },
  icon: { marginTop: 4 },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.bodySemibold, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  detail: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  actionLabel: { fontFamily: fonts.bodySemibold, fontSize: 13, lineHeight: 17 },
  pressed: { opacity: 0.6 },
});
