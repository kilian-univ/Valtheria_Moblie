import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { positionPayload } from '@/src/utils/patrimoine/legacyPayload';
import { Position, TYPE_ICON, TYPE_LABEL } from './types';

const TYPES: Position['type'][] = ['action', 'etf', 'crypto', 'livret', 'matiere', 'autre'];

export default function AddPositionForm({
  colors,
  styles,
  onSubmit,
  onCancel,
}: {
  colors: any;
  styles: any;
  onSubmit: (payload: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [type, setType] = useState<Position['type']>('action');
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyCurrency, setBuyCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLivret = type === 'livret';

  const canSubmit =
    ticker.trim().length > 0 &&
    name.trim().length > 0 &&
    parseFloat(quantity.replace(',', '.')) > 0 &&
    parseFloat(buyPrice.replace(',', '.')) >= 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit(
        positionPayload({ type, ticker, name, first: quantity, second: buyPrice, currency: buyCurrency })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Nouvelle position</Text>

      {/* Type */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconChipScroll}>
        <View style={styles.iconChipRow}>
          {TYPES.map((t) => (
            <Pressable key={t} onPress={() => setType(t)} style={type === t ? styles.iconChipActive : styles.iconChip}>
              <Text style={styles.iconChipIcon}>{TYPE_ICON[t]}</Text>
              <Text style={type === t ? styles.iconChipTextActive : styles.iconChipText}>{TYPE_LABEL[t]}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <TextInput
        placeholder={isLivret ? 'Nom (ex: Livret A)' : 'Ticker (ex: AAPL, BTC)'}
        placeholderTextColor={colors.subtitle}
        value={ticker}
        onChangeText={setTicker}
        autoCapitalize="characters"
        style={styles.input}
      />

      <TextInput
        placeholder={isLivret ? 'Nom complet' : 'Nom (ex: Apple Inc.)'}
        placeholderTextColor={colors.subtitle}
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <View style={styles.row}>
        <TextInput
          placeholder={isLivret ? 'Montant versé' : 'Quantité'}
          placeholderTextColor={colors.subtitle}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          style={styles.inputHalf}
        />
        <TextInput
          placeholder={isLivret ? "Taux annuel (%)" : "Prix d'achat"}
          placeholderTextColor={colors.subtitle}
          value={buyPrice}
          onChangeText={setBuyPrice}
          keyboardType="decimal-pad"
          style={styles.inputHalf}
        />
      </View>

      {!isLivret && (
        <View style={styles.toggleRow}>
          {(['EUR', 'USD'] as const).map((c) => (
            <Pressable
              key={c}
              onPress={() => setBuyCurrency(c)}
              style={buyCurrency === c ? styles.toggleOptionActive : styles.toggleOption}
            >
              <Text style={buyCurrency === c ? styles.toggleOptionTextActive : styles.toggleOptionText}>{c}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.actionsRow}>
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Annuler</Text>
        </Pressable>
        <Pressable onPress={handleSubmit} disabled={!canSubmit || isSubmitting} style={canSubmit ? styles.submitBtn : styles.submitBtnDisabled}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.onGold} size="small" />
          ) : (
            <Text style={canSubmit ? styles.submitText : styles.submitTextDisabled}>Ajouter</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}