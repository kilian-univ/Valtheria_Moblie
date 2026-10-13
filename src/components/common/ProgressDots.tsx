import { StyleSheet, View } from 'react-native';

const DOT = 9;

type ProgressDotsProps = {
  // true : étape faite (pleine), false : à faire (contour)
  dots: boolean[];
  doneColor: string;
  doneBorder?: string;
  emptyBorder: string;
};

// Petits points d'avancement (six sujets découverts…), décoratifs : le
// parent porte la phrase lue
export default function ProgressDots({ dots, doneColor, doneBorder, emptyBorder }: ProgressDotsProps) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {dots.map((done, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            done ? { backgroundColor: doneColor, borderColor: doneBorder ?? doneColor } : { borderColor: emptyBorder },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
  },
});
