import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { getDocumentStyles } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';
import ContinueButton from '../ContinueButton';
import { LessonScreenProps } from '../types';
import ValBubble from '../ValBubble';
import FallbackScreen from './FallbackScreen';

function formatAmount(value: number): string {
  const abs = Math.abs(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? '−' : '+'}${abs}`;
}

// document : un artefact réaliste (relevé, bulletin...). Seul le mode "select"
// (toucher les lignes demandées) est géré pour l'instant.
export default function DocumentScreen(props: LessonScreenProps) {
  if (props.screen.payload?.mode !== 'select') {
    return <FallbackScreen {...props} />;
  }
  return <SelectDocument {...props} />;
}

function SelectDocument({
  screen,
  screenIndex,
  colors,
  onNext,
  onRecordAnswer,
  isLast,
  onFinish,
  isSubmitting,
}: LessonScreenProps) {
  const { colorScheme } = useTheme();
  const styles = getDocumentStyles(colorScheme);
  const { payload } = screen;
  const lines: any[] = payload.lines ?? [];
  const columns: any[] = payload.entete?.colonnes ?? [];

  const [selected, setSelected] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const cardY = useRef(0);
  const lineY = useRef<Record<string, number>>({});

  // Le composant n'est plus remonté à chaque écran : on réinitialise à la main.
  useEffect(() => {
    setSelected([]);
    setAnswered(false);
    lineY.current = {};
  }, [screenIndex]);

  const selectableLines = lines.filter((l) => l.zone === 'ligne');
  const correctIds = selectableLines.filter((l) => l.correct).map((l) => l.id);
  const isFullyCorrect =
    selected.length === correctIds.length && correctIds.every((id) => selected.includes(id));

  const toggle = (id: string) => {
    if (answered) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleValidate = () => {
    if (selected.length === 0 || answered) return;
    setAnswered(true);

    onRecordAnswer({
      screenIndex,
      type: 'document',
      notion: screen.notion,
      correct: isFullyCorrect,
      raw: selected, // à confirmer avec API.md : ids des lignes touchées
    });

    // Correction : défile jusqu'à la première erreur, sinon la première ligne manquée.
    const firstError =
      selectableLines.find((l) => selected.includes(l.id) && !l.correct) ??
      selectableLines.find((l) => l.correct && !selected.includes(l.id));

    if (firstError) {
      const y = cardY.current + (lineY.current[firstError.id] ?? 0);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(y - 120, 0), animated: true });
      }, 120);
    }
  };

  const feedbackVal = answered
    ? isFullyCorrect
      ? screen.val.correct
      : screen.val.wrong
    : screen.val.intro;

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
      <ValBubble val={feedbackVal} colors={colors} />

      <Text style={styles.question}>{payload.question}</Text>

      <View style={styles.card} onLayout={(e) => (cardY.current = e.nativeEvent.layout.y)}>
        <Text style={styles.etablissement}>{payload.entete?.etablissement}</Text>
        <Text style={styles.metaText}>
          {[payload.entete?.numero, payload.entete?.periode].filter(Boolean).join(' · ')}
        </Text>
        {payload.entete?.iban_masque && <Text style={styles.metaText}>{payload.entete.iban_masque}</Text>}

        <View style={styles.colHeaderRow}>
          {columns.map((c) => (
            <Text
              key={c.cle}
              style={[
                styles.colHeaderText,
                c.cle === 'date' && styles.colDate,
                c.cle === 'libelle' && styles.colLabel,
                c.cle === 'montant' && styles.colAmount,
              ]}
            >
              {c.libelle}
            </Text>
          ))}
        </View>

        {lines.map((line) => {
          const isSelected = selected.includes(line.id);
          const selectable = line.zone === 'ligne';

          let variant: any = null;
          if (answered) {
            if (line.correct && isSelected) variant = styles.lineCorrect;
            else if (line.correct && !isSelected) variant = styles.lineMissed;
            else if (!line.correct && isSelected) variant = styles.lineWrong;
          } else if (isSelected) {
            variant = styles.lineSelected;
          }

          return (
            <View
              key={line.id}
              style={styles.lineWrap}
              onLayout={(e) => (lineY.current[line.id] = e.nativeEvent.layout.y)}
            >
              <Pressable
                onPress={() => selectable && toggle(line.id)}
                disabled={answered || !selectable}
                style={[styles.line, variant]}
              >
                <Text style={styles.dateText}>{line.date}</Text>
                <View style={styles.labelWrap}>
                  <Text style={styles.labelText} numberOfLines={2}>
                    {line.libelle}
                  </Text>
                  {line.sous_libelle && <Text style={styles.subLabelText}>{line.sous_libelle}</Text>}
                </View>
                <Text style={line.montant < 0 ? styles.amountNegative : styles.amountPositive}>
                  {formatAmount(line.montant)}
                </Text>
              </Pressable>

              {answered && line.revelation && (
                <View style={styles.revelationBox}>
                  <Text style={styles.revelationText}>{line.revelation}</Text>
                </View>
              )}
            </View>
          );
        })}

        {payload.solde && (
          <View style={styles.footerRow}>
            <Text style={styles.footerLabel}>{payload.solde.libelle}</Text>
            <Text style={styles.footerValue}>
              {payload.solde.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}
        {payload.a_venir && <Text style={styles.aVenirText}>À venir : {payload.a_venir}</Text>}
      </View>

      {!answered ? (
        <ContinueButton
          colors={colors}
          onPress={handleValidate}
          label="Valider"
          disabled={selected.length === 0}
        />
      ) : (
        <>
          {screen.explanation && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationText}>{screen.explanation}</Text>
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