import { router } from 'expo-router';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import Button from '@/src/components/common/Button';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, palette, radius, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useLearningSnapshot } from '@/src/hooks/useLearningData';
import { useNotebook } from '@/src/state/notebook';
import { userKeyOf } from '@/src/state/userMemory';
import { type Declic, groupByUniverse, plainDeclic } from '@/src/utils/notebook';
import { universeTint } from '@/src/utils/universeTint';

const DOT = 10;
const PHRASE = 18;
const VAL_DIAMETER = 64;

type Section = { key: string; slug: string | null; name: string | null; first: boolean; data: Declic[] };

const ItemGap = () => <View style={styles.itemGap} />;

// « Ton carnet » : les déclics des leçons terminées, groupés par univers
// (pastille de couleur), du plus récent au plus ancien ; en bas, le test.
// Liste virtualisée : le carnet grandit à chaque leçon, seules les lignes
// visibles sont montées.
export default function NotebookScreen() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { user } = useApi();
  const { universes } = useLearningSnapshot();
  const declics = useNotebook(userKeyOf(user?.id));
  const sections: Section[] = groupByUniverse(declics ?? []).map((g, i) => ({ key: g.slug ?? 'autres', slug: g.slug, name: g.name, first: i === 0, data: g.items }));
  const empty = declics !== null && declics.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
        <AppText variant="bodyMedium" accessibilityRole="header" style={styles.barTitle}>
          Ton carnet
        </AppText>
        <View style={styles.barSpacer} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(d) => d.text}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          empty ? <ValBubble mood="rassurant" diameter={VAL_DIAMETER} text="Ton carnet se remplit à chaque leçon terminée. Le prochain déclic t’attend." /> : null
        }
        renderSectionHeader={({ section }) => {
          const tint = section.slug ? universeTint(section.slug, universes) : null;
          return (
            <View style={[styles.groupHead, !section.first && styles.groupHeadNext]} accessibilityRole="header">
              <View style={[styles.dot, { backgroundColor: tint?.face ?? colors.subtitle }]} />
              <AppText variant="sectionLabel" tone="subtitle">
                {(section.name ?? 'Autres leçons').toUpperCase()}
              </AppText>
            </View>
          );
        }}
        ItemSeparatorComponent={ItemGap}
        renderItem={({ item: d }) => (
          <View
            style={[styles.item, { backgroundColor: colors.optionFace }]}
            accessible
            accessibilityLabel={`${plainDeclic(d.text)}${d.lessonTitle ? `. Leçon : ${d.lessonTitle}` : ''}`}
          >
            {d.lessonTitle ? (
              <AppText variant="caption" tone="subtitle">
                {d.lessonTitle}
              </AppText>
            ) : null}
            <AppText maxFontSizeMultiplier={1.8} style={styles.phrase}>
              {plainDeclic(d.text)}
            </AppText>
          </View>
        )}
      />

      {/* Bouton toujours visible */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + space[3] }]}>
        <Button
          label="Me tester sur mes déclics"
          onPress={() => router.push('/client/carnet-test')}
          disabled={!declics || declics.length === 0}
          disabledReason={empty ? 'Termine une leçon pour remplir ton carnet.' : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    minHeight: 48,
  },
  barTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
  },
  barSpacer: {
    width: 44,
  },
  content: {
    paddingHorizontal: space[5],
    paddingTop: space[2],
    paddingBottom: space[6],
  },
  // Même rythme qu'avant : un groupe à space[6] du précédent, ses lignes à
  // space[3] les unes des autres
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingBottom: space[3],
  },
  groupHeadNext: {
    paddingTop: space[6],
  },
  itemGap: {
    height: space[3],
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  item: {
    gap: space[1],
    padding: space[4],
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  phrase: {
    fontFamily: fonts.title,
    fontSize: PHRASE,
    lineHeight: 24,
    letterSpacing: titleLetterSpacing(PHRASE),
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
});
