import { Pressable, View } from 'react-native';
import Text from '@/src/components/common/Text';

export type CashflowEntry = {
  id: number;
  type: 'revenu' | 'depense' | 'epargne';
  nature: 'recurrent' | 'ponctuel';
  category: string | null;
  label: string;
  amount: number;
  origine: string;
  period_month: string | null;
  is_active: boolean;
  sort_order: number;
};

const AMOUNT_STYLE_KEY: Record<CashflowEntry['type'], string> = {
  revenu: 'entryAmountRevenu',
  epargne: 'entryAmountEpargne',
  depense: 'entryAmountDepense',
};

export default function EntryRow({
  entry,
  color,
  styles,
  onDelete,
}: {
  entry: CashflowEntry;
  color?: string; // couleur de catégorie, pour les dépenses
  styles: any;
  onDelete: () => void;
}) {
  return (
    <View style={entry.is_active ? styles.entryCard : styles.entryCardInactive}>
      {color && <View style={[styles.entryCategoryDot, { backgroundColor: color }]} />}

      <View style={styles.entryTextWrap}>
        <Text style={styles.entryLabel} numberOfLines={1}>
          {entry.label}
        </Text>
        <View style={styles.entryMetaRow}>
          {entry.category && <Text style={styles.entryMetaText}>{entry.category}</Text>}
          <Text style={styles.entryMetaText}>{entry.nature === 'recurrent' ? '🔁 récurrent' : '📅 ce mois-ci'}</Text>
        </View>
      </View>

      <Text style={styles[AMOUNT_STYLE_KEY[entry.type]]}>
        {entry.type === 'depense' ? '-' : '+'}
        {Number(entry.amount).toLocaleString('fr-FR')} €
      </Text>

      <Pressable onPress={onDelete} hitSlop={8} style={styles.entryDeleteBtn}>
        <Text style={styles.entryDeleteIcon}>✕</Text>
      </Pressable>
    </View>
  );
}