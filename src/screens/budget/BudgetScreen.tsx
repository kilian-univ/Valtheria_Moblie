import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AmountSheet from '@/src/components/budget/AmountSheet';
import ChargeList from '@/src/components/budget/ChargeList';
import SpendableCard from '@/src/components/budget/SpendableCard';
import SplitBar from '@/src/components/budget/SplitBar';
import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import Button from '@/src/components/common/Button';
import PageState from '@/src/components/common/PageState';
import HelpTerm from '@/src/components/patrimoine/HelpTerm';
import ValRemark from '@/src/components/patrimoine/ValRemark';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { loadBudget } from '@/src/state/budgetData';
import { cycleCharges, monthly, spendable, split, splitPercents } from '@/src/utils/budget/calc';
import { localToday } from '@/src/utils/budget/dates';
import type { Budget } from '@/src/utils/budget/model';
import { chooseBudgetTip } from '@/src/utils/budget/tips';
import { feedback } from '@/src/utils/feedback';
import { tap } from '@/src/utils/haptics';
import { staleDataText, type LoadError } from '@/src/utils/loadError';

type Props = { budget: Budget; userKey: string; stale: boolean; staleKind: LoadError };

// Mon budget (maquette, écran 1). Tout est manuel, donc rien ne doit être une
// corvée : un seul chiffre à tenir à jour, le solde du compte. Aucune série,
// aucune pénalité pour un oubli : un vieux solde est seulement « à confirmer ».
export default function BudgetScreen({ budget, userKey, stale, staleKind }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { get, post } = useApi();
  const today = localToday();
  const [refreshing, setRefreshing] = useState(false);
  const [balanceMounted, setBalanceMounted] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);

  const detailed = budget.settings.mode === 'detaille';
  const s = spendable({ recurring: budget.recurring, balances: budget.balances, today, entries: detailed ? budget.entries : [] });
  const charges = cycleCharges(budget.recurring, today);
  const sp = split({ recurring: budget.recurring, categories: budget.categories });
  const tip = chooseBudgetTip({
    income: monthly(budget.recurring, 'revenu'),
    subscriptions: budget.recurring.filter((r) => r.type === 'depense' && r.category === 'Abonnements').reduce((t, r) => t + r.amount, 0),
    saving: monthly(budget.recurring, 'epargne'),
  });

  const refresh = async () => {
    setRefreshing(true);
    await loadBudget(userKey, get, true);
    setRefreshing(false);
  };

  const openBalance = () => {
    tap();
    setBalanceMounted(true);
    setBalanceOpen(true);
  };

  const saveBalance = async (amount: number) => {
    try {
      await post('/budget/balances', { amount });
      await loadBudget(userKey, get, true);
      feedback.drop();
      setBalanceOpen(false);
      return true;
    } catch {
      feedback.wrong(0.6);
      return false;
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} colors={[colors.gold]} progressBackgroundColor={colors.surface} />}
      >
        <AppText accessibilityRole="header" style={styles.title}>
          Mon budget
        </AppText>
        {stale ? <PageState variant="offline" text={staleDataText(staleKind, 'Tes derniers chiffres connus')} /> : null}

        {s ? (
          <SpendableCard s={s} today={today} savingPlanned={monthly(budget.recurring, 'epargne')} onUpdate={openBalance} />
        ) : (
          <View style={styles.noBalance}>
            <AppText variant="callout" tone="subtitle">
              Il manque juste ton solde pour savoir ce que tu peux encore dépenser.
            </AppText>
            <Button label="Indiquer mon solde" onPress={openBalance} />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <AppText variant="sectionLabel" accessibilityRole="header">
              CE QUI VA ENCORE PARTIR
            </AppText>
            <Pressable
              onPress={() => {
                tap();
                router.push({ pathname: '/outils/budget/mise-en-route', params: { modifier: '1' } });
              }}
              hitSlop={12}
              accessibilityRole="link"
              accessibilityLabel="Modifier mes rentrées et mes charges fixes"
            >
              <AppText style={[styles.link, { color: colors.gold }]}>Modifier</AppText>
            </Pressable>
          </View>
          {charges.length > 0 ? (
            <ChargeList charges={charges} />
          ) : (
            <AppText variant="callout" tone="subtitle">
              Aucune charge fixe pour l’instant.
            </AppText>
          )}
          <View style={styles.inline}>
            <AppText variant="caption" tone="subtitle" style={styles.flex}>
              Tes charges fixes reviennent toutes seules chaque mois.
            </AppText>
            <HelpTerm term="Charges fixes" />
          </View>
        </View>

        {sp ? (
          <View style={styles.section}>
            <AppText variant="sectionLabel" accessibilityRole="header">
              TA RÉPARTITION
            </AppText>
            <SplitBar p={splitPercents(sp)} />
          </View>
        ) : null}

        {tip ? (
          <View style={styles.section}>
            <ValRemark tip={tip} />
          </View>
        ) : null}
      </ScrollView>

      {balanceMounted ? (
        <AmountSheet
          open={balanceOpen}
          onRequestClose={() => setBalanceOpen(false)}
          onClosed={() => setBalanceMounted(false)}
          title="Combien as-tu sur ton compte courant ?"
          subtitle="Regarde ton appli bancaire, et tape le solde. C’est tout."
          initial={null}
          allowNegative
          confirmLabel="Mettre à jour"
          onConfirm={saveBalance}
          errorText="Ton solde n’a pas pu être enregistré. Réessaie dans un instant."
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], minHeight: 52 },
  content: { paddingHorizontal: space[5], gap: space[3] },
  title: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, letterSpacing: titleLetterSpacing(26) },
  noBalance: { gap: space[3] },
  section: { marginTop: space[4], gap: space[2] },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  link: { fontFamily: fonts.bodySemibold, fontSize: 14 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
