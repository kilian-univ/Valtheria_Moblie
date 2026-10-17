// Leçon découverte 6 — objectif « Je découvre, on verra ».
// Déclic : tu touches 1 660 € net, tu coûtes 3 055 € à ton employeur ;
// l'écart finance surtout ta protection sociale. Chiffres de la fiche de paie
// de référence du site (fiche_de_paie_variantes.json, « novembre_standard ») :
// net payé 1 660,93, prélèvement à la source 90,81, net avant impôt 1 751,74,
// cotisations salariales 508,26, brut 2 260, patronales 795,11, coût 3 055,11.
// Arrondis à l'euro pour que chaque ligne s'additionne.
// Texte : lecons-decouvertes.md (leçon 6). Au format de GET /lessons/{id}.

import { PARI_INTRO } from './shared';

export const decouvrir = {
  title: 'Ton vrai salaire',
  // Déclic du document : carte « À RETENIR » de la fin de leçon
  takeaway: 'Tu touches 1 660 € net, tu coûtes 3 055 € à ton [employeur] ; l’écart finance surtout ta [protection sociale].',
  // Phrase d'accroche : carte de l'accueil sans compte
  hook: 'Ce que tu coûtes à ton employeur',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question: 'Tu touches 1 660 € net par mois, impôt déjà prélevé. Combien coûtes-tu à ton employeur ?',
        min: 1660,
        max: 4000,
        step: 50,
        start: 2000,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: {
        intro: { line: 'Ce chiffre est tout en bas de ta fiche de paie, et presque personne ne le regarde. C’est ce que ton travail coûte vraiment.', mood: 'alerte' },
      },
      payload: {
        value: 3055,
        unit: '€ par mois',
        start: { label: 'Ce que tu touches', value: 1660 },
        label: 'En vrai',
        from_screen: 0,
        lines: [
          { label: 'Ce que tu touches', value: 1660 },
          { label: '+ l’impôt prélevé à la source', value: 91 },
          { label: '= ton net avant impôt', value: 1751 },
          { label: '+ tes cotisations salariales', value: 509 },
          { label: '= ton salaire brut', value: 2260 },
          { label: '+ les cotisations patronales', value: 795 },
          { label: '= ce que tu coûtes', value: 3055, key: true },
        ],
      },
    },
    {
      type: 'order',
      scored: true,
      val: {
        correct: { line: 'Tu viens de lire toute une fiche de paie, de haut en bas.', mood: 'fier' },
        wrong: { line: 'Presque. Pense à tout ce qu’on retire à chaque étape.', mood: 'rassurant' },
      },
      explanation:
        'Du coût employeur, on retire les cotisations patronales : c’est le brut. Puis les cotisations salariales : c’est le net à payer. Puis le prélèvement à la source : c’est ce qui te reste.',
      payload: {
        question: 'Classe ces montants, du plus petit au plus grand.',
        axis: { start: 'Plus petit', end: 'Plus grand' },
        items: [
          { id: 'apres-impot', text: 'Ton net après prélèvement à la source' },
          { id: 'net', text: 'Ton net à payer' },
          { id: 'brut', text: 'Ton salaire brut' },
          { id: 'cout', text: 'Ton coût pour l’employeur' },
        ],
        start: ['brut', 'cout', 'apres-impot', 'net'],
      },
    },
    {
      type: 'dialogue',
      scored: true,
      val: {
        correct: { line: 'Exactement : ce n’est pas perdu, c’est une protection.', mood: 'fier' },
        wrong: { line: 'C’est ce que beaucoup pensent. En réalité, elles financent ta protection sociale.', mood: 'rassurant' },
      },
      payload: {
        character: { name: 'Sam', role: 'ton collègue' },
        messages: ['Les cotisations, franchement, c’est de l’argent perdu.'],
        replies: [
          {
            id: 'protection',
            text: 'Elles financent ma retraite, ma santé et le chômage.',
            correct: true,
            reaction: 'Ah ouais, vu comme ça… L’arrêt maladie de l’an dernier, c’était ça ?',
          },
          {
            id: 'etat',
            text: 'Oui, ça part à l’État pour rien.',
            reaction: 'Ah bon ? Pourtant, quand j’étais au chômage, j’ai bien été payé…',
          },
          {
            id: 'employeur',
            text: 'C’est mon employeur qui les garde.',
            reaction: 'Ah bon ? Pourtant, quand j’étais au chômage, j’ai bien été payé…',
          },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Tu sais maintenant lire la ligne la plus importante de ta fiche de paie.', mood: 'celebrant' },
        wrong: { line: 'Pas tout à fait. Le brut est plus haut que ce que tu touches.', mood: 'rassurant' },
      },
      explanation:
        'Le brut, c’est avant les cotisations salariales. Le net à payer, c’est après. Le prélèvement à la source est retiré ensuite.',
      payload: {
        question:
          'Sur ta fiche de paie, la ligne qui donne ton salaire après les cotisations, mais avant le prélèvement à la source, s’appelle…',
        mode: 'single',
        options: [
          { id: 'brut', text: 'Le salaire brut' },
          { id: 'net', text: 'Le net à payer avant impôt sur le revenu', correct: true },
          { id: 'cout', text: 'Le coût employeur' },
        ],
      },
    },
  ],
} as const;
