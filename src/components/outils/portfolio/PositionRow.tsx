import { Pressable, Text, View } from 'react-native';
import { Position, TYPE_ICON, TYPE_LABEL } from './types';

function formatMoney(value: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : '€';
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

export default function PositionRow({
  position,
  colors,
  styles,
  onDelete,
}: {
  position: Position;
  colors: any;
  styles: any;
  onDelete: () => void;
}) {
  const isPositive = position.gain_loss >= 0;
  const isDailyPositive = position.daily_change_pct >= 0;

  return (
    <View style={styles.positionCard}>
      <View style={styles.positionHeaderRow}>
        <View style={styles.positionIconWrap}>
          <Text style={styles.positionIconText}>{TYPE_ICON[position.type]}</Text>
        </View>

        <View style={styles.positionTitleWrap}>
          <Text style={styles.positionTicker}>{position.ticker}</Text>
          <Text style={styles.positionName} numberOfLines={1}>
            {position.name}
          </Text>
        </View>

        <Pressable onPress={onDelete} hitSlop={8}>
          <Text style={styles.positionDeleteIcon}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.positionBottomRow}>
        <View>
          <Text style={styles.positionSubline}>
            {position.quantity} × {formatMoney(position.current_price, position.buy_currency)}
          </Text>
          <Text style={styles.positionSubline}>
            {TYPE_LABEL[position.type]}
            {position.is_manual ? ' · manuel' : ''}
            {!position.is_live && !position.is_livret && !position.is_manual ? ' · prix figé' : ''}
          </Text>
        </View>

        <View style={styles.positionValueWrap}>
          <Text style={styles.positionValue}>{formatMoney(position.value, position.buy_currency)}</Text>
          <Text style={isPositive ? styles.positionGainPositive : styles.positionGainNegative}>
            {isPositive ? '+' : ''}
            {formatMoney(position.gain_loss, position.buy_currency)} ({isPositive ? '+' : ''}
            {position.gain_loss_pct.toFixed(2)}%)
          </Text>
        </View>
      </View>

      {position.is_live && position.daily_change_pct !== 0 && (
        <Text style={isDailyPositive ? styles.positionDailyPositive : styles.positionDailyNegative}>
          {isDailyPositive ? '+' : ''}
          {position.daily_change_pct.toFixed(2)}% aujourd'hui
        </Text>
      )}
    </View>
  );
}