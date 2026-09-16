import { Pressable, Text, View } from 'react-native';

// Affiche un objet de forme inconnue de façon lisible : essaie des champs
// probables (label/title/name, amount/value/montant), sinon dump JSON compact.
const LABEL_KEYS = ['label', 'title', 'name', 'category', 'ticker', 'asset'];
const VALUE_KEYS = ['amount', 'value', 'montant', 'balance', 'quantity'];
const DATE_KEYS = ['date', 'created_at', 'entry_date'];

function pick(obj: any, keys: string[]): any {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
}

export default function GenericCard({
  item,
  colors,
  onDelete,
  onPress,
}: {
  item: any;
  colors: any;
  onDelete?: () => void;
  onPress?: () => void;
}) {
  const label = pick(item, LABEL_KEYS);
  const value = pick(item, VALUE_KEYS);
  const date = pick(item, DATE_KEYS);

  const hasKnownFields = label !== null || value !== null;

  return (
    <Pressable
      onPress={onPress}
      style={{
        padding: 14,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
      }}
    >
      {hasKnownFields ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            {label !== null && (
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                {String(label)}
              </Text>
            )}
            {date !== null && (
              <Text style={{ color: colors.subtitle, fontSize: 12, marginTop: 2 }}>{String(date)}</Text>
            )}
          </View>
          {value !== null && (
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>
              {typeof value === 'number' ? value.toLocaleString('fr-FR') : String(value)}
            </Text>
          )}
        </View>
      ) : (
        <Text style={{ color: colors.subtitle, fontSize: 12, fontFamily: 'monospace' }}>
          {JSON.stringify(item)}
        </Text>
      )}

      {onDelete && (
        <Pressable onPress={onDelete} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
          <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>Supprimer</Text>
        </Pressable>
      )}
    </Pressable>
  );
}