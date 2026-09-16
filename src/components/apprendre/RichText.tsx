import { Text } from 'react-native';

// Rendu simplifié du HTML léger (<em>...</em>) présent dans reveal_after, phrase, etc.
export default function RichText({ text, colors, size = 14 }: { text: string; colors: any; size?: number }) {
  const parts = text.split(/(<em>.*?<\/em>)/g);
  return (
    <Text style={{ color: colors.text, fontSize: size, lineHeight: size + 6 }}>
      {parts.map((part, i) => {
        const match = part.match(/^<em>(.*?)<\/em>$/);
        if (match) {
          return (
            <Text key={i} style={{ fontWeight: '700', color: colors.primary }}>
              {match[1]}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}