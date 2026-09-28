import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLessonEndStyles } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import ContinueButton from './ContinueButton';

const VAL_COMPLICE = require('@/assets/images/md/val-complice.webp');

export default function LessonEndScreen({
  result,
  colors,
  onClose,
}: {
  result: any;
  colors: any;
  onClose: () => void;
}) {
  const { colorScheme } = useTheme();
  const styles = getLessonEndStyles(colorScheme);

  const totalVals = (result.vals_gained ?? 0) + (result.daily_streak_bonus ?? 0);
  const notions: any[] = result.notions ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={VAL_COMPLICE} style={styles.valImage} resizeMode="cover" />
        <Text style={styles.title}>Leçon terminée</Text>
        <Text style={styles.subtitle}>
          {result.scored_total > 0
            ? `${result.first_try_correct} réussi(s) du premier coup sur ${result.scored_total}`
            : 'Bien joué, tu as fait le tour.'}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statValueGold}>+{result.xp_gained ?? 0}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{result.user?.streak ?? 0}</Text>
            <Text style={styles.statLabel}>Série</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>+{totalVals}</Text>
            <Text style={styles.statLabel}>Vals</Text>
          </View>
        </View>

        {result.module_just_completed && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>🏆 Module terminé !</Text>
          </View>
        )}

        {result.chest && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              🎁 Coffre {result.chest.rarity} : +{result.chest.amount} Vals
            </Text>
          </View>
        )}

        {notions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notions travaillées</Text>
            {notions.map((n) => (
              <View key={n.slug} style={styles.notionRow}>
                <Text style={styles.notionName}>{n.nom}</Text>
                <View style={n.etat === 'reussie' ? styles.badgeDone : styles.badgeSeen}>
                  <Text style={n.etat === 'reussie' ? styles.badgeDoneText : styles.badgeSeenText}>
                    {n.etat === 'reussie' ? 'Réussie' : 'Vue'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <ContinueButton colors={colors} onPress={onClose} label="Continuer" />
    </SafeAreaView>
  );
}