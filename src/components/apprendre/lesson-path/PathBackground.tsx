import { getApprendreStyles } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import Svg, { Path } from 'react-native-svg';

export const NODE_SPACING_Y = 150;
export const PATH_WIDTH = 340;
export const CENTER_X = 170;
export const PATH_OFFSETS = [-80, -25, 65, 25, 0, -55, -70, -55];

export function getNodePosition(index: number) {
  return {
    x: CENTER_X + PATH_OFFSETS[index % PATH_OFFSETS.length],
    y: index * NODE_SPACING_Y + 50,
  };
}

function buildSegmentD(from: number, to: number): string {
  const p1 = getNodePosition(from);
  const p2 = getNodePosition(to);
  const midY = (p1.y + p2.y) / 2;
  return `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
}

type NodeStatus = 'completed' | 'available' | 'locked';

export default function PathBackground({
  lessons,
  colors,
  moduleColor,
}: {
  lessons: { status: NodeStatus }[];
  colors: any;
  moduleColor?: string;
}) {
  const { colorScheme } = useTheme();
  const styles = getApprendreStyles(colorScheme);

  const totalCount = lessons.length;
  if (totalCount === 0) return null;

  const height = (totalCount - 1) * NODE_SPACING_Y + 100;

  return (
    <Svg width={PATH_WIDTH} height={height} style={styles.pathSvg}>
      {Array.from({ length: totalCount - 1 }, (_, i) => {
        const d = buildSegmentD(i, i + 1);
        const fromDone = lessons[i].status === 'completed';
        const toDone = lessons[i + 1].status === 'completed';

        // Doré entre deux leçons déjà terminées, couleur du module sur le
        // tronçon qui mène à la leçon disponible, gris pour ce qui n'est pas
        // encore atteint.
        const stroke = fromDone && toDone
          ? colors.gold
          : fromDone
          ? moduleColor || colors.primary
          : colors.border;

        return (
          <Path key={i} d={d} stroke={stroke} strokeWidth={6} strokeLinecap="round" fill="none" />
        );
      })}
    </Svg>
  );
}