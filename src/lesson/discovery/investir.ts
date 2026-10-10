// Leçon découverte 3 — objectif « Commencer à investir ».
// Déclic : le temps fait plus que le montant ; placés 30 ans, 100 € par mois
// peuvent plus que doubler.
// Texte : lecons-decouvertes.md (leçon 3). Calcul : 100 € chaque fin de mois
// pendant 360 mois à 5 % par an = 81 540 €, arrondi à « environ 81 500 € ».

import { PARI_INTRO } from './shared';

export const investir = {
  title: 'La machine à intérêts',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question:
          'Tu places 100 € par mois pendant 30 ans. Si ça rapporte 5 % par an en moyenne, combien as-tu à la fin ?',
        min: 30000,
        max: 150000,
        step: 1000,
        start: 45000,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: {
        intro: {
          line: 'Plus de la moitié de cet argent, tu ne l’as jamais versée. C’est le temps qui l’a fabriquée.',
          mood: 'complice',
        },
      },
      payload: {
        value: 81500,
        unit: '€',
        label: 'En vrai, environ',
        from_screen: 0,
        lines: [
          { label: 'Tu as versé', value: 36000 },
          { label: 'Les intérêts ont ajouté environ', value: 45500, key: true },
          { label: '5 % par an est une hypothèse, rien n’est garanti en bourse', value: '', dim: true },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Tu viens de comprendre la règle la plus puissante de l’investissement.', mood: 'fier' },
        wrong: { line: 'Le montant compte, mais regarde : la moitié du résultat vient du temps.', mood: 'rassurant' },
      },
      explanation:
        'Les gains produisent à leur tour des gains : ce sont les intérêts composés. Plus c’est long, plus l’effet est fort.',
      payload: {
        question: 'Qu’est-ce qui a le plus fait grossir ces 100 € par mois ?',
        subtitle: 'Repense aux 36 000 € versés et aux 81 500 € obtenus.',
        mode: 'single',
        options: [
          { id: 'montant', text: 'Le montant versé chaque mois' },
          { id: 'temps', text: 'Le temps pendant lequel l’argent est resté placé', correct: true },
          { id: 'changer', text: 'Le fait de changer souvent de placement' },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Exactement : du temps, de la patience, et pas besoin d’être riche.', mood: 'celebrant' },
        wrong: {
          line: 'C’est une idée très répandue. Mais certaines années baissent, et on peut commencer avec de petites sommes.',
          mood: 'rassurant',
        },
      },
      explanation:
        'Sur une courte période, ça peut baisser. Sur de longues années, les à-coups se lissent, sans que rien soit jamais garanti. Et on peut commencer avec de petites sommes.',
      payload: {
        question: 'Investir en bourse, c’est…',
        mode: 'single',
        options: [
          { id: 'chaque-annee', text: 'Plus rentable qu’un livret chaque année' },
          {
            id: 'long-terme',
            text: 'Ça peut baisser certaines années, mais sur de longues périodes ça a en général rapporté plus',
            correct: true,
          },
          { id: 'dix-mille', text: 'À éviter tant qu’on n’a pas 10 000 € à placer' },
        ],
      },
    },
  ],
} as const;
