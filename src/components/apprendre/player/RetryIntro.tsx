import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import GoldHalo from '@/src/components/common/GoldHalo';
import { ValPicture } from '@/src/components/common/ValBubble';
import { fonts, palette, radius, space, titleLetterSpacing, withOpacity } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { catchUpButton, type MissedItem } from '@/src/utils/lessonPlayer';
import Cascade from './Cascade';

type IconName = ComponentProps<typeof Ionicons>['name'];

const HALO = 180;
const VAL_SIZE = 160;
const TITLE_SIZE = 30;
const ICON_BOX = 36;
const CARD_BORDER = 0.35;
const ICON_TINT = 0.14;

type RetryIntroProps = {
  // Une carte par question ratée, dans l'ordre où elles reviennent
  items: MissedItem[];
  onStart: () => void;
  onSkip: () => void;
  // « Passer au bilan » envoie la leçon (vraie leçon) : envoi en cours, ou échoué
  loading?: boolean;
  errorText?: string | null;
};

// Avant le bilan, s'il y a eu des erreurs : « Une seconde chance ? ». Val
// (buste fondu) sous un halo doré, une carte par question ratée (icône et
// type en rouge, début de la question), « Rattraper n question(s) » ou
// « Passer au bilan ».
export default function RetryIntro({ items, onStart, onSkip, loading, errorText }: RetryIntroProps) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Cascade index={0} style={styles.valBox}>
          <View style={styles.halo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <GoldHalo />
            <ValPicture mood="rassurant" frame="xl" style={styles.val} />
          </View>
        </Cascade>
        <Cascade index={1} style={styles.texts}>
          <AppText accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.title}>
            {'Une seconde chance ?'}
          </AppText>
          <AppText variant="body" tone="subtitle" style={styles.centerText}>
            Revoir ce qui a coincé, c’est ce qui fait le plus retenir. Ça compte dans ton bilan.
          </AppText>
        </Cascade>
        <View style={styles.cards}>
          {items.map((item, i) => (
            <Cascade key={i} index={2 + i}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.optionFace, borderColor: withOpacity(colors.error, CARD_BORDER) },
                ]}
                accessible
                accessibilityLabel={`${item.label} : ${item.text}`}
              >
                <View style={[styles.iconBox, { backgroundColor: withOpacity(colors.error, ICON_TINT) }]}>
                  <Ionicons name={item.icon as IconName} size={18} color={colors.error} />
                </View>
                <View style={styles.cardTexts}>
                  <AppText style={[styles.cardLabel, { color: colors.error }]}>{item.label.toUpperCase()}</AppText>
                  {item.text ? (
                    <AppText variant="callout" numberOfLines={2}>
                      {item.text}
                    </AppText>
                  ) : null}
                </View>
              </View>
            </Cascade>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {errorText ? (
          <AppText variant="callout" tone="error" accessibilityRole="alert" style={styles.centerText}>
            {errorText}
          </AppText>
        ) : null}
        <Button label={catchUpButton(items.length)} onPress={onStart} disabled={loading} />
        <Button
          variant="text"
          tone="subtitle"
          label={errorText ? 'Réessayer sans rattraper' : 'Passer au bilan'}
          onPress={onSkip}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: space[4],
    paddingHorizontal: space[5],
    paddingVertical: space[4],
  },
  valBox: {
    alignItems: 'center',
  },
  halo: {
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  val: {
    width: VAL_SIZE,
    height: VAL_SIZE,
  },
  texts: {
    alignItems: 'center',
    gap: space[2],
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE + 6,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  cards: {
    gap: space[2] + 2,
    marginTop: space[2],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[3] + 2,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: radius.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Largeur donnée par la rangée (flexShrink, jamais flex: 1 dans un parent
  // qui se règle sur son contenu)
  cardTexts: {
    flexShrink: 1,
    flexGrow: 1,
    gap: 3,
  },
  cardLabel: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
  },
  footer: {
    gap: space[1],
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[3],
  },
});
