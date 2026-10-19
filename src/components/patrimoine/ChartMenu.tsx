import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import BottomSheet from '@/src/components/common/BottomSheet';
import Button from '@/src/components/common/Button';
import IconButton from '@/src/components/common/IconButton';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import { select } from '@/src/utils/haptics';

export type AnomalyItem = { key: string; label: string };

type Props = {
  // Relevés anormaux masqués (option mémorisée, activée par défaut)
  hide: boolean;
  onChange: (hide: boolean) => void;
  // Relevés jugés anormaux sur la période affichée
  anomalies: AnomalyItem[];
  // Supprimer un relevé anormal (courbe du patrimoine seulement) : appelé une
  // fois le menu refermé, pour ouvrir la confirmation
  onDelete?: (key: string) => void;
};

// Petit menu de la courbe : « Masquer les relevés anormaux » ou « Afficher
// tout », et la liste des relevés anormaux (un chemin pour le lecteur
// d'écran, qui ne peut pas faire d'appui long sur un point)
export default function ChartMenu({ hide, onChange, anomalies, onDelete }: Props) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const choose = (next: boolean) => {
    if (next !== hide) {
      select();
      onChange(next);
    }
  };
  const count = anomalies.length;
  const status =
    count === 0
      ? 'Aucun relevé anormal sur cette période.'
      : `${count} relevé${count > 1 ? 's' : ''} anorma${count > 1 ? 'ux' : 'l'} sur cette période${hide ? `, masqué${count > 1 ? 's' : ''}` : ''}.`;

  return (
    <>
      <IconButton
        icon="ellipsis-horizontal"
        accessibilityLabel="Options de la courbe"
        accessibilityHint={status}
        color={colors.subtitle}
        onPress={() => {
          setMounted(true);
          setOpen(true);
        }}
      />
      {mounted ? (
        <BottomSheet
          open={open}
          onRequestClose={() => setOpen(false)}
          onClosed={() => {
            setMounted(false);
            if (pending !== null && onDelete) onDelete(pending);
            setPending(null);
          }}
        >
          <View style={styles.sheet}>
            <AppText variant="title3" accessibilityRole="header">
              Options de la courbe
            </AppText>
            <View accessibilityRole="radiogroup">
              <Choice label="Masquer les relevés anormaux" caption="Un point qui s’écarte d’un coup de ses voisins, puis revient." selected={hide} onPress={() => choose(true)} />
              <Choice label="Afficher tout" selected={!hide} onPress={() => choose(false)} last />
            </View>
            <AppText variant="caption" tone="subtitle">
              {status}
            </AppText>
            {onDelete && count > 0 ? (
              <View style={styles.list}>
                <AppText variant="sectionLabel" accessibilityRole="header">
                  RELEVÉS ANORMAUX
                </AppText>
                {anomalies.map((a) => (
                  <View key={a.key} style={[styles.anomaly, { borderBottomColor: colors.border }]}>
                    <AppText variant="callout" style={styles.flex}>
                      {a.label}
                    </AppText>
                    <Button
                      label="Supprimer"
                      variant="textDanger"
                      fullWidth={false}
                      accessibilityHint={`Supprime le relevé du ${a.label}`}
                      onPress={() => {
                        setPending(a.key);
                        setOpen(false);
                      }}
                    />
                  </View>
                ))}
                <AppText variant="caption" tone="subtitle">
                  Tu peux aussi faire un appui long sur un point de la courbe.
                </AppText>
              </View>
            ) : null}
          </View>
        </BottomSheet>
      ) : null}
    </>
  );
}

function Choice({ label, caption, selected, onPress, last }: { label: string; caption?: string; selected: boolean; onPress: () => void; last?: boolean }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={caption ? `${label}. ${caption}` : label}
      style={({ pressed }) => [styles.choice, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.flex}>
        <AppText style={styles.choiceLabel}>{label}</AppText>
        {caption ? (
          <AppText variant="caption" tone="subtitle">
            {caption}
          </AppText>
        ) : null}
      </View>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? colors.gold : colors.subtitle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: space[3], paddingTop: space[2] },
  flex: { flex: 1 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 56, paddingVertical: space[2] },
  choiceLabel: { fontFamily: fonts.bodySemibold, fontSize: 16 },
  list: { gap: space[1] },
  anomaly: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth },
});
