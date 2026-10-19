import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from '@/src/components/common/AppText';
import BackButton from '@/src/components/common/BackButton';
import Button from '@/src/components/common/Button';
import ValBubble from '@/src/components/common/ValBubble';
import { fonts, space, titleLetterSpacing } from '@/src/constants/style/Style';
import { useEmailConfirmation } from '@/src/hooks/useEmailConfirmation';
import { resendLabel } from '@/src/utils/emailConfirmation';

type Props = {
  // Titre de la page demandée (« Mon patrimoine », « Mon budget »)
  title: string;
  // Ce qui attend, dans la phrase de Val (« ton patrimoine »)
  what: string;
  children: ReactNode;
};

// Fonctions liées au compte (patrimoine, budget) : après 7 jours sans
// confirmation de l'adresse, la page demande d'abord de confirmer.
// L'apprentissage, lui, reste ouvert.
export default function EmailConfirmGate({ title, what, children }: Props) {
  const c = useEmailConfirmation();
  if (!c.required) return children;
  return <EmailConfirmScreen title={title} what={what} />;
}

function EmailConfirmScreen({ title, what }: { title: string; what: string }) {
  const insets = useSafeAreaInsets();
  const c = useEmailConfirmation();
  const to = c.email ? ` à **${c.email}**` : '';
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <BackButton onBack={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}>
        <AppText accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        <View style={styles.body}>
          <ValBubble
            mood="complice"
            title="Confirme ton adresse e-mail"
            text={`Pour ouvrir ${what}, confirme d’abord ton adresse : touche le lien du courriel envoyé${to}. Les leçons, elles, restent ouvertes.`}
          />
          <Button label={c.sending ? 'Envoi…' : resendLabel(c.left)} onPress={c.resend} disabled={c.left > 0} loading={c.sending} icon="mail-outline" />
          <Button variant="secondary" label="J’ai confirmé" onPress={c.recheck} loading={c.checking} />
          {c.note ? (
            <AppText variant="callout" tone="subtitle" accessibilityLiveRegion="polite" style={styles.note}>
              {c.note}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], minHeight: 52 },
  content: { paddingHorizontal: space[4], gap: space[3] },
  title: { fontFamily: fonts.title, fontSize: 26, lineHeight: 32, letterSpacing: titleLetterSpacing(26) },
  body: { gap: space[4], paddingHorizontal: space[4], paddingVertical: space[6] },
  note: { textAlign: 'center' },
});
