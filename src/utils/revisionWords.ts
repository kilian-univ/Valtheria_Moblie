// Mots du Dictionnaire dus en révision, avec leur question, sans React :
// testable avec Node. Un mot sans question possible (dictionnaire trop
// petit) n'entre pas.

import { type DictionaryEntry, findEntry, wordQuestionScreen, wordTest } from './dictionary';
import type { WordCandidate } from './revision';
import { dueWords, type WordMemory } from './wordStates';

export function revisionWords(memory: WordMemory, entries: readonly DictionaryEntry[], today: string, seed: number): WordCandidate[] {
  const list = [...entries];
  const out: WordCandidate[] = [];
  for (const due of dueWords(memory, list.map((e) => e.term), today)) {
    const entry = findEntry(list, due.term);
    if (!entry) continue;
    const [question] = wordTest(list, entry, seed, 1);
    if (!question) continue;
    out.push({ term: entry.term, failed: due.failed, lastSeen: due.lastSeen, screen: wordQuestionScreen(question) });
  }
  return out;
}
