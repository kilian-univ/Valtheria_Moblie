import { StyleSheet, View } from 'react-native';

import { ValBeside } from '@/src/components/common/ValBubble';
import ValFullBody, { VAL_FACES, valPose } from '@/src/components/common/ValFullBody';
import { space } from '@/src/constants/style/Style';

const VAL_HEIGHT = 220;
const VAL_WIDTH = Math.round(VAL_HEIGHT * valPose('salut').ratio);

type ValGreetingProps = {
  title: string;
  text: string;
};

// Val en pied qui salue, sa bulle (titre + texte) collée à hauteur de bouche.
// Accueil sans compte et première visite.
export default function ValGreeting({ title, text }: ValGreetingProps) {
  return (
    <View style={styles.wrap}>
      <ValBeside
        figure={<ValFullBody pose="salut" width={VAL_WIDTH} height={0} />}
        width={VAL_WIDTH}
        height={VAL_HEIGHT}
        face={VAL_FACES.salut}
        text={text}
        title={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: space[4],
  },
});
