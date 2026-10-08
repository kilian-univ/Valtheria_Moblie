import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { CHART_HEIGHT, CHART_PADDING, CHART_WIDTH, RANGES } from './chartConstants';

type HistoryPoint = { date: string; value: number; is_snapshot: boolean };

type HistoryData = {
  data: HistoryPoint[];
  range: string;
  total_invested: number;
  current_value: number;
};

export default function HistoryChart({
  colors,
  styles,
  getPortfolioHistory,
}: {
  colors: any;
  styles: any;
  getPortfolioHistory: (range: string) => Promise<HistoryData>;
}) {
  const [range, setRange] = useState('1m');
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getPortfolioHistory(range)
      .then(setHistory)
      .catch(() => setHistory(null))
      .finally(() => setIsLoading(false));
  }, [range]);

  const points = history?.data ?? [];
  const values = points.map((p) => p.value);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 1;
  const span = maxVal - minVal || 1;

  const isPositive = points.length >= 2 ? points[points.length - 1].value >= points[0].value : true;
  const lineColor = isPositive ? colors.success : colors.error;

  const coords = points.map((p, i) => {
    const x =
      points.length > 1
        ? CHART_PADDING + (i / (points.length - 1)) * (CHART_WIDTH - CHART_PADDING * 2)
        : CHART_WIDTH / 2;
    const y = CHART_PADDING + (1 - (p.value - minVal) / span) * (CHART_HEIGHT - CHART_PADDING * 2);
    return { x, y };
  });

  const pathD =
    coords.length > 0
      ? coords.reduce((acc, c, i) => acc + (i === 0 ? `M ${c.x} ${c.y}` : ` L ${c.x} ${c.y}`), '')
      : '';

  const areaD =
    coords.length > 0
      ? `${pathD} L ${coords[coords.length - 1].x} ${CHART_HEIGHT - CHART_PADDING} L ${coords[0].x} ${CHART_HEIGHT - CHART_PADDING} Z`
      : '';

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Évolution</Text>

      {isLoading ? (
        <View style={styles.chartStateBox}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : points.length === 0 ? (
        <View style={styles.chartStateBox}>
          <Text style={styles.chartEmptyText}>Pas encore de données.</Text>
        </View>
      ) : (
        <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
          {history && (
            <Line
              x1={CHART_PADDING}
              x2={CHART_WIDTH - CHART_PADDING}
              y1={CHART_PADDING + (1 - (history.total_invested - minVal) / span) * (CHART_HEIGHT - CHART_PADDING * 2)}
              y2={CHART_PADDING + (1 - (history.total_invested - minVal) / span) * (CHART_HEIGHT - CHART_PADDING * 2)}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          )}

          <Path d={areaD} fill={lineColor} fillOpacity={0.12} />
          <Path d={pathD} stroke={lineColor} strokeWidth={2} fill="none" />

          {coords.length > 0 && (
            <Circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r={4} fill={lineColor} />
          )}
        </Svg>
      )}

      <View style={styles.chartRangeRow}>
        {RANGES.map((r) => {
          const isActive = range === r.key;
          return (
            <Pressable key={r.key} onPress={() => setRange(r.key)} style={isActive ? styles.chartRangeChipActive : styles.chartRangeChip}>
              <Text style={isActive ? styles.chartRangeTextActive : styles.chartRangeText}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}