import * as haptics from './haptics';
import { playSound } from './sound';
import {
  chestStepRate,
  COUNT_TICK_MIN_GAP,
  SOFT_GAIN,
  TICK_BLOCKED_RATE,
  TICK_COUNT_RATE,
  TICK_MIN_GAP,
  tickRate,
} from './soundRules';

// Retours d'un événement : la vibration et le son, toujours ensemble, au
// moment même du geste (règles et volumes dans utils/soundRules.ts).
export const feedback = {
  // Cran de curseur (pari, simulateur, répartir) : un peu plus aigu vers la
  // droite (ratio de 0 à 1), un son toutes les 60 ms au plus
  tick(ratio: number) {
    haptics.select();
    playSound('tick', { rate: tickRate(ratio), minGap: TICK_MIN_GAP });
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
  right() {
    haptics.success();
    playSound('correct');
  },
  wrong() {
    haptics.error();
    playSound('wrong');
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
  // Nouvelle médaille : « medal » (unlock puis combo tant qu'il n'existe pas)
  medal() {
    playSound('medal');
  },
};
