import { Image, Text, View } from 'react-native';
import { ValLine } from './types';

const VAL_NEUTRE = require('@/assets/images/md/val-neutre.webp');
const VAL_COMPLICE = require('@/assets/images/md/val-complice.webp');

// Les humeurs du contenu dépassent les images disponibles — on mappe chacune
// sur l'image la plus proche visuellement, en attendant d'avoir les vraies.
const MOOD_IMAGE: Record<string, any> = {
  neutre: VAL_NEUTRE,
  determine: VAL_NEUTRE,
  rassurant: VAL_NEUTRE,
  complice: VAL_COMPLICE,
  fier: VAL_COMPLICE,
  celebrant: VAL_COMPLICE,
};

export default function ValBubble({ val, colors }: { val?: ValLine; colors: any }) {
  if (!val?.line) return null;
  const image = MOOD_IMAGE[val.mood] ?? VAL_NEUTRE;

  return (
    <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 20, alignItems: 'flex-start' }}>
      <Image
        source={image}
        resizeMode="cover"
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      />
      <View
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderTopLeftRadius: 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{val.line}</Text>
      </View>
    </View>
  );
}