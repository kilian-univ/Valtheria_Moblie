import { createThrottle } from './frameBatch';
import * as haptics from './haptics';
import { playSound } from './sound';
import {
  chestStepRate,
  COUNT_TICK_MIN_GAP,
  SELECT_MIN_GAP,
  SOFT_GAIN,
  SOUND_LENGTH,
  TICK_BLOCKED_RATE,
  TICK_COUNT_RATE,
  TICK_MIN_GAP,
  tickRate,
} from './soundRules';

// Vibrations des crans de curseur : une toutes les 40 ms au plus
const tickHaptic = createThrottle(SELECT_MIN_GAP, () => Date.now());

// Retours d'un événement : la vibration et le son, toujours ensemble, au
// moment même du geste (règles et volumes dans utils/soundRules.ts).
export const feedback = {
  // Cran de curseur (pari, simulateur, répartir) : un peu plus aigu vers la
  // droite (ratio de 0 à 1), un son toutes les 60 ms au plus, un seul
  // lecteur audible à la fois ; une vibration toutes les 40 ms au plus
  tick(ratio: number) {
    if (tickHaptic()) haptics.select();
    playSound('tick', { rate: tickRate(ratio), minGap: TICK_MIN_GAP, exclusive: true });
  },
  // Curseur qui bute : cran plus grave (la vibration est celle de l'écran)
  tickBlocked() {
    playSound('tick', { rate: TICK_BLOCKED_RATE });
  },
  // Chiffres du bilan qui défilent : cran plus aigu, espacé, sans vibration
  countTick() {
    playSound('tick', { rate: TICK_COUNT_RATE, minGap: COUNT_TICK_MIN_GAP });
  },
  // Option, bouton de réponse, élément d'associer, réplique, mot ajouté
  pick() {
    haptics.select();
    playSound('select');
  },
  // Tri : ligne attrapée, ligne posée
  pickup() {
    haptics.select();
    playSound('pickup');
  },
  drop() {
    haptics.tap();
    playSound('drop');
  },
  // gain < 1 : verdict adouci (feuille finale du vrai ou faux et d'associer,
  // chaque carte ou paire ayant déjà eu le sien)
  right(gain = 1) {
    haptics.success();
    playSound('correct', { gain });
  },
  wrong(gain = 1) {
    haptics.error();
    playSound('wrong', { gain });
  },
  // Associer : paire trouvée, mauvaise paire
  match() {
    haptics.success();
    playSound('match');
  },
  mismatch() {
    haptics.error();
    playSound('mismatch');
  },
  // Leçon verrouillée touchée : refus très doux (la vibration est celle du chemin)
  refuse() {
    playSound('mismatch', { gain: SOFT_GAIN });
  },
  // Écran suivant sans verdict (la vibration est celle du bouton)
  advance() {
    playSound('advance');
  },
  // Leçon ouverte depuis le chemin ou la grande carte de l'accueil : doux
  openLesson() {
    playSound('advance', { gain: SOFT_GAIN });
  },
  // Carte de vrai ou faux qui part (la vibration vient avec le verdict)
  swipe() {
    playSound('swipe');
  },
  // Carte de vrai ou faux qui arrive : très doux
  cardIn() {
    playSound('swipe', { gain: SOFT_GAIN });
  },
  // Chiffre de la révélation qui se pose (la vibration est celle du verdict)
  reveal() {
    playSound('reveal');
  },
  // Dialogue : message de Léo ou Sam qui arrive, réponse envoyée
  messageIn() {
    playSound('message-in');
  },
  messageOut() {
    haptics.select();
    playSound('message-out');
  },
  // Pastille d'affilée : juste après le son de la bonne réponse
  combo() {
    playSound('combo');
  },
  lessonComplete() {
    haptics.celebrate();
    playSound('lesson-complete');
  },
  moduleComplete() {
    haptics.celebrate();
    playSound('module-complete');
  },
  streakUp() {
    playSound('streak');
  },
  // Flamme qui s'allume à la première apparition du jour : très doux
  ignite() {
    playSound('streak', { gain: SOFT_GAIN });
  },
  // Gel de série qui sauve la série
  freeze() {
    haptics.success();
    playSound('freeze');
  },
  // Palier de rareté du coffre : un peu plus aigu à chaque palier
  chestStep(step: number) {
    haptics.select();
    playSound('chest-step', { rate: chestStepRate(step) });
  },
  chestOpen() {
    haptics.celebrate();
    playSound('chest-open');
  },
  coins() {
    playSound('coins');
  },
  // Leçon déverrouillée
  unlock() {
    playSound('unlock');
  },
  // Nouvelle médaille : « medal » (unlock puis combo tant qu'il n'existe
  // pas) ; un gel gagné en même temps : « freeze » juste après
  medal({ freeze = false }: { freeze?: boolean } = {}): ReturnType<typeof setTimeout> | null {
    playSound('medal');
    return freeze ? setTimeout(() => feedback.freeze(), SOUND_LENGTH.medal) : null;
  },
};
