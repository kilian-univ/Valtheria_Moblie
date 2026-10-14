import * as haptics from './haptics';
import { playSound } from './sound';
import { chestStepRate } from './soundRules';

// Retours d'un événement : la vibration et le son, toujours ensemble, au
// même moment (règles dans utils/soundRules.ts). Les crans de curseur n'ont
// que la vibration (haptics.select direct).
export const feedback = {
  // Option, bouton de réponse, élément d'associer, ligne attrapée
  pick() {
    haptics.select();
    playSound('select');
  },
  right() {
    haptics.success();
    playSound('correct');
  },
  wrong() {
    haptics.error();
    playSound('wrong');
  },
  // Carte de vrai ou faux qui part (la vibration vient avec le verdict)
  swipe() {
    playSound('swipe');
  },
  // Pastille d'affilée : juste après le son de la bonne réponse
  combo() {
    playSound('combo');
  },
  lessonComplete() {
    haptics.celebrate();
    playSound('lesson-complete');
  },
  streakUp() {
    playSound('streak');
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
  unlock() {
    playSound('unlock');
  },
};
