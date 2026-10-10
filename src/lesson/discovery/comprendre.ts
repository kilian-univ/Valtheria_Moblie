// Leçon découverte 1 — objectif « Comprendre où part mon argent ».
// Déclic : tes abonnements, ajoutés un par un, pèsent plus de 1 000 € par an.
// Texte : lecons-decouvertes.md (leçon 1). Au format de GET /lessons/{id} :
// elle passe par normalizeLesson, comme une vraie leçon.

import { PARI_INTRO } from './shared';

export const comprendre = {
  title: 'Les abonnements fantômes',
  screens: [
    {
      type: 'slider',
      scored: false,
      val: { intro: PARI_INTRO },
      payload: {
        question: 'Streaming, musique, sport, forfait… Tous ces abonnements, ça fait combien par an d’après toi ?',
        min: 0,
        max: 2000,
        step: 50,
        start: 300,
        unit: '€',
      },
    },
    {
      type: 'reveal',
      scored: false,
      val: { intro: { line: 'Aucun n’est cher tout seul. C’est ensemble qu’ils pèsent.', mood: 'alerte' } },
      payload: {
        value: 1012,
        unit: '€ par an',
        label: 'En vrai',
        from_screen: 0,
        lines: [
          { label: 'Streaming vidéo', value: 13.49 },
          { label: '+ musique', value: 11.99 },
          { label: '+ salle de sport', value: 34.9 },
          { label: '+ forfait mobile', value: 15.99 },
          { label: '+ assurance téléphone', value: 7.99 },
          { label: '= total par mois', value: 84.36, key: true },
        ],
      },
    },
    {
      type: 'document',
      scored: true,
      val: {
        intro: { line: 'Indice : regarde comment chaque ligne a été payée.', mood: 'complice' },
        correct: { line: 'Exactement. Ce qui est prélevé revient.', mood: 'fier' },
        wrong: { line: 'Presque. Les prélèvements reviennent chaque mois, les achats à la carte changent.', mood: 'rassurant' },
      },
      payload: {
        question: 'Sur ce relevé, touche tout ce qui reviendra le mois prochain.',
        mode: 'select',
        entete: { etablissement: 'Ton compte courant', periode: 'Relevé d’octobre' },
        // L'aide : le moyen de paiement, sous chaque ligne
        lines: [
          { id: 'loyer', date: '01/10', libelle: 'Loyer', sous_libelle: 'Prélèvement', montant: -650, correct: true },
          { id: 'supermarche', date: '03/10', libelle: 'Supermarché', sous_libelle: 'Carte', montant: -54.2 },
          { id: 'streaming', date: '05/10', libelle: 'Streaming vidéo', sous_libelle: 'Prélèvement', montant: -13.49, correct: true },
          { id: 'restaurant', date: '06/10', libelle: 'Restaurant', sous_libelle: 'Carte', montant: -42 },
          { id: 'sport', date: '08/10', libelle: 'Salle de sport', sous_libelle: 'Prélèvement', montant: -34.9, correct: true },
          { id: 'mobile', date: '12/10', libelle: 'Forfait mobile', sous_libelle: 'Prélèvement', montant: -15.99, correct: true },
          { id: 'livraison', date: '15/10', libelle: 'Livraison de repas', sous_libelle: 'Carte', montant: -23.5 },
        ],
      },
    },
    {
      type: 'choice',
      scored: true,
      val: {
        correct: { line: 'Tu viens de faire ce que la plupart des gens ne font jamais.', mood: 'fier' },
        wrong: { line: 'Pas grave. Elle revient souvent, mais son montant change d’un mois à l’autre.', mood: 'rassurant' },
      },
      explanation:
        'Une dépense fixe revient chaque mois, au même montant ou presque. Ce sont elles qu’il faut connaître en premier.',
      payload: {
        question: 'Laquelle de ces dépenses est une dépense fixe ?',
        mode: 'single',
        options: [
          { id: 'courses', text: 'Tes courses de la semaine' },
          { id: 'electricite', text: 'Ta facture d’électricité mensualisée', correct: true },
          { id: 'essence', text: 'Tes pleins d’essence' },
        ],
      },
    },
  ],
} as const;
