import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import PageState from '@/src/components/common/PageState';
import { shareColors } from '@/src/components/patrimoine/AllocationBar';
import AssetIcon from '@/src/components/common/AssetIcon';
import HelpTerm from '@/src/components/patrimoine/HelpTerm';
import Segmented from '@/src/components/patrimoine/Segmented';
import ValRemark from '@/src/components/patrimoine/ValRemark';
import { fonts, palette, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { effectiveEmergency, useBudgetLink } from '@/src/hooks/useBudgetLink';
import { usePatrimoineView } from '@/src/hooks/usePatrimoineView';
import PatrimoineStateScreen from '@/src/components/patrimoine/PatrimoineStateScreen';
import { usePatrimoinePrefs } from '@/src/state/patrimoinePrefs';
import { userKeyOf } from '@/src/state/userMemory';
import { byRisk, byType, riskProfile, roundedShares, type Share } from '@/src/utils/patrimoine/analysis';
import { rateDateLabel, signedMoney } from '@/src/utils/patrimoine/format';
import { chooseValTip } from '@/src/utils/patrimoine/valTips';

type Tab = 'type' | 'risque' | 'zone';
const TABS: readonly { key: Tab; label: string }[] = [
  { key: 'type', label: 'Par type' },
  { key: 'risque', label: 'Par risque' },
  { key: 'zone', label: 'Par zone' },
];

const RING = 170;
const STROKE = 22;

// Analyse : répartition (par type, par risque ; par zone quand le site la
// donnera), profil au centre de l'anneau, remarque de Val, revenus passifs.
export default function AnalyseScreen() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { user } = useApi();
  const v = usePatrimoineView();
  const userKey = v.userKey ?? userKeyOf(user?.id);
  const data = v.data;
  const prefs = usePatrimoinePrefs(userKey);
  const hidden = prefs?.discreet ?? false;
  const [tab, setTab] = useState<Tab>('risque');
  const [now] = useState(() => new Date());

  const positions = data.portfolio?.positions ?? [];
  const shares: Share<string>[] = tab === 'type' ? byType(positions) : tab === 'risque' ? byRisk(positions) : [];
  const list = roundedShares(shares);
  const tints = shareColors(colors);
  const profile = riskProfile(positions);
  const link = useBudgetLink();
  const tip = chooseValTip({ positions, now, monthlyExpenses: prefs ? effectiveEmergency(prefs.emergency, link.expenses).monthlyExpenses : null });
  const income = positions.filter((p) => p.interestEur !== null && p.interestEur > 0);

  // Anneau : un arc par part
  const r = (RING - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const arcs = list.map((s, i) => {
    const start = list.slice(0, i).reduce((sum, x) => sum + x.share, 0) * circumference;
    const length = Math.max(0, s.share * circumference - (list.length > 1 ? 3 : 0));
    return { key: s.key, color: tints[s.key] ?? colors.subtitle, dash: `${length} ${circumference - length}`, offset: -start };
  });

  // Pas encore de patrimoine : chargement, sans compte, ou erreur (jamais
  // « Ajoute un premier actif » à tort)
  if (v.view !== 'ready') return <PatrimoineStateScreen view={v.view} title="Analyse" errorKind={v.errorKind} onRetry={v.retry} retrying={v.retrying} />;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}>
        <AppText accessibilityRole="header" style={styles.title}>
          Analyse
        </AppText>
        <Segmented fill options={TABS} value={tab} onChange={setTab} />

        {tab === 'zone' ? (
          <PageState
            variant="empty"
            mood="complice"
            title="Bientôt disponible"
            text="Bientôt, la répartition par zone géographique."
          />
        ) : positions.length === 0 ? (
          <PageState variant="empty" mood="rassurant" text="Ajoute un premier actif pour voir ta répartition." />
        ) : (
          <>
            <View style={styles.ringRow}>
              <View
                style={styles.ring}
                accessible
                accessibilityLabel={`Profil ${profile ?? 'non défini'}. ${list.map((s) => `${s.label} ${s.percent} %`).join(', ')}`}
              >
                <Svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
                  <Circle cx={RING / 2} cy={RING / 2} r={r} fill="none" stroke={colors.panelStrong} strokeWidth={STROKE} />
                  {arcs.map((a) => (
                    <Circle
                      key={a.key}
                      cx={RING / 2}
                      cy={RING / 2}
                      r={r}
                      fill="none"
                      stroke={a.color}
                      strokeWidth={STROKE}
                      strokeDasharray={a.dash}
                      strokeDashoffset={a.offset}
                      transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                    />
                  ))}
                </Svg>
                <View style={styles.ringCenter} pointerEvents="none">
                  <AppText variant="caption" tone="subtitle">
                    profil
                  </AppText>
                  <AppText style={styles.profile}>{profile ?? '—'}</AppText>
                </View>
              </View>
              <View style={styles.ringNote}>
                <AppText variant="callout" tone="subtitle">
                  {tab === 'risque'
                    ? 'Chaque actif est classé selon son risque, comme dans tes leçons.'
                    : 'Ton patrimoine, rangé par grande famille d’actifs.'}
                </AppText>
                <View style={styles.helpRow}>
                  <AppText variant="caption" tone="subtitle">
                    Le profil suit la part à risque élevé.
                  </AppText>
                  <HelpTerm term="Profil de risque" alt={['Diversification']} />
                </View>
              </View>
            </View>

            <View>
              {list.map((s, i) => (
                <View
                  key={s.key}
                  style={[styles.shareRow, i < list.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                  accessible
                  accessibilityLabel={`${s.label} : ${s.percent} %`}
                >
                  <View style={[styles.dot, { backgroundColor: tints[s.key] ?? colors.subtitle }]} />
                  <AppText style={styles.shareLabel}>{s.label}</AppText>
                  <AppText style={styles.sharePct}>{s.percent} %</AppText>
                </View>
              ))}
            </View>
          </>
        )}

        {tip && positions.length > 0 ? <ValRemark tip={tip} /> : null}

        {income.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.helpRow}>
              <AppText variant="sectionLabel" accessibilityRole="header">
                REVENUS PASSIFS · SUR 1 AN
              </AppText>
              <HelpTerm term="Revenus passifs" />
            </View>
            {income.map((p, i) => (
              <View
                key={p.id}
                style={[styles.incomeRow, i < income.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                accessible
                accessibilityLabel={`Intérêts de ${p.name} : ${hidden ? 'montant masqué' : signedMoney(p.interestEur ?? 0)} sur un an, estimés`}
              >
                <AssetIcon logoUrl={p.logoUrl} name={p.name} ticker={p.ticker} type={p.type} size={32} />
                <View style={styles.incomeText}>
                  <AppText style={styles.shareLabel}>Intérêts de {p.name}</AppText>
                  {p.interestRatePct !== null ? (
                    <AppText variant="caption" tone="subtitle">
                      {[
                        `${String(p.interestRatePct).replace('.', ',')}\u00a0% par an`,
                        p.interestRateSource === 'regulatory' ? rateDateLabel(p.interestRateEffectiveAt, p.interestRateVerifiedAt) : 'taux saisi',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </AppText>
                  ) : null}
                </View>
                <AppText style={[styles.sharePct, { color: colors.gold }]}>{signedMoney(p.interestEur ?? 0, { hidden })}</AppText>
              </View>
            ))}
            <AppText variant="caption" tone="subtitle">
              Estimation sur un an au taux en vigueur de chaque livret.
            </AppText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], minHeight: 52 },
  content: { paddingHorizontal: space[5], gap: space[4] },
  incomeText: { flex: 1 },
  title: { fontFamily: fonts.title, fontSize: 28, lineHeight: 34, letterSpacing: titleLetterSpacing(28) },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  ring: { width: RING, height: RING },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  profile: { fontFamily: fonts.title, fontSize: 20, lineHeight: 26 },
  ringNote: { flex: 1, gap: space[2] },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  shareLabel: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15 },
  sharePct: { fontFamily: fonts.bodyBold, fontSize: 15, fontVariant: ['tabular-nums'] },
  section: { gap: space[1] },
  incomeRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: 10 },
});
