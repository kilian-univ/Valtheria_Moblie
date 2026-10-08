import { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';

import { fonts, titleLetterSpacing } from '@/src/constants/style/Style';
import ContinueButton from '../ContinueButton';
import ValBubble from '../ValBubble';
import { LessonScreenProps } from '../types';

// reveal — un grand chiffre qui s'incrémente, avec sa décomposition en dessous.
// Jamais noté : pas de bonne/mauvaise réponse, juste une révélation.
export default function RevealScreen({ screen, screenIndex, colors, onNext, isLast, onFinish, isSubmitting, onRecordAnswer }: LessonScreenProps) {
  const { payload } = screen;
  const [revealed, setRevealed] = useState(false);
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    setRevealed(false);
    displayValue !== 0 && setDisplayValue(0);
    countAnim.setValue(0);
  }, [screenIndex]);

  useEffect(() => {
    const id = countAnim.addListener(({ value }) => setDisplayValue(Math.round(value)));
    return () => countAnim.removeListener(id);
  }, []);

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    Animated.timing(countAnim, {
      toValue: payload.value,
      duration: 900,
      useNativeDriver: false,
    }).start();
    // Écran non noté : on trace quand même le passage, sans notion de "correct".
    onRecordAnswer({ screenIndex, type: 'reveal', correct: true, raw: { type: 'reveal', seen: true } });
  };

  return (
        <ScrollView style={{ flex: 1, paddingBottom: 24 }}>
        <ValBubble val={screen.val.intro} colors={colors} />

        {payload.question && (
            <Text style={{ color: colors.text, fontSize: 16, fontFamily: fonts.body, marginHorizontal: 20, marginBottom: 20, lineHeight: 22 }}>
            {payload.question}
            </Text>
        )}

        <View
            style={{
            marginHorizontal: 20,
            padding: 20,
            borderRadius: 16,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 20,
            }}
        >
            {payload.label && (
            <Text style={{ color: colors.subtitle, fontSize: 13, fontFamily: fonts.body, marginBottom: 10, textAlign: 'center' }}>
                {payload.label}
            </Text>
            )}

            <Text style={{ color: colors.gold, fontSize: 38, fontFamily: fonts.title, letterSpacing: titleLetterSpacing(38), fontVariant: ['tabular-nums'], textAlign: 'center', marginBottom: 16 }}>
            {revealed ? `${displayValue.toLocaleString('fr-FR')} ${payload.unit ?? ''}` : '?'}
            </Text>

            {payload.lines?.map((line: any, i: number) => (
            <View
                key={i}
                style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: colors.border,
                opacity: line.dim ? 0.6 : 1,
                }}
            >
                <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.body, flex: 1 }}>{line.label}</Text>
                <Text style={{ color: line.key ? colors.gold : colors.text, fontSize: 13, fontFamily: line.key ? fonts.bodySemibold : fonts.body, fontVariant: ['tabular-nums'] }}>
                {Number(line.value).toLocaleString('fr-FR')} {payload.unit ?? ''}
                </Text>
            </View>
            ))}
        </View>

        {!revealed ? (
            <ContinueButton colors={colors} onPress={handleReveal} label="Révéler" />
        ) : (
            <>
            {screen.explanation && (
                <View style={{ marginHorizontal: 20, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: colors.surface }}>
                <Text style={{ color: colors.subtitle, fontSize: 14, fontFamily: fonts.body, lineHeight: 20 }}>{screen.explanation}</Text>
                </View>
            )}
            {isLast ? (
                <ContinueButton colors={colors} onPress={onFinish} label="Terminer la leçon" loading={isSubmitting} />
            ) : (
                <ContinueButton colors={colors} onPress={onNext} />
            )}
            </>
        )}
        </ScrollView>
  );
}