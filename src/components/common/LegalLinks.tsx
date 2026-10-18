import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '@/src/components/common/AppText';
import { space } from '@/src/constants/style/Style';
import { LEGAL_NOTICE_URL, PRIVACY_URL, TERMS_URL } from '@/src/constants/links';
import { tap } from '@/src/utils/haptics';

const LINKS = [
  { label: 'Conditions d’utilisation', url: TERMS_URL },
  { label: 'Confidentialité', url: PRIVACY_URL },
  { label: 'Mentions légales', url: LEGAL_NOTICE_URL },
] as const;

// Les trois pages légales du site, publiques, ouvertes dans le navigateur
// intégré (connexion)
export default function LegalLinks() {
  return (
    <View style={styles.row}>
      {LINKS.map((l) => (
        <Pressable
          key={l.url}
          onPress={() => {
            tap();
            WebBrowser.openBrowserAsync(l.url).catch(() => {});
          }}
          accessibilityRole="link"
          accessibilityLabel={l.label}
          hitSlop={8}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <AppText variant="caption" tone="subtitle" style={styles.text}>
            {l.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space[4], rowGap: space[1] },
  link: { minHeight: 32, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  text: { textDecorationLine: 'underline' },
});
