import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { flowColors } from '@/src/components/budget/FlowDiagram';
import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import PageState from '@/src/components/common/PageState';
import { ValAvatar } from '@/src/components/common/ValBubble';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { loadBudget } from '@/src/state/budgetData';
import { updateBudgetPrefs } from '@/src/state/budgetPrefs';
import { localToday, monthName } from '@/src/utils/budget/dates';
import { parseKey } from '@/src/utils/budget/flows';
import { euros, signedEuros } from '@/src/utils/budget/format';
import type { Budget } from '@/src/utils/budget/model';
import { monthReview, REVIEW_ANSWERS, type ReviewAnswer } from '@/src/utils/budget/review';
import { feedback } from '@/src/utils/feedback';
import { NBSP } from '@/src/utils/frenchSpaces';

type Props = { budget: Budget; userKey: string; month: string };

// Bilan du mois (maquette, écran 7) : proposé une fois à la première
// ouverture du mois suivant, et accessible depuis Mon budget. Dans le vert ou
// non, sans jugement ; où est parti l'argent par rapport au mois d'avant ; la
// question de Val, dont la réponse est rappelée au bilan suivant.
export default function BilanScreen({ budget, userKey, month }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const tint = flowColors(colors);
  const insets = useSafeAreaInsets();
  const { get, post } = useApi();
  const today = localToday();
  const review = monthReview(budget, month, today, budget.settings.mode);
  const [chosen, setChosen] = useState<ReviewAnswer | null>(null);
  const [failed, setFailed] = useState(false);
  const answer = chosen ?? review?.answer ?? null;
  const name = monthName(parseKey(month).month);

  // Bilan vu : il n'est plus proposé à l'ouverture
  useEffect(() => {
    updateBudgetPrefs(userKey, (p) => (p.reviewsShown.includes(month) ? p : { ...p, reviewsShown: [...p.reviewsShown, month].slice(-24) }));
  }, [userKey, month]);

  const choose = async (key: ReviewAnswer) => {
    feedback.pick();
    setChosen(key);
    setFailed(false);
    try {
      await post('/budget/reviews', { month, answer: key });
      await loadBudget(userKey, get, true);
    } catch {
      setFailed(true);
    }
  };

  const max = Math.max(1, ...(review?.rows.map((r) => r.amount) ?? [1]));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}>
        <AppText variant="sectionLabel">{`TON BILAN DE ${name.toUpperCase()}`}</AppText>
        {!review ? (
          <PageState variant="empty" text={`Pas assez de chiffres pour faire le bilan de ${name}. Il se fait tout seul avec quelques soldes dans le mois.`} />
        ) : (
          <>
            <AppText accessibilityRole="header" style={styles.title}>
              {review.green ? 'Un mois dans le vert' : 'Un mois un peu serré'}
            </AppText>
            {review.green && review.streak >= 2 ? (
              <View style={[styles.streak, { backgroundColor: withOpacity(colors.success, 0.15) }]}>
                <AppText style={[styles.streakText, { color: colors.success }]}>{`${review.streak}${NBSP}mois d’affilée`}</AppText>
              </View>
            ) : null}
            {!review.green ? (
              <AppText variant="callout" tone="subtitle">
                {`Les dépenses ont pris ${euros(-review.rest)} de plus que prévu. Ça arrive : le mois suivant repart de zéro.`}
              </AppText>
            ) : null}
            <View style={styles.tiles}>
              {[
                { label: 'Mis de côté', value: euros(review.saved), color: colors.gold },
                { label: 'Dépensé', value: euros(review.spent), color: colors.text },
                { label: 'Restant', value: signedEuros(review.rest), color: review.rest >= 0 ? colors.success : colors.text },
              ].map((t) => (
                <View key={t.label} style={[styles.tile, { backgroundColor: colors.panel }]} accessible accessibilityLabel={`${t.label} : ${t.value}`}>
                  <AppText variant="caption" tone="subtitle">
                    {t.label}
                  </AppText>
                  <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.tileValue, { color: t.color }]}>
                    {t.value}
                  </AppText>
                </View>
              ))}
            </View>
            {review.estimated ? (
              <AppText variant="caption" tone="subtitle">
                Dépenses courantes estimées à partir des soldes relevés ce mois-là.
              </AppText>
            ) : null}

            <AppText variant="sectionLabel" accessibilityRole="header" style={styles.section}>
              OÙ EST PARTI TON ARGENT
            </AppText>
            {review.rows.map((r) => {
              const diff = r.diff === null ? null : Math.abs(r.diff) < 1 ? '=' : `${r.diff > 0 ? '+' : '−'}${NBSP}${euros(Math.abs(r.diff))}`;
              return (
                <View
                  key={r.key}
                  style={styles.row}
                  accessible
                  accessibilityLabel={`${r.label} : ${euros(r.amount)}${
                    r.diff === null ? '' : Math.abs(r.diff) < 1 ? ', comme le mois d’avant' : `, ${r.diff > 0 ? 'plus' : 'moins'} ${euros(Math.abs(r.diff))} que le mois d’avant`
                  }`}
                >
                  <View style={styles.rowHead}>
                    <AppText style={styles.rowLabel}>{r.label}</AppText>
                    <AppText style={styles.rowAmount}>
                      {euros(r.amount)}
                      {diff ? (
                        <AppText style={[styles.rowDiff, { color: diff !== '=' && (r.diff ?? 0) > 0 ? colors.error : colors.success }]}>{` ${diff}`}</AppText>
                      ) : null}
                    </AppText>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.track }]}>
                    <View style={[styles.fill, { width: `${Math.max(2, (r.amount / max) * 100)}%`, backgroundColor: tint[r.family] }]} />
                  </View>
                </View>
              );
            })}

            <View style={[styles.val, { backgroundColor: withOpacity(colors.gold, 0.07), borderColor: withOpacity(colors.gold, 0.25) }]}>
              {review.previousAnswer ? (
                <AppText variant="callout" tone="subtitle">
                  {`Le mois dernier, tu voulais ${REVIEW_ANSWERS.find((a) => a.key === review.previousAnswer)?.recall}.`}
                </AppText>
              ) : null}
              <View style={styles.valHead}>
                <ValAvatar mood="complice" diameter={44} />
                <AppText style={styles.question} accessibilityRole="header">
                  {`Et en ${review.nextName}, qu’est-ce que tu ferais autrement${NBSP}?`}
                </AppText>
              </View>
              <View style={styles.answers} accessibilityRole="radiogroup" accessibilityLabel="Ta réponse">
                {REVIEW_ANSWERS.map((a) => {
                  const on = answer === a.key;
                  return (
                    <Pressable
                      key={a.key}
                      onPress={() => !on && choose(a.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      aria-checked={on}
                      accessibilityLabel={a.label}
                      style={[styles.answer, on ? { backgroundColor: colors.gold, borderColor: colors.gold } : { borderColor: colors.controlBorder }]}
                    >
                      <AppText style={[styles.answerText, { color: on ? colors.onGold : colors.text }]}>{a.label}</AppText>
                    </Pressable>
                  );
                })}
              </View>
              {answer && !failed ? (
                <AppText variant="caption" tone="subtitle" accessibilityLiveRegion="polite">
                  C’est noté. Je te le rappellerai au prochain bilan.
                </AppText>
              ) : null}
              {failed ? (
                <AppText variant="caption" tone="error" accessibilityRole="alert">
                  Ta réponse n’a pas pu être enregistrée. Réessaie dans un instant.
                </AppText>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], minHeight: 52 },
  content: { paddingHorizontal: space[5], gap: space[2] },
  title: { fontFamily: fonts.title, fontSize: 30, lineHeight: 36, letterSpacing: titleLetterSpacing(30) },
  streak: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: 10, borderRadius: radius.pill, justifyContent: 'center' },
  streakText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  tiles: { flexDirection: 'row', gap: space[2], marginTop: space[3] },
  tile: { flex: 1, padding: 12, borderRadius: 14 },
  tileValue: { fontFamily: fonts.title, fontSize: 20, marginTop: 2 },
  section: { marginTop: space[5] },
  row: { paddingVertical: 9 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space[3] },
  rowLabel: { fontSize: 14, flexShrink: 1 },
  rowAmount: { fontFamily: fonts.bodyBold, fontSize: 14 },
  rowDiff: { fontFamily: fonts.body, fontSize: 12 },
  track: { marginTop: 6, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  val: { marginTop: space[5], padding: 14, borderRadius: 18, borderWidth: 1, gap: space[3] },
  valHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  question: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 15, lineHeight: 20 },
  answers: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  answer: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, justifyContent: 'center' },
  answerText: { fontFamily: fonts.bodySemibold, fontSize: 14 },
});
