import { StyleSheet, View } from 'react-native';

import { valAccessibilityLabel, ValSpeechBubble } from '@/src/components/common/ValBubble';
import ValFullBody from '@/src/components/common/ValFullBody';
import { space } from '@/src/constants/style/Style';

const VAL_HEIGHT = 220;

type ValGreetingProps = {
  title: string;
  text: string;
};

// Val en pied qui salue, puis sa bulle (titre + texte). Accueil sans compte
// et première visite. Sur petit écran, Val se réduit (160 au minimum).
export default function ValGreeting({ title, text }: ValGreetingProps) {
  return (
    <View style={styles.wrap} accessible accessibilityLabel={valAccessibilityLabel(text, title)}>
      <ValFullBody pose="salut" height={VAL_HEIGHT} />
      {/* key : un nouveau texte relance l'écriture mot à mot */}
      <ValSpeechBubble key={`${title}|${text}`} text={text} title={title} bordered />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[4],
    paddingTop: space[4],
  },
});
