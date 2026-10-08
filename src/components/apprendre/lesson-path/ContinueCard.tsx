import { Pressable, Text, View } from 'react-native';

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
      <View style={styles.continueCard}>
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
      </View>
    </Pressable>
  );
}