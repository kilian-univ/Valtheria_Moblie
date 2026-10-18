import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Header from '@/src/components/topbar/header';
import { fonts, moduleColors, palette, space, universeCard, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useBudget } from '@/src/state/budgetData';
import { usePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import { userKeyOf } from '@/src/state/userMemory';
import { spendable } from '@/src/utils/budget/calc';
import { localToday } from '@/src/utils/budget/dates';
import { euros } from '@/src/utils/budget/format';
import { savingMonths } from '@/src/utils/budget/patrimoine';
import { tap } from '@/src/utils/haptics';
import { currentStreak, streakLabel } from '@/src/utils/patrimoine/regularity';

type ToolProps = {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  title: string;
  description: string;
  // Une ligne vivante (« Tu peux encore dépenser 412 € »), s'il y a de quoi
  live: string | null;
  route: Href;
};

// Carte d'un outil : fond à 3 %, filet fin, liseré à la couleur de l'outil
// (comme les cartes d'univers), une icône teintée, le titre et sa ligne vivante
function ToolCard({ color, icon, label, title, description, live, route }: ToolProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const router = useRouter();
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push(route);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}${live ? `. ${live}` : ''}`}
      style={({ pressed }) => [styles.card, { backgroundColor: pressed ? colors.surface2 : colors.cardSurface, borderColor: colors.cardBorder }]}
    >
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: withOpacity(color, 0.16) }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.texts}>
          <AppText maxFontSizeMultiplier={1.3} style={[styles.label, { color }]}>
            {label}
          </AppText>
          <AppText maxFontSizeMultiplier={1.3} style={styles.title}>
            {title}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtitle} />
      </View>
      <AppText variant="callout" tone="subtitle">
        {description}
      </AppText>
      {live ? <AppText style={[styles.live, { color: colors.text }]}>{live}</AppText> : null}
    </Pressable>
  );
}

// Onglet Outils : Mon budget et Mon patrimoine
export default function OutilsScreen() {
  const { user, get } = useApi();
  const key = user?.id != null ? String(user.id) : null;
  const budgetState = useBudget(key, get);
  const prefs = usePatrimoinePrefs(userKeyOf(user?.id));
  const [now] = useState(() => new Date());

  const budget = key !== null && budgetState.user === key ? budgetState.budget : null;
  let budgetLive: string | null = null;
  if (budget?.settings.setupDone) {
    const s = spendable({ recurring: budget.recurring, balances: budget.balances, today: localToday(), entries: budget.settings.mode === 'detaille' ? budget.entries : [] });
    budgetLive = s ? `Tu peux encore dépenser ${euros(s.amount)}` : null;
  } else if (budget) budgetLive = 'Mise en route en deux minutes';
  // L'épargne mise de côté dans le budget compte pour la régularité
  const regularity = prefs ? streakLabel(currentStreak([...prefs.months, ...(budget ? savingMonths(budget, localToday()) : [])], now)) : null;

  return (
    <View style={styles.screen}>
      <Header showBack={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title1" accessibilityRole="header">
          Outils
        </AppText>
        <AppText variant="body" tone="subtitle" style={styles.subtitle}>
          Ton argent, au quotidien et sur la durée
        </AppText>
        <ToolCard
          color={moduleColors.cuivre.face}
          icon="wallet-outline"
          label="AU QUOTIDIEN"
          title="Mon budget"
          description="Ce que tu peux encore dépenser, à jour avec un seul chiffre : ton solde."
          live={budgetLive}
          route="/outils/budget"
        />
        <ToolCard
          color={moduleColors.sarcelle.face}
          icon="trending-up-outline"
          label="SUR LA DURÉE"
          title="Mon patrimoine"
          description="Tes livrets, placements et objectifs, réunis au même endroit."
          live={regularity ? `Régularité : ${regularity}` : null}
          route="/outils/portefeuille"
        />
      </ScrollView>
    </View>
  );
}

const PAD = 16;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space[5], gap: space[4] },
  subtitle: { marginTop: -space[3], marginBottom: space[2] },
  card: {
    padding: PAD,
    paddingLeft: PAD + universeCard.bar,
    gap: space[2],
    borderRadius: universeCard.radius,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  bar: {
    position: 'absolute',
    left: 0,
    top: universeCard.barInset,
    bottom: universeCard.barInset,
    width: universeCard.bar,
    borderTopRightRadius: universeCard.bar,
    borderBottomRightRadius: universeCard.bar,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2 },
  title: { fontFamily: fonts.title, fontSize: 22, lineHeight: 27 },
  live: { fontFamily: fonts.bodySemibold, fontSize: 15 },
});
