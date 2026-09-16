import { getApprendreStyles } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import Svg, { Path } from 'react-native-svg';

export const NODE_SPACING_Y = 112;
export const PATH_WIDTH = 340;
export const CENTER_X = 170;
export const PATH_OFFSETS = [0, 55, 85, 55, 0, -55, -85, -55];

export function getNodePosition(index: number) {
  return {
    x: CENTER_X + PATH_OFFSETS[index % PATH_OFFSETS.length],
    y: index * NODE_SPACING_Y + 50,
  };
}

function buildPathD(count: number): string {
  if (count === 0) return '';
  const points = Array.from({ length: count }, (_, i) => getNodePosition(i));
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midY = (prev.y + curr.y) / 2;
    d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export default function PathBackground({
  totalCount,
  completedCount,
  colors,
  moduleColor,
}: {
  totalCount: number;
  completedCount: number;
  colors: any;
  moduleColor?: string;
}) {
  const { colorScheme } = useTheme();
  const styles = getApprendreStyles(colorScheme);

  if (totalCount === 0) return null;

  const height = (totalCount - 1) * NODE_SPACING_Y + 100;
  const fullPath = buildPathD(totalCount);
  // Chemin "parcouru" jusqu'à la dernière leçon complétée (inclus le trajet vers la suivante)
  const traveledCount = Math.min(completedCount + 1, totalCount);
  const traveledPath = buildPathD(traveledCount);

  return (
    <Svg width={PATH_WIDTH} height={height} style={styles.pathSvg}>
      <Path d={fullPath} stroke={colors.border} strokeWidth={6} strokeLinecap="round" fill="none" />
      {completedCount > 0 && (
        <Path d={traveledPath} stroke={moduleColor || colors.primary} strokeWidth={6} strokeLinecap="round" fill="none" />
      )}
    </Svg>
  );
}