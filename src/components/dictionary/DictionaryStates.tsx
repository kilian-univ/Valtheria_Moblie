import { StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import Button from '@/src/components/common/Button';
import Skeleton from '@/src/components/common/Skeleton';
import ValFullBody from '@/src/components/common/ValFullBody';
import { fonts, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { DictionaryEntry } from '@/src/utils/dictionary';
import { formatInteger } from '@/src/utils/format';
import Chip from './Chip';

const TITLE_SIZE = 22;
const VAL_HEIGHT = 200;
const ROWS = 6;

// Aucun mot pour la recherche : Val réfléchit, et propose les mots proches
export function NoResult({
  query,
  close,
  onSuggestion,
}: {
  query: string;
  close: DictionaryEntry[];
  onSuggestion: (term: string) => void;
}) {
  return (
    <View style={styles.center}>
      <ValFullBody pose="pense" height={VAL_HEIGHT} />
      <AppText maxFontSizeMultiplier={1.3} accessibilityRole="header" style={styles.title}>
        Aucun mot trouvé
      </AppText>
      <AppText variant="body" tone="subtitle" style={styles.text}>
        {`Rien pour « ${query.trim()} ».`}
      </AppText>
      {close.length > 0 ? (
        <View style={styles.suggestions}>
          <AppText variant="callout" tone="subtitle">
            Tu voulais peut-être dire :
          </AppText>
          <View style={styles.chips}>
            {close.map((e) => (
              <Chip
                key={e.term}
                label={e.term}
                onPress={() => onSuggestion(e.term)}
                accessibilityHint="Remplit la recherche"
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Sans compte (401) : invitation, sans message d'erreur
export function Reserved({ count, onRegister, onLogin }: { count: number | null; onRegister: () => void; onLogin: () => void }) {
  const words = count ? `aux ${formatInteger(count)} mots de l’argent` : 'aux mots de l’argent';
  return (
    <View style={styles.center}>
      <ValFullBody pose="salut" height={VAL_HEIGHT} />
      <AppText maxFontSizeMultiplier={1.3} accessibilityRole="header" style={styles.title}>
        Le dictionnaire t&apos;attend
      </AppText>
      <AppText variant="body" tone="subtitle" style={styles.text}>
        {`Crée ton compte pour accéder ${words}.`}
      </AppText>
      <View style={styles.actions}>
        <Button label="Créer mon compte" onPress={onRegister} />
        <Button variant="text" label="J'ai déjà un compte" onPress={onLogin} />
      </View>
    </View>
  );
}

// Chargement de l'accueil : la barre de recherche reste réelle (posée par
// l'écran) ; le mot du jour et les lignes sont des blocs
export function HomeSkeleton() {
  return (
    <View>
      <Skeleton width="100%" height={176} shape="block" style={styles.card} />
      <Skeleton width={90} height={10} style={styles.label} />
      {Array.from({ length: ROWS }, (_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width="45%" height={16} />
          <Skeleton width="85%" height={13} />
        </View>
      ))}
    </View>
  );
}

// Chargement d'une fiche
export function TermSkeleton() {
  return (
    <View style={styles.term}>
      <Skeleton width={90} height={10} />
      <Skeleton width="70%" height={40} />
      <Skeleton width="100%" height={18} />
      <Skeleton width="90%" height={18} />
      <Skeleton width="60%" height={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    paddingTop: space[6],
    paddingHorizontal: space[5],
  },
  title: {
    fontFamily: fonts.title,
    fontSize: TITLE_SIZE,
    lineHeight: 28,
    letterSpacing: titleLetterSpacing(TITLE_SIZE),
    textAlign: 'center',
    marginTop: space[5],
  },
  text: {
    textAlign: 'center',
    marginTop: space[2],
  },
  suggestions: {
    alignItems: 'center',
    gap: space[3],
    marginTop: space[6],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[2],
  },
  actions: {
    alignSelf: 'stretch',
    gap: space[2],
    alignItems: 'center',
    marginTop: space[6],
  },
  card: {
    marginTop: space[6],
  },
  label: {
    marginTop: space[8],
    marginBottom: space[4],
  },
  row: {
    gap: space[2],
    paddingVertical: space[3],
  },
  term: {
    gap: space[3],
    marginTop: space[4],
  },
});
