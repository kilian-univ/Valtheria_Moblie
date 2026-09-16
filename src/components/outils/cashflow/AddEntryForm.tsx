import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { TabKey } from './TypeTabs';

const TYPE_LABELS: Record<TabKey, string> = {
  revenus: 'revenu',
  depenses: 'depense',
  epargne: 'epargne',
};

export default function AddEntryForm({
  activeTab,
  categories,
  revenuSuggestions,
  colors,
  styles,
  onSubmit,
  onCancel,
}: {
  activeTab: TabKey;
  categories: string[];
  revenuSuggestions: string[];
  colors: any;
  styles: any;
  onSubmit: (payload: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [nature, setNature] = useState<'recurrent' | 'ponctuel'>('recurrent');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const type = TYPE_LABELS[activeTab];
  const isDepense = type === 'depense';
  const suggestions = isDepense ? categories : type === 'revenu' ? revenuSuggestions : [];

  const canSubmit = label.trim().length > 0 && parseFloat(amount.replace(',', '.')) > 0 && (!isDepense || category);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        nature,
        label: label.trim(),
        amount: parseFloat(amount.replace(',', '.')),
        category: isDepense ? category : null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Nouvelle entrée</Text>

      <TextInput
        placeholder="Libellé (ex: Salaire, Courses...)"
        placeholderTextColor={colors.subtitle}
        value={label}
        onChangeText={setLabel}
        style={styles.input}
      />

      <TextInput
        placeholder="Montant (€)"
        placeholderTextColor={colors.subtitle}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        style={styles.input}
      />

      {suggestions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
          <View style={styles.suggestionsRow}>
            {suggestions.map((s) => {
              const isActive = isDepense ? category === s : label === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => (isDepense ? setCategory(s) : setLabel(s))}
                  style={isActive ? styles.chipActive : styles.chip}
                >
                  <Text style={isActive ? styles.chipTextActive : styles.chipText}>{s}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setNature('recurrent')}
          style={nature === 'recurrent' ? styles.toggleOptionActive : styles.toggleOption}
        >
          <Text style={nature === 'recurrent' ? styles.toggleOptionTextActive : styles.toggleOptionText}>
            🔁 Récurrent
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setNature('ponctuel')}
          style={nature === 'ponctuel' ? styles.toggleOptionActive : styles.toggleOption}
        >
          <Text style={nature === 'ponctuel' ? styles.toggleOptionTextActive : styles.toggleOptionText}>
            📅 Ce mois-ci
          </Text>
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Annuler</Text>
        </Pressable>
        <Pressable onPress={handleSubmit} disabled={!canSubmit || isSubmitting} style={canSubmit ? styles.submitBtn : styles.submitBtnDisabled}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.primaryText} size="small" />
          ) : (
            <Text style={canSubmit ? styles.submitText : styles.submitTextDisabled}>Ajouter</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}