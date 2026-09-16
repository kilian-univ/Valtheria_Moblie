import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { darken } from './colorUtils';

export default function ContinueCard({
  lessonTitle,
  moduleTitle,
  xpReward,
  colors,
  styles,
  onPress,
}: {
  lessonTitle: string;
  moduleTitle: string;
  xpReward: number;
  colors: any;
  styles: any;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.continueCardWrap}>
      <LinearGradient
        colors={[colors.primary, darken(colors.primary, 0.4)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.continueCardGradient}
      >
        <View style={styles.continueCardTextWrap}>
          <Text style={styles.continueCardModule}>{moduleTitle.toUpperCase()}</Text>
          <Text style={styles.continueCardLesson} numberOfLines={2}>
            {lessonTitle}
          </Text>
          <Text style={styles.continueCardXp}>+{xpReward} XP à la clé</Text>
        </View>

        <View style={styles.continueCardPlayWrap}>
          <View style={styles.continueCardPlayTriangle} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}