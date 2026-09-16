import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { ColorScheme, getBlockStyles, palette } from '../../constants/style/Style';

// -----------------------------------------------------------------------
// Construit une regex qui matche n'importe lequel des termes du dictionnaire,
// insensible à la casse, les plus longs en premier (évite qu'un terme court
// comme "Bourse" coupe un terme plus long "Bourse de Paris").
// -----------------------------------------------------------------------
function buildTermRegex(terms: string[]): RegExp | null {
  if (!terms.length) return null;
  const escaped = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escaped.length) return null;

  const boundary = '[\\p{L}\\p{N}]';
  return new RegExp(
    `(?<!${boundary})(${escaped.join('|')})(?!${boundary})`,
    'giu'
  );
}

// -----------------------------------------------------------------------
// Découpe un fragment de texte brut en segments texte / termes cliquables
// -----------------------------------------------------------------------
function linkifyDictionaryTerms(
  text: string,
  termRegex: RegExp | null,
  colors: any,
  styles: any,
  keyPrefix: string
): React.ReactNode[] {
  if (!termRegex) return [text];

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const regex = new RegExp(termRegex.source, termRegex.flags); // instance dédiée (lastIndex isolé)

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matchedText = match[0];
    parts.push(
      <Text
        key={`${keyPrefix}-term-${key++}`}
        style={styles.termLink}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/dictionary',
            params: { term: matchedText },
          })
}
>
        {matchedText}
      </Text>
    );
    lastIndex = regex.lastIndex;
    if (match.index === regex.lastIndex) regex.lastIndex++; // garde-fou anti-boucle infinie
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// -----------------------------------------------------------------------
// Parseur inline : gère **gras**, [texte](url), et maintenant les termes
// du dictionnaire dans le texte brut restant.
// -----------------------------------------------------------------------
function parseInline(text: string, colors: any, styles: any, termRegex: RegExp | null, blockKey: number) {
  const regex = /(\*\*(.+?)\*\*)|(\[(.+?)\]\((.+?)\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const pushPlainText = (segment: string) => {
    if (!segment) return;
    parts.push(...linkifyDictionaryTerms(segment, termRegex, colors, styles, `${blockKey}-${key++}`));
  };

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      pushPlainText(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(
        <Text key={key++} style={{ fontWeight: '700' }}>
          {match[2]}
        </Text>
      );
    } else if (match[3]) {
      const label = match[4];
      const url = match[5];
      parts.push(
        <Text
          key={key++}
          style={{ color: colors.gold, textDecorationLine: 'underline' }}
          onPress={() => Linking.openURL(url).catch(() => {})}
        >
          {label}
        </Text>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    pushPlainText(text.slice(lastIndex));
  }

  return parts;
}

function calloutColor(colors: any, color?: string) {
  if (color === 'gold') return colors.gold;
  if (color === 'green') return colors.success;
  if (color === 'red') return colors.error;
  return colors.primary;
}

// -----------------------------------------------------------------------
// Quiz interactif
// -----------------------------------------------------------------------
function QuizBlock({ quiz, colorScheme }: { quiz: any; colorScheme: ColorScheme }) {
  const colors = palette[colorScheme];
  const s = getBlockStyles(colorScheme);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <View style={s.quizCard}>
      <Text style={s.quizQuestion}>{quiz.question}</Text>

      {quiz.choices.map((choice: string, i: number) => {
        const isSelected = selected === i;
        const isCorrect = i === quiz.correct;
        const showResult = selected !== null;

        let borderColor = colors.border;
        if (showResult && isCorrect) borderColor = colors.success;
        else if (showResult && isSelected && !isCorrect) borderColor = colors.error;

        return (
          <Pressable
            key={i}
            style={[s.quizChoice, { borderColor }]}
            onPress={() => selected === null && setSelected(i)}
            disabled={selected !== null}
          >
            <Text
              style={[
                s.quizChoiceText,
                showResult && isCorrect && { color: colors.success, fontWeight: '600' },
                showResult && isSelected && !isCorrect && { color: colors.error },
              ]}
            >
              {choice}
            </Text>
          </Pressable>
        );
      })}

      {selected !== null && <Text style={s.quizExplanation}>{quiz.explanation}</Text>}
    </View>
  );
}

// -----------------------------------------------------------------------
// Rendu d'un bloc individuel
// -----------------------------------------------------------------------
function renderBlock(block: any, colorScheme: ColorScheme, key: number, termRegex: RegExp | null) {
  const colors = palette[colorScheme];
  const s = getBlockStyles(colorScheme);

  switch (block.type) {
    case 'heading': {
      const sizeStyle = block.level === 2 ? s.h2 : s.h3;
      return (
        <Text key={key} style={[sizeStyle, { textAlign: block.align ?? 'left' }]}>
          {parseInline(block.content, colors, s, termRegex, key)}
        </Text>
      );
    }

    case 'paragraph':
      return (
        <Text key={key} style={[s.paragraph, { textAlign: block.align ?? 'left' }]}>
          {parseInline(block.content, colors, s, termRegex, key)}
        </Text>
      );

    case 'separator':
      return <View key={key} style={s.separator} />;

    case 'quote':
      return (
        <View key={key} style={s.quoteBlock}>
          <Text style={s.quoteText}>"{block.content}"</Text>
          {block.author && <Text style={s.quoteAuthor}>— {block.author}</Text>}
        </View>
      );

    case 'callout': {
      const color = calloutColor(colors, block.color);
      return (
        <View key={key} style={[s.calloutBlock, { borderColor: color, backgroundColor: color + '1A' }]}>
          <Text style={[s.calloutText, { color: colors.text }]}>
            {parseInline(block.content, colors, s, termRegex, key)}
          </Text>
        </View>
      );
    }

    case 'list':
      return (
        <View key={key} style={s.listBlock}>
          {block.items.map((item: string, i: number) => (
            <View key={i} style={s.listRow}>
              <Text style={s.listBullet}>•</Text>
              <Text style={s.listItemText}>{parseInline(item, colors, s, termRegex, key * 100 + i)}</Text>
            </View>
          ))}
        </View>
      );

    case 'statistic':
      return (
        <View key={key} style={s.statCard}>
          <Text style={[s.statValue, { color: calloutColor(colors, block.color) }]}>
            {block.value}
          </Text>
          <Text style={s.statLabel}>{block.label}</Text>
        </View>
      );

    case 'two_columns':
      return (
        <View key={key} style={s.twoColumns}>
          <View style={s.column}>
            {(block.left ?? []).map((b: any, i: number) => renderBlock(b, colorScheme, i, termRegex))}
          </View>
          <View style={s.column}>
            {(block.right ?? []).map((b: any, i: number) => renderBlock(b, colorScheme, i, termRegex))}
          </View>
        </View>
      );

    case 'columns_quiz': {
      const textNode = <Text style={s.paragraph}>{parseInline(block.text, colors, s, termRegex, key)}</Text>;
      const quizNode = <QuizBlock quiz={block.quiz} colorScheme={colorScheme} />;

      return (
        <View key={key} style={s.twoColumns}>
          <View style={s.column}>{block.quiz_position === 'left' ? quizNode : textNode}</View>
          <View style={s.column}>{block.quiz_position === 'left' ? textNode : quizNode}</View>
        </View>
      );
    }

    default:
      return null;
  }
}

// -----------------------------------------------------------------------
export default function BlockRenderer({
  blocks,
  colorScheme,
  dictionaryTerms = [],
}: {
  blocks: any[];
  colorScheme: ColorScheme;
  dictionaryTerms?: string[];
}) {
  const termRegex = useMemo(() => buildTermRegex(dictionaryTerms), [dictionaryTerms]);

  return <>{blocks.map((block, i) => renderBlock(block, colorScheme, i, termRegex))}</>;
}