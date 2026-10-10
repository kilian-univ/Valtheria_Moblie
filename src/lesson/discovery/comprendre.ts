// Leçon découverte « comprendre » (objectif : comprendre où part mon argent).
// Contenu repris de la maquette validée (artboards Découverte-pari,
// Découverte-révélation, Découverte-question). Au format de GET /lessons/{id} :
// elle passe par normalizeLesson, comme une vraie leçon.

export const comprendre = {
  title: 'Ce que tu coûtes vraiment',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: { line: 'Un petit pari pour commencer. Il n’y a pas de mauvaise réponse.', mood: 'complice' } },
      payload: {
        question: 'Tu touches 1 660 € net par mois. Combien coûtes-tu à ton employeur ?',
        min: 1660,
        max: 4000,
        step: 10,
        start: 2200,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: {
        intro: { line: 'Personne ne te montre ce chiffre. C’est pourtant ce que tu vaux pour ton employeur.', mood: 'alerte' },
      },
      payload: {
        value: 3055,
        unit: '€',
        label: 'En vrai',
        from_screen: 0,
        lines: [
          { label: 'Ton salaire net', value: 1660 },
          { label: '+ tes cotisations salariales', value: 470 },
          { label: '= ton salaire brut', value: 2130 },
          { label: '+ les cotisations patronales', value: 925 },
          { label: '= ce que tu coûtes', value: 3055, key: true },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        intro: { line: 'Alors, où passe la différence ?', mood: 'complice' },
        correct: { line: 'Bien vu !', mood: 'fier' },
        wrong: { line: 'Pas tout à fait. Regarde où va l’argent.', mood: 'rassurant' },
      },
      explanation: 'Ces 1 395 € financent ta retraite, ta santé et ton chômage. Ce n’est pas perdu : c’est une protection.',
      payload: {
        question: 'Où partent les 1 395 € d’écart ?',
        mode: 'single',
        options: [
          { id: 'employeur', text: 'Dans la poche de ton employeur' },
          { id: 'cotisations', text: 'Dans les cotisations sociales : retraite, santé, chômage', correct: true },
          { id: 'impot', text: 'Dans ton impôt sur le revenu' },
        ],
      },
    },
  ],
} as const;
