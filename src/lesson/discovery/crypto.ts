// Leçon découverte 3 — objectif « Comprendre la crypto ».
// Déclic : la crypto peut perdre les trois quarts de sa valeur en un an ; on
// n'y met que ce qu'on peut se permettre de perdre.
// Texte : lecons-decouvertes.md (leçon 3). Au format de GET /lessons/{id}.

import { PARI_INTRO, TRUE_FALSE_QUESTION } from './shared';

export const crypto = {
  title: 'Le grand huit',
  // Déclic du document : carte « À RETENIR » de la fin de leçon
  takeaway: 'La crypto peut perdre les trois quarts de sa valeur en un an ; on n’y met que ce qu’on peut se permettre de perdre.',
  // Phrase d'accroche : carte de l'accueil sans compte
  hook: 'Ce que la crypto peut faire en un an',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question: 'En novembre 2021, un bitcoin valait environ 69 000 dollars. À ton avis, combien valait-il un an plus tard ?',
        min: 0,
        max: 100000,
        step: 1000,
        start: 60000,
        unit: 'dollars',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: { intro: { line: 'C’est ça, la crypto : des montées folles, et des descentes tout aussi folles.', mood: 'alerte' } },
      payload: {
        value: 16500,
        unit: 'dollars',
        start: { label: 'Au sommet, fin 2021', value: 69000 },
        label: 'Fin 2022, environ',
        from_screen: 0,
        lines: [
          { label: 'Une baisse d’environ', value: '76 %', key: true },
          { label: '1 000 € placés au sommet en valaient un an plus tard environ', value: '240 €' },
          { label: 'Il est remonté depuis, mais personne ne pouvait savoir quand', value: '', dim: true },
        ],
      },
    },
    {
      type: 'true_false',
      scored: true,
      val: {
        correct: { line: 'Tu en sais plus que la moitié des gens qui en achètent.', mood: 'celebrant' },
        wrong: { line: 'Rien de grave, la crypto est pleine d’idées reçues.', mood: 'rassurant' },
      },
      payload: {
        question: TRUE_FALSE_QUESTION,
        pass: 3,
        cards: [
          {
            id: 'banque',
            statement: 'Une crypto est garantie par une banque centrale.',
            answer: false,
            explanation: 'Aucune banque centrale ne garantit le bitcoin ni les autres cryptos.',
          },
          {
            id: 'faillite',
            statement: 'Si une plateforme fait faillite, tu peux perdre ce que tu y avais déposé.',
            answer: true,
            explanation: 'C’est arrivé à des millions de clients en 2022.',
          },
          {
            id: 'limite',
            statement: 'Le nombre total de bitcoins est limité à l’avance.',
            answer: true,
            explanation: 'Il n’y en aura jamais plus de 21 millions.',
          },
          {
            id: 'impot',
            statement: 'En France, les gains en crypto ne sont jamais imposés.',
            answer: false,
            explanation: 'Quand tu revends avec un gain, il est imposé.',
          },
        ],
      },
    },
    {
      type: 'dialogue',
      scored: true,
      val: {
        correct: { line: 'Exactement : jamais plus que ce que tu peux te permettre de perdre.', mood: 'fier' },
        wrong: { line: 'Personne ne sait ce qu’une crypto fera. Mets-y seulement ce que tu peux perdre.', mood: 'rassurant' },
      },
      payload: {
        character: { name: 'Léo', role: 'ton pote, très enthousiaste' },
        messages: ['J’ai trouvé une nouvelle crypto, elle va faire fois 10 cette année. Mets tout ton livret dessus !'],
        replies: [
          { id: 'tout', text: 'Grave, je mets tout.', reaction: 'Euh… et si ça fait comme en 2022 ?' },
          {
            id: 'petite',
            text: 'Je veux bien tenter, mais seulement une petite somme que je peux perdre.',
            correct: true,
            reaction: 'Pas bête. Comme ça, même si ça chute, tu dors tranquille.',
          },
          {
            id: 'credit',
            text: 'Je vais faire un crédit pour en acheter encore plus.',
            reaction: 'Euh… et si ça fait comme en 2022 ?',
          },
        ],
      },
    },
    {
      type: 'match',
      scored: true,
      val: {
        correct: { line: 'Tu parles déjà crypto couramment.', mood: 'celebrant' },
        wrong: { line: 'Ces mots reviendront souvent : tu vas vite les retenir.', mood: 'rassurant' },
      },
      payload: {
        question: 'Relie chaque mot à sa définition.',
        max_errors: 1,
        pairs: [
          { id: 'bitcoin', left: 'Bitcoin', right: 'La première crypto, créée en 2009' },
          { id: 'stablecoin', left: 'Stablecoin', right: 'Une crypto qui suit la valeur d’une monnaie, comme le dollar' },
          { id: 'blockchain', left: 'Blockchain', right: 'Le registre partagé de toutes les transactions' },
          { id: 'portefeuille', left: 'Portefeuille', right: 'L’outil qui garde tes clés d’accès à tes cryptos' },
        ],
        right_order: ['blockchain', 'portefeuille', 'bitcoin', 'stablecoin'],
      },
    },
  ],
} as const;
