import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import ListRow from '@/src/components/common/ListRow';
import TextField from '@/src/components/common/TextField';
import AssetIcon from '@/src/components/common/AssetIcon';
import { fonts, palette, space } from '@/src/constants/style/Style';
import { useApi } from '@/src/context/ApiContext';
import { useTheme } from '@/src/context/ThemeContext';
import { pickAsset, type PickedAsset } from '@/src/state/assetPick';
import { tap } from '@/src/utils/haptics';
import { TYPE_LABELS } from '@/src/utils/patrimoine/analysis';
import { FAMILY_LABELS, iconDef, suggestionsFor, type NoPriceSuggestion } from '@/src/utils/patrimoine/assetIcons';
import { MANUAL_KINDS, type ManualKind } from '@/src/utils/patrimoine/forms';
import { ASSET_TYPES, type AssetType } from '@/src/utils/patrimoine/model';

const DEBOUNCE_MS = 300;


function toPicked(raw: Record<string, unknown>): PickedAsset | null {
  const ticker = typeof raw.ticker === 'string' ? raw.ticker : '';
  if (!ticker) return null;
  const price = typeof raw.price_eur === 'number' && raw.price_eur > 0 ? raw.price_eur : null;
  return {
    ticker,
    name: typeof raw.name === 'string' && raw.name ? raw.name : ticker,
    type: ASSET_TYPES.includes(raw.type as AssetType) ? (raw.type as AssetType) : 'autre',
    logoUrl: typeof raw.logo_url === 'string' ? raw.logo_url : null,
    priceEur: price,
  };
}

// Recherche d'un actif : champ, résultats (logo, nom, symbole, type),
// placements sans cours en suggestion (Livret A, PEL, assurance vie…), et
// « Ajouter à la main » pour un actif sans cours.
// mode=pick : l'actif repart vers « Noter une opération » déjà ouvert.
export default function AssetSearchScreen() {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const insets = useSafeAreaInsets();
  const { get } = useApi();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ q: string; list: PickedAsset[]; failed: boolean } | null>(null);
  const query = q.trim();

  useEffect(() => {
    if (query.length < 2) return;
    let active = true;
    const t = setTimeout(() => {
      get(`/search?q=${encodeURIComponent(query)}`)
        .then((raw: unknown) => {
          const results = raw && typeof raw === 'object' && Array.isArray((raw as { results?: unknown }).results) ? (raw as { results: Record<string, unknown>[] }).results : [];
          if (active) setFound({ q: query, list: results.map(toPicked).filter((a): a is PickedAsset => a !== null), failed: false });
        })
        .catch(() => {
          if (active) setFound({ q: query, list: [], failed: true });
        });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, get]);

  const choose = (asset: PickedAsset) => {
    tap();
    if (mode === 'pick') {
      pickAsset(asset);
      router.back();
      return;
    }
    router.replace({
      pathname: '/outils/operation',
      params: { ticker: asset.ticker, name: asset.name, type: asset.type, logo: asset.logoUrl ?? '', price: asset.priceEur ? String(asset.priceEur) : '' },
    });
  };

  const manual = (kind: ManualKind | 'livret') => {
    tap();
    router.replace({ pathname: '/outils/operation', params: kind === 'livret' ? { type: 'livret' } : { manual: kind } });
  };

  // Placement sans cours : le formulaire s'ouvre déjà rempli, avec son icône
  const suggest = (sug: NoPriceSuggestion) => {
    tap();
    router.replace({
      pathname: '/outils/operation',
      params: sug.form === 'livret' ? { type: 'livret', ticker: sug.ticker, name: sug.name, icon: sug.icon } : { manual: 'autre', name: sug.name, icon: sug.icon },
    });
  };
  const suggestions = mode === 'pick' ? [] : suggestionsFor(query);

  const searching = query.length >= 2 && found?.q !== query;
  const list = query.length >= 2 && found?.q === query ? found.list : null;

  const row = (a: PickedAsset, i: number, total: number) => (
    <ListRow
      key={`${a.ticker}-${i}`}
      compact
      last={i === total - 1}
      title={a.name}
      subtitle={a.type === 'livret' ? 'Épargne garantie' : `${a.ticker} · ${TYPE_LABELS[a.type]}`}
      leading={<AssetIcon logoUrl={a.logoUrl} name={a.name} ticker={a.ticker} type={a.type} size={36} />}
      showChevron
      accessibilityLabel={`${a.name}, ${TYPE_LABELS[a.type]}`}
      onPress={() => choose(a)}
    />
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
        <AppText variant="bodyMedium" accessibilityRole="header" style={styles.barTitle}>
          Choisir un actif
        </AppText>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]} keyboardShouldPersistTaps="handled">
        <TextField
          label="Rechercher"
          placeholder="Nom, symbole ou ISIN (ex. Solana, CW8, LVMH)"
          value={q}
          onChangeText={setQ}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
        />

        {suggestions.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="sectionLabel" accessibilityRole="header">
              PLACEMENTS SANS COURS
            </AppText>
            <View>
              {suggestions.map((sug, i) => (
                <ListRow
                  key={sug.name}
                  compact
                  last={i === suggestions.length - 1}
                  title={sug.name}
                  subtitle={sug.fullName ?? FAMILY_LABELS[iconDef(sug.icon).family]}
                  leading={<AssetIcon logoUrl={null} name={sug.name} ticker="" type={sug.form === 'livret' ? 'livret' : 'autre'} icon={sug.icon} size={36} />}
                  showChevron
                  accessibilityLabel={`${sug.fullName ?? sug.name}, ${FAMILY_LABELS[iconDef(sug.icon).family]}`}
                  accessibilityHint="Ouvre le formulaire, déjà rempli"
                  onPress={() => suggest(sug)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {searching ? <ActivityIndicator color={colors.gold} style={styles.loading} accessibilityLabel="Recherche en cours" /> : null}

        {list ? (
          list.length > 0 ? (
            <View>{list.map((a, i) => row(a, i, list.length))}</View>
          ) : (
            <AppText variant="callout" tone="subtitle" accessibilityLiveRegion="polite">
              {found?.failed ? 'La recherche ne répond pas pour l’instant. Réessaie dans un moment, ou ajoute l’actif à la main.' : `Aucun actif trouvé pour « ${query} ».`}
            </AppText>
          )
        ) : null}

        <View style={styles.section}>
          <AppText variant="sectionLabel" accessibilityRole="header">
            AJOUTER À LA MAIN
          </AppText>
          <AppText variant="caption" tone="subtitle">
            Pour un actif sans cours : un livret, un bien immobilier, un objet de valeur.
          </AppText>
          <View style={styles.manualRow}>
            {[{ key: 'livret' as const, label: 'Livret' }, ...MANUAL_KINDS].map((k) => (
              <Pressable
                key={k.key}
                onPress={() => manual(k.key)}
                accessibilityRole="button"
                accessibilityLabel={`Ajouter à la main : ${k.label}`}
                style={({ pressed }) => [styles.manualChip, { borderColor: colors.goldLine, backgroundColor: pressed ? colors.goldSoft : 'transparent' }]}
              >
                <AppText style={[styles.manualText, { color: colors.gold }]}>{k.label}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], minHeight: 52 },
  barTitle: { fontFamily: fonts.bodyBold, fontSize: 17 },
  spacer: { width: 44 },
  content: { paddingHorizontal: space[5], gap: space[4], paddingTop: space[2] },
  loading: { marginTop: space[2] },
  section: { gap: space[2] },
  manualRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  manualChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  manualText: { fontFamily: fonts.bodySemibold, fontSize: 14 },
});
