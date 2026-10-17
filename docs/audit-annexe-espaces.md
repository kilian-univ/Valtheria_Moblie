# Espaces insécables : audit et correction globale

> Annexe de [l'audit complet](audit-complet.md) du 17 octobre 2026, en lecture seule. Les mentions « dossier de travail », « scratchpad » ou `extraits/…` renvoient à des fichiers temporaires de l'audit, non conservés.


*Valtheria mobile, branche `design/ui`, copie `~/Developer/Valtheria_Moblie`. Audit du 17 octobre 2026, en lecture seule.*

**Légende des extraits.** `⎵` = espace ordinaire U+0020, `⍽` = insécable U+00A0, `‿` = fine insécable U+202F, `ˑ` = fine sécable U+2009. Dans un extrait, toutes les U+0020 sont montrées par `⎵`. La colonne « Cas » dit laquelle est fautive.

**Méthode.** L'analyse porte sur les octets, pas sur l'affichage :
- un analyseur AST TypeScript (le `typescript` du projet) a relevé toutes les chaînes, tous les gabarits `${…}` et tous les textes JSX de `src/`, `app/` et `tests/`, sous leur valeur réelle (échappements résolus, blancs JSX repliés comme React Native les replie) ;
- les constantes et les classes de regex ont été relues octet par octet (python3 -I) ;
- la correction des formateurs a été **simulée sur une copie** (dans le scratchpad), avec la suite de tests complète.

## Synthèse

1. **La cause principale est une seule paire de constantes.** Dans `src/utils/patrimoine/format.ts:7-8`, `NBSP` et `NNBSP` valent toutes les deux U+0020. Pire, `grouped()` et `quantity()` remplacent l'U+202F correct produit par `Intl` par cette U+0020. Aujourd'hui, `money(27071)` renvoie `27⎵071⎵€` (mesuré). Une fois corrigé, il renvoie `27‿071⍽€`. Tout le suivi de patrimoine passe par là : `currency.ts`, `chart.ts` et 8 écrans ou composants.
2. **`src/utils/format.ts` est correct** : U+202F et U+00A0 réels, avec une normalisation de la sortie d'`Intl`. C'est la référence à suivre. Aucun `.replace` de ce fichier ne dégrade les espaces.
3. **Le dictionnaire écrase les insécables reçues** : `replace(/\s+/g, ' ')` dans `dictionary.ts:27` et `:522`, et `notebook.ts:47`. En JS, `\s` couvre U+00A0 et U+202F, donc une correction faite côté site serait perdue à l'arrivée.
4. **377 occurrences en dur** dans 94 fichiers de `src/` (aucune dans `app/`). 303 sont affichées, 63 ne servent qu'au lecteur d'écran, 11 sont des chaînes de dev ou de partage.
5. **Le contenu du site n'a quasiment aucune insécable.** On compte 40 U+00A0, toutes dans des articles (38 via `&nbsp;`), et aucune U+202F. Les fautes relevées : 2 623 montants+€, 1 664 %, 2 252 milliers, 3 807 ponctuations doubles, 90 guillemets et 2 188 unités.
6. **Il n'existe aucune normalisation générique.** `noOrphan()` (speechBubble.ts) ne traite que la fin de la bulle de Val. `AppText` ne touche pas au texte. Le prototype `frenchSpaces()` proposé plus bas a été testé sur tout le contenu de prod : il laisse 0 faute pour €, %, milliers et guillemets, et 27 deux-points collés à une balise HTML. Il ne modifie aucune balise et traite 6 003 chaînes en 51 ms sous Node.

---

## 1. Constantes et fonctions de formatage

| Fichier:ligne | Extrait (octets) | Problème | Attendu |
|---|---|---|---|
| `src/utils/patrimoine/format.ts:7` | `const NBSP = '⎵';` | U+0020 au lieu d'insécable | `'\u00A0'` |
| `src/utils/patrimoine/format.ts:8` | `const NNBSP = '⎵';` | U+0020 au lieu de fine insécable | `'\u202F'` |
| `src/utils/patrimoine/format.ts:15-17` (`grouped`) | `.format(…).replace(/[\s⎵⎵]/g, NNBSP)` | La classe contient deux U+0020, sans doute U+00A0 et U+202F perdus. Comme `\s` les couvre déjà, elle est seulement redondante. Mais le remplacement par `NNBSP` = U+0020 **transforme l'U+202F correct d'Intl en espace sécable** | `.replace(/\s/g, NNBSP)` avec NNBSP = U+202F |
| `src/utils/patrimoine/format.ts:51-53` (`quantity`) | idem | idem (`1⎵234,5⎵BTC`) | idem |
| `src/utils/patrimoine/format.ts:29, 33, 41, 45, 60, 62, 70, 72, 95, 113` | `${HIDDEN}${NBSP}${cur}`, `${grouped()}${NBSP}${cur}`, `+${NBSP}`, `${HIDDEN}${NBSP}%`, `${q}${NBSP}SOL`, `${q}${NBSP}parts`, `${minutes}${NBSP}min`, `${hours}${NBSP}h`, `${d.getDate()}${NBSP}${MONTHS…}` (×2) | Héritent de la constante fautive | corrigés par la ligne 7 |
| `src/utils/patrimoine/valTips.ts:31` | `` `${Math.round(share * 100)}${'⎵'}%` `` | U+0020 avant % (« ETF Monde pèse 40⎵% ») | `\u00A0%` |
| `src/screens/PortefeuilleScreen.tsx:35` | `` `${value.toLocaleString('fr-FR', …)}⎵${symbol}` `` | Milliers corrects (Intl), espace ordinaire avant le symbole | U+00A0, ou `formatAmount()` de `utils/format.ts` |
| `src/components/outils/portfolio/PositionRow.tsx:6` | idem | idem | idem |
| `src/screens/EpargneScreen.tsx:27` | `` `${value.toLocaleString('fr-FR', …)}⎵€` `` | idem | U+00A0 |
| `src/components/outils/cashflow/EntryRow.tsx:49` | `{Number(entry.amount).toLocaleString('fr-FR')}⎵€` | idem (JSX) | U+00A0 |
| `src/components/outils/cashflow/CategoryBreakdown.tsx:26` | `{item.total.toLocaleString('fr-FR')}⎵€` | idem | U+00A0 |
| `src/screens/CashflowScreen.tsx:129, 192` | `{Number(reste).toLocaleString('fr-FR')}⎵€` | idem | U+00A0 |
| `src/screens/PortefeuilleScreen.tsx:127, 136`, `PositionRow.tsx:59, 67` | `{….toFixed(2)}%` | Pas d'espace du tout, et point décimal anglais (« 2.35% ») | `formatVariationPercent()` |
| `src/utils/dictionary.ts:27` (`text()`) | `raw.replace(/\s+/g, '⎵')` | Écrase toute U+00A0 ou U+202F reçue du site (terme, définition, catégorie, titres de leçons liées) | `/[^\S\u00A0\u202F]+/g` |
| `src/utils/dictionary.ts:522` (`cleanDefinition`) | idem | idem | idem |
| `src/utils/notebook.ts:47` (`plainDeclic`) | idem | idem (phrases du carnet) | idem |
| `src/utils/speechBubble.ts:10-12` (`noOrphan`) | `/ ([?!:;»]+)$/` | Ne traite que la ponctuation **finale**. « Salut⎵! Moi… » garde son U+0020, et `tests/speechBubble.test.ts:13` le fige | appeler `frenchSpaces()` avant |
| `src/utils/format.ts:160` (`roundedCount`) | `replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)` | Milliers en U+00A0 plutôt qu'en U+202F. C'est insécable, donc acceptable (figé par `welcome.test.ts:22-24`) | facultatif |

**Correct (vérifié octet par octet) :**
- `src/utils/format.ts:6-7` (U+202F et U+00A0 réels) et sa ligne 29 (`[\s⍽‿]` vers U+202F) ;
- `dailyProgram.ts:141` et `HomeHeader.tsx:20` (échappements `\u00A0`) ;
- `StreakSheet.tsx:22`, `GuestStreakCard.tsx:26`, `LessonRecap.tsx:25`, `ChestReveal.tsx:52` et `speechBubble.ts:4` (U+00A0 littéral) ;
- `chart.ts:185`, `accuracy.ts`, `ModuleRow.tsx:32` (U+202F avant %), `AnalyseScreen.tsx:173`, `ActifScreen.tsx:311` et `OperationScreen.tsx:372`.

**Inoffensif, à nettoyer :** `patrimoine/goals.ts:70`, `patrimoine/preview.ts:99` et `fit.ts:36` contiennent `[\s⎵⎵…]`. Ce sont des doublons d'U+0020, sans effet puisque `\s` couvre déjà les insécables. L'intention était U+00A0 et U+202F.

**Police :** Fraunces (`Fraunces_500Medium.ttf`) **n'a pas de glyphe U+202F** (U+00A0 oui), alors qu'Inter a les deux. C'est la raison pour laquelle `BigNumber.tsx:55` et `StatBand.tsx:52` convertissent déjà U+202F en U+00A0. Toute normalisation doit le respecter pour les variantes `hero` et `title1` à `title3`.

---

## 2. Textes en dur : liste exhaustive (src/, app/)

Pour un JSX sur plusieurs lignes, le numéro désigne la ligne du texte. `${…}` remplace une expression.

Le champ « Portée » prend quatre valeurs :
- **affiché** : coupure visible possible ;
- **a11y** : `accessibilityLabel`, `spoken`, `a11y:`, lu par VoiceOver, sans coupure visuelle (correction facultative) ;
- **dev** : `DEV_STREAKS` de LoginScreen ;
- **partage** : `shareMessage`.

Les chaînes `console.*` et les styles ne sont pas comptés.

**Attendu :**
- U+202F pour les milliers et avant `? ! ;` ;
- U+00A0 avant `€ % : »` et les unités, après `«` et `n°`.

**Totaux par cas :**

| Cas | Affiché | Lecteur d’écran (a11y) | Dev / partage | Total |
|---|---|---|---|---|
| ponctuation « : » | 94 | 44 | 6 | 144 |
| nombre + unité | 58 | 12 | 5 | 75 |
| ponctuation « ? » | 69 | 0 | 0 | 69 |
| ponctuation « ! » | 39 | 3 | 0 | 42 |
| ⎵ » | 14 | 2 | 0 | 16 |
| « ⎵ | 14 | 2 | 0 | 16 |
| ponctuation « ; » | 5 | 0 | 0 | 5 |
| espace absente + point décimal | 4 | 0 | 0 | 4 |
| milliers | 3 | 0 | 0 | 3 |
| nombre + symbole (variable) | 2 | 0 | 0 | 2 |
| nombre + unité (nom) | 1 | 0 | 0 | 1 |
| **Total** | **303** | **63** | **11** | **377** |

**Hors liste :** les U+00A0 déjà présentes avant `!` (« Bravo⍽! », « 10⍽d’affilée⍽! ») sont insécables, donc conformes au besoin. La typographie stricte voudrait U+202F, mais attention à Fraunces.

#### `src/components/apprendre/end/ChestReveal.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 334 | `${…}⎵Vals${…}` | nombre + unité | U+00A0 | a11y |
| 388 | `Rareté⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/apprendre/end/EndFlowBoundary.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 49 | `Leçon⎵terminée⎵!` | ponctuation « ! » | U+202F | affiché |
| 49 | `Révision⎵terminée⎵!` | ponctuation « ! » | U+202F | affiché |

#### `src/components/apprendre/end/LessonEndFlow.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 361 | `Module⎵terminé⎵!` | ponctuation « ! » | U+202F | affiché |

#### `src/components/apprendre/end/LessonRecap.tsx` (6)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 113 | `${…}⎵XP⎵gagnés` | nombre + unité | U+00A0 | a11y |
| 125 | `Précision⎵:⎵${…}⎵%,⎵${…}` | nombre + unité | U+00A0 | a11y |
| 125 | `Précision⎵:⎵${…}⎵%,⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 136 | `Série⎵:⎵${…}⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 163 | `Leçon⎵parfaite⎵:⎵tout⎵juste⎵du⎵premier⎵co` | ponctuation « : » | U+00A0 | a11y |
| 205 | `À⎵retenir⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/apprendre/home/GuestStreakCard.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 76 | `Ta⎵série⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 79 | `${…}⎵XP` | nombre + unité | U+00A0 | affiché |

#### `src/components/apprendre/home/OtherTopicSheet.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 38 | `Un⎵autre⎵sujet⎵?` | ponctuation « ? » | U+202F | affiché |
| 52 | `${…},⎵1⎵min` | nombre + unité | U+00A0 | affiché |
| 53 | `${…},⎵${…},⎵1⎵minute${…}` | nombre + unité | U+00A0 | a11y |

#### `src/components/apprendre/home/StatPills.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 45 | `${…}⎵Vals` | nombre + unité | U+00A0 | a11y |

#### `src/components/apprendre/home/StreakSheet.tsx` (5)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 78 | `Meilleure⎵série⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 108 | `Tu⎵en⎵gagnes⎵un⎵tous⎵les⎵7⎵jours.⎵${…}` | nombre + unité | U+00A0 | a11y |
| 109 | `En⎵réserve⎵:⎵${…}.` | ponctuation « : » | U+00A0 | a11y |
| 116 | `Tu⎵en⎵gagnes⎵un⎵tous⎵les⎵7⎵jours.` | nombre + unité | U+00A0 | affiché |
| 119 | `En⎵réserve⎵:⎵${…}⎵sur⎵2` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/apprendre/home/StreakWeek.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 68 | `Cette⎵semaine⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/apprendre/home/UniverseCarousel.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 78 | `${…}⎵%⎵terminé` | nombre + unité | U+00A0 | affiché |

#### `src/components/apprendre/home/WordOfDayLine.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 21 | `Le⎵mot⎵du⎵jour⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 26 | `Le⎵mot⎵du⎵jour⎵:⎵` | ponctuation « : » | U+00A0 | affiché |
| 26 | `Le⎵mot⎵du⎵jour⎵:⎵⟨el⟩⟨el⟩` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/apprendre/module/path/LessonCard.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 85 | `Déjà⎵terminée⎵:⎵tu⎵peux⎵la⎵refaire.` | ponctuation « : » | U+00A0 | affiché |
| 96 | `Commencer⎵la⎵leçon,⎵${…}⎵XP⎵à⎵gagner` | nombre + unité | U+00A0 | a11y |

#### `src/components/apprendre/player/AnswerSheet.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 98 | `Bien⎵vu⎵!` | ponctuation « ! » | U+202F | affiché |
| 110 | `La⎵bonne⎵réponse⎵:⎵` | ponctuation « : » | U+00A0 | affiché |
| 110 | `Les⎵bonnes⎵réponses⎵:⎵` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/apprendre/player/QuitSheet.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 26 | `Quitter⎵la⎵leçon⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/components/apprendre/player/RetryIntro.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 67 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/apprendre/screens/AllocateScreen.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 115 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/apprendre/screens/FallbackScreen.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 21 | `n⎵pas⎵encore⎵géré⎵:⎵«⎵${…}⎵»` | ⎵ » | U+00A0 | affiché |
| 21 | `pe⎵d’écran⎵pas⎵encore⎵géré⎵:⎵«⎵${…}⎵»` | ponctuation « : » | U+00A0 | affiché |
| 21 | `’écran⎵pas⎵encore⎵géré⎵:⎵«⎵${…}⎵»` | « ⎵ | U+00A0 | affiché |

#### `src/components/apprendre/screens/OrderScreen.tsx` (5)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 248 | `De⎵haut⎵en⎵bas⎵:⎵de⎵«⎵${…}⎵»⎵à⎵«⎵${…}⎵»` | ponctuation « : » | U+00A0 | a11y |
| 248 | `De⎵haut⎵en⎵bas⎵:⎵de⎵«⎵${…}⎵»⎵à⎵«⎵${…}⎵»` | « ⎵ | U+00A0 | a11y |
| 248 | `De⎵haut⎵en⎵bas⎵:⎵de⎵«⎵${…}⎵»⎵à⎵«⎵${…}⎵»` | ⎵ » | U+00A0 | a11y |
| 248 | `ut⎵en⎵bas⎵:⎵de⎵«⎵${…}⎵»⎵à⎵«⎵${…}⎵»` | « ⎵ | U+00A0 | a11y |
| 248 | `⎵bas⎵:⎵de⎵«⎵${…}⎵»⎵à⎵«⎵${…}⎵»` | ⎵ » | U+00A0 | a11y |

#### `src/components/apprendre/screens/RevealScreen.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 181 | `Ton⎵estimation⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 182 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 249 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/apprendre/screens/SimulatorScreen.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 86 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 87 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 97 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/apprendre/screens/TrueFalseScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 341 | `Bien⎵vu⎵!` | ponctuation « ! » | U+202F | a11y |
| 341 | `Raté⎵!` | ponctuation « ! » | U+202F | a11y |

#### `src/components/common/MedalCelebration.tsx` (5)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 52 | `${…}⎵jours⎵d’affilée.⎵Continue⎵comm` | nombre + unité | U+00A0 | affiché |
| 61 | `Nouvelle⎵médaille⎵:⎵${…}⎵!⎵${…}` | ponctuation « ! » | U+202F | a11y |
| 61 | `Nouvelle⎵médaille⎵:⎵${…}⎵!⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 63 | `Nouvelle⎵médaille⎵:⎵${…}⎵!` | ponctuation « ! » | U+202F | affiché |
| 63 | `Nouvelle⎵médaille⎵:⎵${…}⎵!` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/common/ValBubble.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 243 | `Val⎵:⎵${…}${…}` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/dictionary/DictionaryStates.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 33 | `Rien⎵pour⎵«⎵${…}⎵».` | « ⎵ | U+00A0 | affiché |
| 33 | `Rien⎵pour⎵«⎵${…}⎵».` | ⎵ » | U+00A0 | affiché |
| 38 | `Tu⎵voulais⎵peut-être⎵dire⎵:` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/dictionary/NeighborButtons.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 39 | `Mot⎵${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/dictionary/WordOfDayCard.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 30 | `Mot⎵du⎵jour⎵:⎵${…}.⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/onboarding/ReminderPicker.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 62 | `Autre⎵heure⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/outils/cashflow/CategoryBreakdown.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 26 | `${…}⎵€` | nombre + unité | U+00A0 | affiché |

#### `src/components/outils/cashflow/EntryRow.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 49 | `${…}${…}⎵€` | nombre + unité | U+00A0 | affiché |

#### `src/components/outils/portfolio/PositionRow.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 6 | `${value.toLocaleString('fr-FR',⎵…)}⎵${symbol}` | nombre + symbole (variable) | U+00A0 | affiché |
| 59 | `{position.gain_loss_pct.toFixed(2)}%)` | espace absente + point décimal | U+00A0 (+ virgule) | affiché |
| 67 | `{position.daily_change_pct.toFixed(2)}% aujourd'hui` | espace absente + point décimal | U+00A0 (+ virgule) | affiché |

#### `src/components/patrimoine/AllocationBar.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 30 | `${…}⎵${…}⎵%` | nombre + unité | U+00A0 | affiché |
| 32 | `Répartition⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 43 | `{s.label}⎵{s.percent}{'⎵'}%` | nombre + unité | U+00A0 | affiché |

#### `src/components/patrimoine/DateField.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 59 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 95 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/patrimoine/Figure.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 30 | `${…}⎵:⎵${…}${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/patrimoine/GoalsSection.tsx` (6)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 52 | `Épargne⎵de⎵précaution⎵:⎵${…}${…}` | ponctuation « : » | U+00A0 | a11y |
| 53 | `Épargne⎵de⎵précaution⎵:⎵indique⎵tes⎵dépenses⎵men` | ponctuation « : » | U+00A0 | a11y |
| 65 | `${…}⎵mois⎵de⎵dépenses` | nombre + unité | U+00A0 | affiché |
| 71 | `ue⎵tes⎵dépenses⎵mensuelles⎵:⎵on⎵suit⎵ton⎵coussin⎵de⎵3` | ponctuation « : » | U+00A0 | affiché |
| 71 | `⎵suit⎵ton⎵coussin⎵de⎵3⎵à⎵6⎵mois,⎵compté⎵sur⎵tes⎵actifs⎵s` | nombre + unité | U+00A0 | affiché |
| 83 | `Objectif⎵${…}⎵:⎵${…}${…}${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/patrimoine/HelpTerm.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 28 | `Définition⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/patrimoine/PositionLine.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 44 | `+⎵${…}⎵%⎵par⎵an` | nombre + unité | U+00A0 | affiché |

#### `src/components/patrimoine/ValRemark.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 26 | `Val⎵:⎵${…}⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/profile/AccessTile.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 45 | `` {`⎵${unit}`}  (« 12⎵déclics ») `` | nombre + unité (nom) | U+00A0 | affiché |

#### `src/components/profile/MedalsCard.tsx` (4)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 44 | `Médailles⎵de⎵série⎵:⎵${…}⎵sur⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 44 | `l’instant,⎵la⎵première⎵à⎵${…}⎵jours` | nombre + unité | U+00A0 | a11y |
| 57 | `Première⎵médaille⎵à⎵${…}⎵jours` | nombre + unité | U+00A0 | affiché |
| 68 | `Défis⎵de⎵précision⎵:⎵${…}⎵sur⎵${…}.⎵${…}.⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/components/profile/PatrimoineStepsCard.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 37 | `.⎵Régularité⎵:⎵${…}.⎵Étapes⎵:⎵${…}⎵sur⎵${…}.⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 37 | `Ton⎵patrimoine.⎵Régularité⎵:⎵${…}.⎵Étapes⎵:⎵${…}⎵sur⎵⟦x` | ponctuation « : » | U+00A0 | a11y |
| 53 | `Régularité⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |

#### `src/components/profile/StatBand.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 34 | `Série⎵:⎵${…}⎵${…},⎵record⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 41 | `${…}⎵XP` | nombre + unité | U+00A0 | a11y |
| 44 | `${…}⎵Vals` | nombre + unité | U+00A0 | a11y |

#### `src/components/profile/WeekChart.tsx` (4)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 25 | `Cette⎵semaine⎵:⎵aucune⎵leçon⎵pour⎵l’inst` | ponctuation « : » | U+00A0 | affiché |
| 26 | `Cette⎵semaine⎵:⎵${…}⎵XP,⎵${…}⎵${…}.⎵${…}.` | nombre + unité | U+00A0 | affiché |
| 26 | `Cette⎵semaine⎵:⎵${…}⎵XP,⎵${…}⎵${…}.⎵${…}.` | ponctuation « : » | U+00A0 | affiché |
| 28 | `${…}⎵${…}⎵XP` | nombre + unité | U+00A0 | affiché |

#### `src/constants/valLines.ts` (7)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 8 | `nd⎵là⎵où⎵tu⎵t’étais⎵arrêté⎵?⎵Je⎵t’ai⎵gardé⎵ta⎵place.` | ponctuation « ? » | U+202F | affiché |
| 9 | `t⎵pour⎵avancer.⎵On⎵s’y⎵met⎵?` | ponctuation « ? » | U+202F | affiché |
| 11 | `Prêt⎵pour⎵la⎵suite⎵?⎵Je⎵suis⎵à⎵côté⎵si⎵besoin` | ponctuation « ? » | U+202F | affiché |
| 16 | `Dernière⎵ligne⎵droite⎵:⎵**une⎵leçon**⎵et⎵ce⎵modu` | ponctuation « : » | U+00A0 | affiché |
| 21 | `Bienvenue⎵!` | ponctuation « ! » | U+202F | affiché |
| 26 | `Bien⎵joué⎵!` | ponctuation « ! » | U+202F | affiché |
| 34 | `Tout⎵est⎵terminé⎵!` | ponctuation « ! » | U+202F | affiché |

#### `src/hooks/useLearningData.ts` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 23 | `ible⎵de⎵charger⎵tes⎵leçons⎵:⎵pas⎵de⎵connexion⎵interne` | ponctuation « : » | U+00A0 | affiché |
| 24 | `ible⎵de⎵charger⎵tes⎵leçons⎵:⎵le⎵serveur⎵ne⎵répond⎵pas` | ponctuation « : » | U+00A0 | affiché |

#### `src/hooks/useLessonLauncher.ts` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 29 | `ossible⎵de⎵lancer⎵la⎵leçon⎵:⎵pas⎵de⎵connexion⎵interne` | ponctuation « : » | U+00A0 | affiché |
| 30 | `ossible⎵de⎵lancer⎵la⎵leçon⎵:⎵le⎵serveur⎵ne⎵répond⎵pas` | ponctuation « : » | U+00A0 | affiché |

#### `src/lesson/discovery/crypto.ts` (8)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 11 | `ts⎵de⎵sa⎵[valeur]⎵en⎵un⎵an⎵;⎵on⎵n’y⎵met⎵que⎵ce⎵qu’on⎵` | ponctuation « ; » | U+202F | affiché |
| 20 | `⎵valait-il⎵un⎵an⎵plus⎵tard⎵?` | ponctuation « ? » | U+202F | affiché |
| 31 | `C’est⎵ça,⎵la⎵crypto⎵:⎵des⎵montées⎵folles,⎵et⎵d` | ponctuation « : » | U+00A0 | affiché |
| 87 | `Exactement⎵:⎵jamais⎵plus⎵que⎵ce⎵que⎵t` | ponctuation « : » | U+00A0 | affiché |
| 92 | `ets⎵tout⎵ton⎵livret⎵dessus⎵!` | ponctuation « ! » | U+202F | affiché |
| 94 | `t⎵si⎵ça⎵fait⎵comme⎵en⎵2022⎵?` | ponctuation « ? » | U+202F | affiché |
| 104 | `t⎵si⎵ça⎵fait⎵comme⎵en⎵2022⎵?` | ponctuation « ? » | U+202F | affiché |
| 114 | `s⎵mots⎵reviendront⎵souvent⎵:⎵tu⎵vas⎵vite⎵les⎵retenir.` | ponctuation « : » | U+00A0 | affiché |

#### `src/lesson/discovery/decouvrir.ts` (13)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 12 | `660⎵€⎵net,⎵tu⎵coûtes⎵3⎵055⎵€⎵à⎵ton⎵[employeur]⎵;⎵l’éc` | nombre + unité | U+00A0 | affiché |
| 12 | `Tu⎵touches⎵1⎵660⎵€⎵net,⎵tu⎵coûtes⎵3⎵055⎵€` | milliers | U+202F | affiché |
| 12 | `Tu⎵touches⎵1⎵660⎵€⎵net,⎵tu⎵coûtes⎵3⎵055⎵€⎵à` | nombre + unité | U+00A0 | affiché |
| 12 | `s⎵1⎵660⎵€⎵net,⎵tu⎵coûtes⎵3⎵055⎵€⎵à⎵ton⎵[employeur]⎵;⎵l’` | milliers | U+202F | affiché |
| 12 | `⎵3⎵055⎵€⎵à⎵ton⎵[employeur]⎵;⎵l’écart⎵finance⎵ta⎵[prot` | ponctuation « ; » | U+202F | affiché |
| 21 | `⎵coûtes-tu⎵à⎵ton⎵employeur⎵?` | ponctuation « ? » | U+202F | affiché |
| 58 | `les⎵cotisations⎵patronales⎵:⎵c’est⎵le⎵brut.⎵Puis⎵les⎵` | ponctuation « : » | U+00A0 | affiché |
| 58 | `les⎵cotisations⎵salariales⎵:⎵c’est⎵le⎵net⎵à⎵payer.⎵Pu` | ponctuation « : » | U+00A0 | affiché |
| 58 | `le⎵prélèvement⎵à⎵la⎵source⎵:⎵c’est⎵ce⎵qui⎵te⎵reste.` | ponctuation « : » | U+00A0 | affiché |
| 75 | `Exactement⎵:⎵ce⎵n’est⎵pas⎵perdu,⎵c’es` | ponctuation « : » | U+00A0 | affiché |
| 86 | `e⎵l’an⎵dernier,⎵c’était⎵ça⎵?` | ponctuation « ? » | U+202F | affiché |
| 91 | `Ah⎵bon⎵?⎵Pourtant,⎵quand⎵j’étais⎵` | ponctuation « ? » | U+202F | affiché |
| 96 | `Ah⎵bon⎵?⎵Pourtant,⎵quand⎵j’étais⎵` | ponctuation « ? » | U+202F | affiché |

#### `src/lesson/discovery/epargner.ts` (14)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 12 | `ourant⎵perd⎵de⎵la⎵[valeur]⎵;⎵mis⎵de⎵côté⎵en⎵[premier]` | ponctuation « ; » | U+202F | affiché |
| 22 | `ec,⎵en⎵euros⎵d’aujourd’hui⎵?` | ponctuation « ? » | U+202F | affiché |
| 22 | `⎵compte⎵courant⎵pendant⎵10⎵ans.⎵Avec⎵2⍽%⎵d’inflation⎵pa` | nombre + unité | U+00A0 | affiché |
| 52 | `e,⎵c’est⎵{epargne_montant}⎵€⎵par⎵mois⎵et⎵{epargne_mon` | nombre + unité | U+00A0 | affiché |
| 52 | `is⎵et⎵{epargne_montant*12}⎵€⎵dans⎵un⎵an,⎵sans⎵y⎵pense` | nombre + unité | U+00A0 | affiché |
| 52 | `{epargne}⎵%⎵de⎵ta⎵paie,⎵c’est⎵{eparg` | nombre + unité | U+00A0 | affiché |
| 55 | `ie⎵d’en⎵garder⎵au⎵moins⎵10⎵%.⎵Tes⎵envies⎵s’en⎵remettr` | nombre + unité | U+00A0 | affiché |
| 58 | `Ta⎵paie⎵de⎵1⎵800⎵€⎵vient⎵de⎵tomber.⎵Quell` | milliers | U+202F | affiché |
| 58 | `Ta⎵paie⎵de⎵1⎵800⎵€⎵vient⎵de⎵tomber.⎵Quelle⎵` | nombre + unité | U+00A0 | affiché |
| 58 | `uelle⎵part⎵pour⎵chaque⎵pot⎵?` | ponctuation « ? » | U+202F | affiché |
| 69 | `Dans⎵un⎵an⎵:⎵{epargne_montant*12}⎵€` | ponctuation « : » | U+00A0 | affiché |
| 69 | `⎵an⎵:⎵{epargne_montant*12}⎵€` | nombre + unité | U+00A0 | affiché |
| 76 | `ie⎵d’en⎵garder⎵au⎵moins⎵10⎵%.⎵Tes⎵envies⎵s’en⎵remettr` | nombre + unité | U+00A0 | affiché |
| 125 | `y⎵penser,⎵le⎵plus⎵efficace⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/lesson/discovery/impots.ts` (7)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 12 | `ait⎵jamais⎵perdre⎵d’argent⎵;⎵seule⎵la⎵partie⎵au-dessu` | ponctuation « ; » | U+202F | affiché |
| 22 | `,⎵et⎵tu⎵changes⎵de⎵tranche⎵:⎵de⎵11⍽%⎵à⎵30⍽%.⎵De⎵combi` | ponctuation « : » | U+00A0 | affiché |
| 22 | `combien⎵augmente⎵ton⎵impôt⎵?` | ponctuation « ? » | U+202F | affiché |
| 23 | `Barème⎵simplifié⎵:⎵0⍽%⎵jusqu’à⎵11‿000⍽€,⎵11` | ponctuation « : » | U+00A0 | affiché |
| 36 | `⎵tranche.⎵C’est⎵une⎵erreur⎵:⎵tu⎵gardes⎵toujours⎵la⎵pl` | ponctuation « : » | U+00A0 | affiché |
| 115 | `C’est⎵le⎵piège⎵classique⎵:⎵les⎵30⍽%⎵ne⎵touchent⎵que` | ponctuation « : » | U+00A0 | affiché |
| 120 | `moyen⎵est-il⎵aussi⎵de⎵30⍽%⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/lesson/discovery/index.ts` (7)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 67 | `Mettre⎵de⎵l’argent⎵de⎵côté⎵?` | ponctuation « ? » | U+202F | affiché |
| 72 | `aire⎵travailler⎵ton⎵argent⎵?` | ponctuation « ? » | U+202F | affiché |
| 77 | `ypto,⎵sans⎵le⎵bruit⎵autour⎵?` | ponctuation « ? » | U+202F | affiché |
| 82 | `Un⎵logement⎵à⎵toi,⎵un⎵jour⎵?` | ponctuation « ? » | U+202F | affiché |
| 87 | `Payer⎵moins⎵d’impôts⎵?` | ponctuation « ? » | U+202F | affiché |
| 92 | `Tu⎵découvres⎵?⎵Parfait,` | ponctuation « ? » | U+202F | affiché |
| 107 | `x⟧.⎵Moi,⎵c’est⎵Val.⎵Et⎵toi⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/lesson/discovery/investir.ts` (12)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 11 | `e⎵le⎵[montant]⎵;⎵placés⎵30⎵ans,⎵100⎵€⎵par⎵mois⎵peuvent⎵` | nombre + unité | U+00A0 | affiché |
| 11 | `fait⎵plus⎵que⎵le⎵[montant]⎵;⎵placés⎵30⎵ans,⎵100⎵€⎵par` | ponctuation « ; » | U+202F | affiché |
| 11 | `tant]⎵;⎵placés⎵30⎵ans,⎵100⎵€⎵par⎵mois⎵peuvent⎵plus⎵qu` | nombre + unité | U+00A0 | affiché |
| 13 | `Ce⎵que⎵le⎵temps⎵fait⎵à⎵100⎵€⎵par⎵mois` | nombre + unité | U+00A0 | affiché |
| 20 | `ne,⎵combien⎵as-tu⎵à⎵la⎵fin⎵?` | ponctuation « ? » | U+202F | affiché |
| 20 | `⎵100⍽€⎵par⎵mois⎵pendant⎵30⎵ans.⎵Si⎵ça⎵rapporte⎵5⍽%⎵par⎵` | nombre + unité | U+00A0 | affiché |
| 54 | `ais⎵plus⎵tôt,⎵ou⎵plus⎵tard⎵?⎵Bouge⎵le⎵curseur.` | ponctuation « ? » | U+202F | affiché |
| 55 | `100⍽€⎵par⎵mois⎵jusqu’à⎵65⎵ans,⎵à⎵5⍽%⎵par⎵an.` | nombre + unité | U+00A0 | affiché |
| 65 | `Ton⎵capital⎵à⎵65⎵ans` | nombre + unité | U+00A0 | affiché |
| 71 | `onc⎵plus⎵d’effort⎵par⎵mois⎵:⎵mais⎵ça⎵reste⎵utile.` | ponctuation « : » | U+00A0 | affiché |
| 101 | `Exactement⎵:⎵ne⎵pas⎵mettre⎵tous⎵ses⎵œ` | ponctuation « : » | U+00A0 | affiché |
| 110 | `risqué⎵qu’une⎵seule⎵action⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/lesson/discovery/logement.ts` (4)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 20 | `bien⎵rembourses-tu⎵en⎵tout⎵?` | ponctuation « ? » | U+202F | affiché |
| 20 | `empruntes⎵200‿000⍽€⎵sur⎵25⎵ans⎵à⎵3,5⍽%.⎵Combien⎵rembour` | nombre + unité | U+00A0 | affiché |
| 50 | `empruntais⎵moins⎵longtemps⎵?⎵Bouge⎵le⎵curseur.` | ponctuation « ? » | U+202F | affiché |
| 96 | `au⎵total,⎵le⎵plus⎵efficace⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/lesson/discovery/shared.ts` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 4 | `uvaise⎵réponse.⎵À⎵ton⎵avis⎵?` | ponctuation « ? » | U+202F | affiché |
| 7 | `Vrai⎵ou⎵faux⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/lesson/interactive.ts` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 31 | `Excellent⎵!` | ponctuation « ! » | U+202F | affiché |

#### `src/screens/ApprendreDetailScreen.tsx` (4)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 103 | `ssible⎵de⎵charger⎵la⎵leçon⎵:⎵pas⎵de⎵connexion⎵interne` | ponctuation « : » | U+00A0 | affiché |
| 104 | `ssible⎵de⎵charger⎵la⎵leçon⎵:⎵le⎵serveur⎵ne⎵répond⎵pas` | ponctuation « : » | U+00A0 | affiché |
| 109 | `ble⎵d’enregistrer⎵ta⎵leçon⎵:⎵pas⎵de⎵connexion⎵interne` | ponctuation « : » | U+00A0 | affiché |
| 110 | `ble⎵d’enregistrer⎵ta⎵leçon⎵:⎵le⎵serveur⎵ne⎵répond⎵pas` | ponctuation « : » | U+00A0 | affiché |

#### `src/screens/ArticleDetailScreen.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 133 | `⎵·⎵${…}⎵min⎵de⎵lecture` | nombre + unité | U+00A0 | affiché |

#### `src/screens/CashflowScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 129 | `${…}${…}⎵€` | nombre + unité | U+00A0 | affiché |
| 192 | `${…}⎵€` | nombre + unité | U+00A0 | affiché |

#### `src/screens/EpargneScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 27 | `${…}⎵€` | nombre + unité | U+00A0 | affiché |
| 101 | `🎉⎵Objectif${…}⎵atteint${…}⎵!` | ponctuation « ! » | U+202F | affiché |

#### `src/screens/PortefeuilleScreen.tsx` (3)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 35 | `${value.toLocaleString('fr-FR',⎵…)}⎵${symbol}` | nombre + symbole (variable) | U+00A0 | affiché |
| 127 | `{portfolio.gain_loss_pct.toFixed(2)}%)` | espace absente + point décimal | U+00A0 (+ virgule) | affiché |
| 136 | `{portfolio.daily_change_pct.toFixed(2)}%` | espace absente + point décimal | U+00A0 (+ virgule) | affiché |

#### `src/screens/apprendre/ModuleScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 376 | `Module⎵terminé⎵!⎵À⎵toi⎵de⎵choisir⎵la⎵suit` | ponctuation « ! » | U+202F | affiché |
| 385 | `Leçon⎵suivante⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |

#### `src/screens/dictionary/DictionaryHomeScreen.tsx` (4)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 60 | `de⎵charger⎵le⎵dictionnaire⎵:⎵pas⎵de⎵connexion⎵interne` | ponctuation « : » | U+00A0 | affiché |
| 61 | `de⎵charger⎵le⎵dictionnaire⎵:⎵le⎵serveur⎵ne⎵répond⎵pas` | ponctuation « : » | U+00A0 | affiché |
| 67 | `Aucun⎵mot⎵vu⎵en⎵attente⎵:⎵ouvre⎵une⎵fiche⎵pour⎵com` | ponctuation « : » | U+00A0 | affiché |
| 68 | `ot⎵maîtrisé⎵pour⎵l’instant⎵:⎵réussis⎵le⎵test⎵d’une⎵fi` | ponctuation « : » | U+00A0 | affiché |

#### `src/screens/dictionary/TermScreen.tsx` (7)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 51 | `État⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 78 | `es⎵déjà.⎵Envie⎵de⎵vérifier⎵?` | ponctuation « ? » | U+202F | affiché |
| 79 | `e.⎵Réussis⎵et⎵il⎵passe⎵à⎵«⎵Maîtrisé⎵».` | « ⎵ | U+00A0 | affiché |
| 79 | `⎵et⎵il⎵passe⎵à⎵«⎵Maîtrisé⎵».` | ⎵ » | U+00A0 | affiché |
| 196 | `de⎵charger⎵le⎵dictionnaire⎵:⎵pas⎵de⎵connexion⎵interne` | ponctuation « : » | U+00A0 | affiché |
| 197 | `de⎵charger⎵le⎵dictionnaire⎵:⎵le⎵serveur⎵ne⎵répond⎵pas` | ponctuation « : » | U+00A0 | affiché |
| 239 | `En⎵clair⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |

#### `src/screens/dictionary/WordTestScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 114 | `Bien⎵vu⎵!` | ponctuation « ! » | U+202F | affiché |
| 140 | `Un⎵autre⎵mot⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/screens/header/LoginScreen.tsx` (12)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 128 | `Mot⎵de⎵passe⎵oublié⎵?` | ponctuation « ? » | U+202F | affiché |
| 202 | `Pas⎵encore⎵de⎵compte⎵?⎵Créer⎵un⎵compte` | ponctuation « ? » | U+202F | affiché |
| 216 | `Série⎵:⎵2⎵jours` | nombre + unité | U+00A0 | dev |
| 216 | `Série⎵:⎵2⎵jours` | ponctuation « : » | U+00A0 | dev |
| 217 | `Série⎵:⎵6⎵jours` | nombre + unité | U+00A0 | dev |
| 217 | `Série⎵:⎵6⎵jours` | ponctuation « : » | U+00A0 | dev |
| 218 | `Série⎵:⎵29⎵jours` | nombre + unité | U+00A0 | dev |
| 218 | `Série⎵:⎵29⎵jours` | ponctuation « : » | U+00A0 | dev |
| 219 | `Série⎵:⎵99⎵jours` | nombre + unité | U+00A0 | dev |
| 219 | `Série⎵:⎵99⎵jours` | ponctuation « : » | U+00A0 | dev |
| 220 | `Série⎵:⎵29⎵jours,⎵gel⎵utilisé⎵hi` | ponctuation « : » | U+00A0 | dev |
| 220 | `Série⎵:⎵29⎵jours,⎵gel⎵utilisé⎵hier` | nombre + unité | U+00A0 | dev |

#### `src/screens/header/ProfilScreen.tsx` (7)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 126 | `·⎵encore⎵${…}⎵XP` | nombre + unité | U+00A0 | affiché |
| 158 | `Prochaine⎵leçon⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 163 | `Leçon⎵découverte⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 173 | `Univers⎵terminé⎵!` | ponctuation « ! » | U+202F | affiché |
| 175 | `Univers⎵suivant⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 200 | `Ton⎵carnet⎵:⎵${…}⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 224 | `Mots⎵du⎵Dictionnaire⎵:⎵${…}${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/screens/header/SettingsScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 132 | `⎵est⎵définitive.⎵Confirmer⎵?` | ponctuation « ? » | U+202F | affiché |
| 250 | `e⎵passe,⎵passe⎵par⎵le⎵site⎵:⎵tu⎵y⎵reçois⎵un⎵lien⎵par⎵` | ponctuation « : » | U+00A0 | affiché |

#### `src/screens/notebook/NotebookScreen.tsx` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 63 | `.⎵Leçon⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/screens/onboarding/DiscoveryEndScreen.tsx` (5)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 318 | `Sujets⎵découverts⎵:⎵${…}⎵sur⎵6` | ponctuation « : » | U+00A0 | a11y |
| 350 | `La⎵suite⎵:⎵univers⎵${…}.⎵Des⎵vraies⎵` | ponctuation « : » | U+00A0 | a11y |
| 353 | `La⎵suite⎵:⎵univers⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 390 | `te⎵semaine,⎵jours⎵de⎵série⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 406 | `Les⎵six⎵sujets,⎵découverts⎵!` | ponctuation « ! » | U+202F | affiché |

#### `src/screens/onboarding/FirstNameScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 18 | `Salut⎵!⎵Moi,⎵c’est⎵Val.⎵Et⎵toi,⎵` | ponctuation « ! » | U+202F | affiché |
| 18 | `⎵toi,⎵comment⎵je⎵t’appelle⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/screens/onboarding/GuestReminderScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 59 | `⎵te⎵fais⎵signe⎵chaque⎵jour⎵?` | ponctuation « ? » | U+202F | affiché |
| 61 | `⎵veux-tu⎵qu’on⎵se⎵retrouve⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/screens/onboarding/SignupScreen.tsx` (4)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 280 | `Moi,⎵c’est⎵Val.⎵Et⎵toi⎵?` | ponctuation « ? » | U+202F | affiché |
| 283 | `Comment⎵Val⎵doit⎵t’appeler⎵?` | ponctuation « ? » | U+202F | affiché |
| 369 | `⎵te⎵fais⎵signe⎵chaque⎵jour⎵?` | ponctuation « ? » | U+202F | affiché |
| 371 | `⎵veux-tu⎵qu’on⎵se⎵retrouve⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/screens/onboarding/WelcomeScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 30 | `Salut⎵!⎵Moi,⎵c’est⎵Val.` | ponctuation « ! » | U+202F | affiché |
| 125 | `udget,⎵épargne,⎵placements⎵:⎵je⎵t’explique⎵tout,⎵simp` | ponctuation « : » | U+00A0 | affiché |

#### `src/screens/patrimoine/ActifScreen.tsx` (6)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 172 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 195 | `Cours⎵figé⎵:⎵la⎵source⎵ne⎵répond⎵pas,` | ponctuation « : » | U+00A0 | affiché |
| 202 | `Ta⎵position⎵:⎵${…}${…}${…}` | ponctuation « : » | U+00A0 | a11y |
| 239 | `ton⎵prix⎵de⎵revient⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 317 | `Intérêts⎵sur⎵1⎵an` | nombre + unité | U+00A0 | affiché |
| 387 | `Supprimer⎵cette⎵opération⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/screens/patrimoine/AnalyseScreen.tsx` (5)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 92 | `${…}⎵${…}⎵%` | nombre + unité | U+00A0 | a11y |
| 139 | `${…}⎵:⎵${…}⎵%` | nombre + unité | U+00A0 | a11y |
| 139 | `${…}⎵:⎵${…}⎵%` | ponctuation « : » | U+00A0 | a11y |
| 143 | `${…}⎵%` | nombre + unité | U+00A0 | affiché |
| 165 | `Intérêts⎵de⎵${…}⎵:⎵${…}⎵sur⎵un⎵an,⎵estimés` | ponctuation « : » | U+00A0 | a11y |

#### `src/screens/patrimoine/AssetSearchScreen.tsx` (4)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 166 | `Aucun⎵actif⎵trouvé⎵pour⎵«⎵${…}⎵».` | « ⎵ | U+00A0 | affiché |
| 166 | `n⎵actif⎵trouvé⎵pour⎵«⎵${…}⎵».` | ⎵ » | U+00A0 | affiché |
| 176 | `Pour⎵un⎵actif⎵sans⎵cours⎵:⎵un⎵livret,⎵un⎵bien⎵immob` | ponctuation « : » | U+00A0 | affiché |
| 184 | `Ajouter⎵à⎵la⎵main⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |

#### `src/screens/patrimoine/ObjectifScreen.tsx` (4)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 21 | `${…}⎵mois` | nombre + unité | U+00A0 | affiché |
| 95 | `ur⎵les⎵imprévus⎵:⎵de⎵3⎵à⎵6⎵mois⎵de⎵dépenses,⎵gardés⎵sur⎵` | nombre + unité | U+00A0 | affiché |
| 95 | `⎵coussin⎵pour⎵les⎵imprévus⎵:⎵de⎵3⎵à⎵6⎵mois⎵de⎵dépense` | ponctuation « : » | U+00A0 | affiché |
| 109 | `en⎵de⎵mois⎵veux-tu⎵couvrir⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/screens/patrimoine/OperationScreen.tsx` (6)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 281 | `Actif⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 372 | `Taux⎵réglementé⎵:⎵${…}⍽%⎵(${…}),⎵mis⎵à⎵jour⎵` | ponctuation « : » | U+00A0 | affiché |
| 373 | `Taux⎵réglementé⎵:⎵le⎵taux⎵en⎵vigueur⎵est⎵a` | ponctuation « : » | U+00A0 | affiché |
| 396 | `Sa⎵valeur⎵n’a⎵pas⎵de⎵cours⎵:⎵tu⎵la⎵mets⎵à⎵jour⎵à⎵la⎵m` | ponctuation « : » | U+00A0 | affiché |
| 441 | `${…}⎵:⎵${…}${…}` | ponctuation « : » | U+00A0 | a11y |
| 474 | `Indicatif⎵:⎵l’impôt⎵se⎵calcule⎵autre` | ponctuation « : » | U+00A0 | affiché |

#### `src/screens/patrimoine/PatrimoineScreen.tsx` (7)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 274 | `Régularité⎵:⎵${…}⎵avec⎵au⎵moins⎵un⎵ver` | ponctuation « : » | U+00A0 | a11y |
| 279 | `Valeur⎵totale⎵:⎵${…}` | ponctuation « : » | U+00A0 | a11y |
| 316 | `montant⎵investi⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 317 | `0⎵%` | nombre + unité | U+00A0 | affiché |
| 317 | `0⎵€` | nombre + unité | U+00A0 | affiché |
| 438 | `Supprimer⎵ce⎵relevé⎵?` | ponctuation « ? » | U+202F | affiché |
| 441 | `Relevé⎵du⎵${…}⎵:⎵${…}.⎵Il⎵disparaît⎵de⎵ta⎵` | ponctuation « : » | U+00A0 | affiché |

#### `src/screens/revision/RevisionScreen.tsx` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 339 | `⎵d’enregistrer⎵ta⎵révision⎵:⎵pas⎵de⎵connexion⎵interne` | ponctuation « : » | U+00A0 | affiché |
| 340 | `⎵d’enregistrer⎵ta⎵révision⎵:⎵le⎵serveur⎵ne⎵répond⎵pas` | ponctuation « : » | U+00A0 | affiché |

#### `src/utils/accuracy.ts` (8)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 17 | `En⎵feu⎵!` | ponctuation « ! » | U+202F | affiché |
| 18 | `Inarrêtable⎵!` | ponctuation « ! » | U+202F | affiché |
| 28 | `${…}⎵d’affilée,⎵inarrêtable⎵!` | ponctuation « ! » | U+202F | affiché |
| 29 | `x⟧⎵d’affilée,⎵tu⎵es⎵en⎵feu⎵!` | ponctuation « ! » | U+202F | affiché |
| 30 | `${…}⎵d’affilée⎵!⎵Continue⎵!` | ponctuation « ! » | U+202F | affiché |
| 170 | `Meilleure⎵série⎵:⎵${…}⎵d’affilée` | ponctuation « : » | U+00A0 | affiché |
| 175 | `Ta⎵meilleure⎵série⎵:⎵${…}⎵d’affilée` | ponctuation « : » | U+00A0 | affiché |
| 180 | `Nouveau⎵défi⎵:⎵${…}${…}!` | ponctuation « : » | U+00A0 | affiché |

#### `src/utils/dailyProgram.ts` (6)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 113 | `Révision⎵faite,⎵à⎵demain⎵!` | ponctuation « ! » | U+202F | affiché |
| 114 | `Tu⎵es⎵à⎵jour⎵!⎵Une⎵petite⎵révision⎵?` | ponctuation « ! » | U+202F | affiché |
| 114 | `jour⎵!⎵Une⎵petite⎵révision⎵?` | ponctuation « ? » | U+202F | affiché |
| 118 | `Journée⎵terminée.⎵À⎵demain⎵!` | ponctuation « ! » | U+202F | affiché |
| 119 | `Bien⎵joué⎵!⎵Plus⎵que⎵la⎵révision.` | ponctuation « ! » | U+202F | affiché |
| 120 | `n⎵faite.⎵Plus⎵que⎵la⎵leçon⎵!` | ponctuation « ! » | U+202F | affiché |

#### `src/utils/dictionary.ts` (12)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 236 | `${…}⎵:⎵${…}⎵(Valtheria)` | ponctuation « : » | U+00A0 | partage |
| 807 | `respond⎵à⎵cette⎵définition⎵?` | ponctuation « ? » | U+202F | affiché |
| 826 | `Que⎵veut⎵dire⎵${…}⎵?` | ponctuation « ? » | U+202F | affiché |
| 919 | `${…}⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 928 | `Que⎵signifie⎵${…}⎵?` | ponctuation « ? » | U+202F | affiché |
| 928 | `Que⎵signifie⎵**${…}**⎵?` | ponctuation « ? » | U+202F | affiché |
| 938 | `Que⎵veut⎵dire⎵${…}⎵?` | ponctuation « ? » | U+202F | affiché |
| 938 | `Que⎵veut⎵dire⎵**${…}**⎵?` | ponctuation « ? » | U+202F | affiché |
| 953 | `respond⎵à⎵cette⎵définition⎵?` | ponctuation « ? » | U+202F | affiché |
| 954 | `«⎵${…}⎵»` | « ⎵ | U+00A0 | affiché |
| 954 | `«⎵${…}⎵»` | ⎵ » | U+00A0 | affiché |
| 997 | `Bien⎵vu⎵!` | ponctuation « ! » | U+202F | affiché |

#### `src/utils/discoveryHome.ts` (6)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 130 | `Tu⎵as⎵fait⎵le⎵tour⎵!` | ponctuation « ! » | U+202F | affiché |
| 133 | `⎵ce⎵sont⎵les⎵vrais⎵modules⎵:⎵ils⎵t’attendent⎵dès⎵l’ou` | ponctuation « : » | U+00A0 | affiché |
| 311 | `Enchanté,⎵${…}⎵!⎵Qu’est-ce⎵qui⎵t’amène⎵?` | ponctuation « ! » | U+202F | affiché |
| 311 | `Enchanté⎵!⎵Qu’est-ce⎵qui⎵t’amène⎵?` | ponctuation « ! » | U+202F | affiché |
| 311 | `té⎵!⎵Qu’est-ce⎵qui⎵t’amène⎵?` | ponctuation « ? » | U+202F | affiché |
| 311 | `x⟧⎵!⎵Qu’est-ce⎵qui⎵t’amène⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/utils/lessonPlayer.ts` (4)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 72 | `Vrai⎵ou⎵faux⎵?⎵Touche⎵un⎵bouton,⎵ou⎵bal` | ponctuation « ? » | U+202F | affiché |
| 131 | `Tout⎵près⎵:⎵tu⎵étais⎵à⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 342 | `jours⎵de⎵série⎵!` | ponctuation « ! » | U+202F | affiché |
| 342 | `jour⎵de⎵série⎵!` | ponctuation « ! » | U+202F | affiché |

#### `src/utils/notebook.ts` (6)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 239 | `Et⎵celui-ci⎵?` | ponctuation « ? » | U+202F | affiché |
| 239 | `Un⎵mot⎵manque.⎵Lequel⎵?` | ponctuation « ? » | U+202F | affiché |
| 243 | `«⎵${…}⎵»` | « ⎵ | U+00A0 | affiché |
| 243 | `«⎵${…}⎵»` | ⎵ » | U+00A0 | affiché |
| 243 | `«⎵${…}⎵»⎵(${…})` | « ⎵ | U+00A0 | affiché |
| 243 | `«⎵${…}⎵»⎵(${…})` | ⎵ » | U+00A0 | affiché |

#### `src/utils/patrimoine/celebration.ts` (9)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 29 | `teint⎵ton⎵objectif⎵«⎵${…}⎵»⎵!` | ponctuation « ! » | U+202F | affiché |
| 29 | `tteint⎵ton⎵objectif⎵«⎵${…}⎵»⎵!` | ⎵ » | U+00A0 | affiché |
| 29 | `⎵as⎵atteint⎵ton⎵objectif⎵«⎵${…}⎵»⎵!` | « ⎵ | U+00A0 | affiché |
| 30 | `u⎵as⎵atteint⎵${…}⎵objectifs⎵!` | ponctuation « ! » | U+202F | affiché |
| 31 | `Nouvelle⎵étape⎵:⎵${…}⎵!` | ponctuation « ! » | U+202F | affiché |
| 31 | `Nouvelle⎵étape⎵:⎵${…}⎵!` | ponctuation « : » | U+00A0 | affiché |
| 32 | `s⎵étapes⎵de⎵ton⎵patrimoine⎵!` | ponctuation « ! » | U+202F | affiché |
| 35 | `Objectif⎵atteint⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |
| 36 | `Étape⎵:⎵${…}` | ponctuation « : » | U+00A0 | affiché |

#### `src/utils/patrimoine/chart.ts` (12)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 54 | `sur⎵1⎵jour` | nombre + unité | U+00A0 | affiché |
| 55 | `sur⎵1⎵semaine` | nombre + unité | U+00A0 | affiché |
| 56 | `sur⎵1⎵mois` | nombre + unité | U+00A0 | affiché |
| 58 | `sur⎵1⎵an` | nombre + unité | U+00A0 | affiché |
| 59 | `sur⎵5⎵ans` | nombre + unité | U+00A0 | affiché |
| 65 | `1⎵an` | nombre + unité | U+00A0 | affiché |
| 65 | `1⎵jour` | nombre + unité | U+00A0 | affiché |
| 65 | `1⎵mois` | nombre + unité | U+00A0 | affiché |
| 65 | `1⎵semaine` | nombre + unité | U+00A0 | affiché |
| 65 | `5⎵ans` | nombre + unité | U+00A0 | affiché |
| 276 | `${…}⎵:⎵pas⎵encore⎵assez⎵de⎵poin` | ponctuation « : » | U+00A0 | affiché |
| 283 | `Cours⎵de⎵${…}⎵:⎵pas⎵encore⎵assez⎵de⎵poin` | ponctuation « : » | U+00A0 | affiché |

#### `src/utils/patrimoine/preview.ts` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 73 | `tiens⎵pas⎵encore⎵cet⎵actif⎵:⎵commence⎵par⎵noter⎵un⎵ac` | ponctuation « : » | U+00A0 | affiché |

#### `src/utils/patrimoine/regularity.ts` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 61 | `${…}⎵mois⎵d’affilée` | nombre + unité | U+00A0 | affiché |
| 61 | `1⎵mois⎵de⎵versement` | nombre + unité | U+00A0 | affiché |

#### `src/utils/patrimoine/valTips.ts` (16)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 23 | `Revoir⎵«⎵Ton⎵coussin⎵de⎵sécurité⎵»` | « ⎵ | U+00A0 | affiché |
| 23 | `«⎵Ton⎵coussin⎵de⎵sécurité⎵»` | ⎵ » | U+00A0 | affiché |
| 24 | `Revoir⎵«⎵Combien⎵garder⎵de⎵côté⎵?⎵` | « ⎵ | U+00A0 | affiché |
| 24 | `r⎵«⎵Combien⎵garder⎵de⎵côté⎵?⎵»` | ponctuation « ? » | U+202F | affiché |
| 24 | `⎵Combien⎵garder⎵de⎵côté⎵?⎵»` | ⎵ » | U+00A0 | affiché |
| 25 | `Revoir⎵«⎵Diversifier⎵»` | « ⎵ | U+00A0 | affiché |
| 25 | `Revoir⎵«⎵Diversifier⎵»` | ⎵ » | U+00A0 | affiché |
| 26 | `Revoir⎵«⎵Diversifier⎵»` | « ⎵ | U+00A0 | affiché |
| 26 | `Revoir⎵«⎵Diversifier⎵»` | ⎵ » | U+00A0 | affiché |
| 27 | `Revoir⎵«⎵Choisir⎵son⎵horizon⎵»` | « ⎵ | U+00A0 | affiché |
| 27 | `oir⎵«⎵Choisir⎵son⎵horizon⎵»` | ⎵ » | U+00A0 | affiché |
| 28 | `Revoir⎵«⎵Ton⎵premier⎵plan⎵»` | « ⎵ | U+00A0 | affiché |
| 28 | `Revoir⎵«⎵Ton⎵premier⎵plan⎵»` | ⎵ » | U+00A0 | affiché |
| 31 | `${Math.round(share * 100)}${'⎵'}%` | nombre + unité | U+00A0 | affiché |
| 57 | `ègle⎵courante,⎵c’est⎵3⎵à⎵6⎵mois.` | nombre + unité | U+00A0 | affiché |
| 80 | `patrimoine.⎵C’est⎵beaucoup⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/utils/profile.ts` (1)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 37 | `Niveau⎵${…},⎵encore⎵${…}⎵XP⎵avant⎵le⎵niveau⎵${…}` | nombre + unité | U+00A0 | affiché |

#### `src/utils/reminder.ts` (6)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 32 | `te⎵pour⎵une⎵nouvelle⎵leçon⎵?⎵Ta⎵série⎵compte⎵sur⎵toi.` | ponctuation « ? » | U+202F | affiché |
| 33 | `Petite⎵pause⎵argent⎵?` | ponctuation « ? » | U+202F | affiché |
| 34 | `On⎵continue⎵?⎵Chaque⎵jour⎵compte⎵pour⎵` | ponctuation « ? » | U+202F | affiché |
| 35 | `ù⎵part⎵vraiment⎵ton⎵argent⎵?⎵Viens⎵voir.` | ponctuation « ? » | U+202F | affiché |
| 36 | `Garde⎵le⎵rythme⎵:⎵une⎵leçon⎵et⎵c’est⎵réglé` | ponctuation « : » | U+00A0 | affiché |
| 49 | `d.⎵On⎵le⎵découvre⎵ensemble⎵?` | ponctuation « ? » | U+202F | affiché |

#### `src/utils/revision.ts` (2)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 308 | `Journée⎵terminée.⎵À⎵demain⎵!` | ponctuation « ! » | U+202F | affiché |
| 468 | `rd’hui.⎵Prochaine⎵révision⎵:⎵${…}.` | ponctuation « : » | U+00A0 | affiché |

#### `src/utils/universes.ts` (11)

| Ligne | Extrait | Cas | Attendu | Portée |
|---|---|---|---|---|
| 102 | `ro,⎵on⎵pose⎵les⎵fondations⎵:⎵coussin⎵de⎵sécurité,⎵det` | ponctuation « : » | U+00A0 | affiché |
| 103 | `La⎵bourse⎵sans⎵jargon⎵:⎵on⎵va⎵comprendre⎵ce⎵que⎵` | ponctuation « : » | U+00A0 | affiché |
| 104 | `Bitcoin⎵et⎵compagnie⎵:⎵on⎵regarde⎵ce⎵qui⎵brille` | ponctuation « : » | U+00A0 | affiché |
| 105 | `Acheter,⎵louer,⎵investir⎵:⎵on⎵fait⎵les⎵comptes⎵avan` | ponctuation « : » | U+00A0 | affiché |
| 109 | `Lancer⎵ton⎵activité⎵?⎵On⎵parle⎵statut,⎵chiffre` | ponctuation « ? » | U+202F | affiché |
| 110 | `Ton⎵argent⎵du⎵quotidien⎵:⎵on⎵reprend⎵la⎵main⎵sur⎵t` | ponctuation « : » | U+00A0 | affiché |
| 111 | `Louer,⎵déménager,⎵choisir⎵:⎵on⎵fait⎵le⎵tour⎵avant⎵qu` | ponctuation « : » | U+00A0 | affiché |
| 114 | `nflation,⎵taux,⎵croissance⎵:⎵on⎵prend⎵de⎵la⎵hauteur⎵p` | ponctuation « : » | U+00A0 | affiché |
| 115 | `prix⎵montent⎵et⎵descendent⎵?⎵On⎵ouvre⎵le⎵capot⎵des⎵ma` | ponctuation « ? » | U+202F | affiché |
| 116 | `Bilan,⎵marges,⎵dettes⎵:⎵on⎵apprend⎵à⎵juger⎵une⎵e` | ponctuation « : » | U+00A0 | affiché |
| 121 | `Bienvenue⎵!⎵${…}` | ponctuation « ! » | U+202F | affiché |

**Total : 377 occurrences dans 94 fichiers** (303 affichées, 63 a11y, 10 dev, 1 partage). Aucune dans `app/`, qui ne contient que des routes.

---

## 3. Textes reçus du site : affichage et normalisation existante

| Source (API) | Point d'entrée (normalisation) | Affichage | Composant | Insécables traitées ? |
|---|---|---|---|---|
| Leçons `GET /lessons/{id}` (`questions_data`) | `src/lesson/normalize.ts` : `plainText()` l.60 (retire `<em>`/`<strong>`, trim), `valText()` l.72 (vers `**gras**`), `unmark()` l.67 | `components/apprendre/screens/*` (Choice, TrueFalse, Order, Match, Allocate, Slider, Simulator, Reveal, Document, Dialogue, Fallback), `player/AnswerSheet`, `ValSays` vers **`common/ValBubble.tsx`** | `AppText` pour les écrans ; **`Text` natif** dans ValBubble (l.442-458) | Non. Seul `noOrphan()` (ValBubble l.377) colle le dernier mot et la ponctuation finale |
| Gabarits de leçon `{epargne} %` | `src/lesson/interactive.ts:171` `fillTemplate()` | AllocateScreen l.94 et 153 | AppText | Non : « {epargne_montant*12}⎵€ » reste U+0020 |
| Dictionnaire (`term`, `definition`, `plain`, `category`) | `src/utils/dictionary.ts:41` `normalizeEntry()` via `text()` l.25, puis `cleanDefinition()` l.521 | `TermScreen.tsx:232`, `WordTestScreen.tsx:130`, `TermRow.tsx:82`, `WordOfDayCard.tsx:41`, `WordOfDayLine.tsx` | AppText, et `Text` natif (TermRow, WordOfDayLine) | **Détruites** (`\s+` remplacé par `' '`) |
| Articles (`content`, JSON `{blocks}`) | `src/screens/ArticleDetailScreen.tsx:52-61` (simple `JSON.parse`) | `src/components/article/BlockRenderer.tsx` : `parseInline()` / `linkifyDictionaryTerms()` ; citation `"{block.content}"` sans parseInline ; `stat.value` / `label` | **`Text` natif** | Non |
| Carnet (déclics des leçons) | `src/utils/notebook.ts:46` `plainDeclic()` | NotebookScreen, NotebookQuizScreen | AppText / ValBubble | **Détruites** (`\s+`) |

- **Couche API :** `src/context/ApiContext.tsx`. Il ne faut **pas** y placer la normalisation, car ce fichier ne doit pas être modifié.
- **Normalisations existantes :**
  - `noOrphan()` (fin de bulle) ;
  - `digits()` de `utils/format.ts` (nombres produits par l'app) ;
  - `BigNumber` et `StatBand` (U+202F vers U+00A0) ;
  - `grade.parseNumber()`, en lecture seulement.
  - Aucune fonction générique.
- **`AppText.tsx` est une simple enveloppe de `Text`.** **24 fichiers** importent encore `Text` de `react-native` : ArticleDetail, Epargne, Portefeuille, Outils, Cashflow, CategoryBreakdown, HistoryChart, TypeTabs, AddPositionForm, PositionRow, ProgressRing, StreakMedal, StreakFlame, AlphabetIndex, TermRow, EntryRow, BlockRenderer, AddEntryForm, topbar/header, StreakWeek, StatPills, HomeHeader et WordOfDayLine, plus AppText lui-même. ValBubble l'importe aussi, via un import multiligne.
- **À noter :**
  - 57 chaînes d'articles contiennent du HTML brut, avec des attributs `style=…`, et 38 `&nbsp;` littéraux. `BlockRenderer` les afficherait tels quels. C'est un autre problème, mais `frenchSpaces()` doit passer **après** un éventuel retrait du HTML.
  - Hors ponctuation finale, `ValBubble.parseWords()` (l.227) découpe sur `\S+\s*`, et `\s` inclut U+00A0. Les morceaux restent des `Text` imbriqués d'un seul paragraphe, donc l'insécable tient.

---

## 4. Contenu du site (relevé prod)

**Périmètre du relevé `prod-contenu.json` :**
- 4 leçons (100 à 103 : « Le mois où tout tombe en même temps », « Combien tu dois avoir de côté », « Où mettre ce coussin », « Quand tu l'as entamé ») ;
- 203 termes ;
- 264 articles publiés sur 281.

Cela fait 6 534 chaînes, champs `title`/`excerpt` compris. Le HTML a été retiré et les entités décodées avant comptage.

**Insécables présentes :** 40 U+00A0, toutes dans des articles : 38 viennent de `&nbsp;`, 2 sont littérales. Aucune U+202F, aucune dans les leçons ni dans les termes.

| Cas | Leçons | Termes | Articles | Total | Objets touchés | Déjà corrects |
|---|---|---|---|---|---|---|
| Montant + € (`900⎵€`, `50⎵euros`) | 56 | 0 | 2 567 | **2 623** | 4 leçons, 188 articles | 2 |
| Pourcentage (`20⎵%`) | 11 | 1 | 1 652 | **1 664** | 3 leçons, 1 terme, 143 articles | 0 |
| Milliers (`3⎵000`) | 26 | 148 | 2 078 | **2 252** | 4 leçons, 69 termes, 230 articles | 0 |
| Ponctuation double (hors titres et extraits : `:` 3 055, `?` 394, `!` 84, `;` 5) | 50 | 224 | 3 533 | **3 807** | 4 leçons, 187 termes, 262 articles | 2 |
| Guillemets (`«⎵…⎵»`) | 8 | 46 | 36 | **90** | 3 leçons, 21 termes, 11 articles | 0 |
| Unités (ans, mois, jours, h, min, points, x) | 8 | 59 | 2 121 | **2 188** | 3 leçons, 42 termes, 238 articles | — |
| *Hors périmètre :* montant collé (`4⎵600€/an`, `20%`) | 0 | 400 | 1 867 | 2 267 | 117 termes, 128 articles | — |

**Exemples réels (5 par type)**

*Montant + €*
1. Leçon 100, `val.intro.line` : « …même panne de scooter à 900⎵€. Deux issues. »
2. Leçon 101, `options[].text` : « Un mois de dépenses, soit 1⎵000⎵€ »
3. Leçon 102, `payload.question` : « Pour 5⎵000⎵€ laissés un an, lequel ra… »
4. Article `pea` : « …ce plafond est fixé à 150⎵000⎵€ (données 2026). »
5. Article `l-or-ne-baisse-jamais-la-realite-est-plus-nuancee` : « …se négocie autour de **126⎵000⎵€** aujourd'hui. »

*Pourcentage*
1. Leçon 100, `payload.question` : « 3 000 € placés. Le marché a perdu 20⎵%. »
2. Leçon 101, `options[].text` : « …500 € de ton prêt étudiant à 1⎵% »
3. Leçon 103, `payload.question` : « …le marché vient de faire +12⎵% en un mois. »
4. Terme `CTO`, `full_definition` : « Les gains sont soumis au PFU à 30⎵%. »
5. Article `ce-qui-change-pour-votre-portefeuille-en-avril-2026` : « …ce plafond est désormais fixé à 4⎵% pour un prêt à taux fixe »

*Milliers*
1. Leçon 100, `payload.question` : « Nora et Tom ont chacun 3⎵000 € placés. »
2. Leçon 103, `payload.question` : « Ton coussin était à 1⎵000 €, l'imprévu t'en a pris 8… »
3. Terme `Action`, `full_definition` : « Exemple : Si Apple vaut 3⎵000 milliards$ et émet 16 mi… »
4. Article `ce-qui-change-pour-votre-portefeuille-en-avril-2026` : « …et près de 700⎵000 foyers supplémentaires… »
5. Article `guerre-au-moyen-orient-le-detroit-dormuz-rouvre-mais-la-paix-reste-fragile-d37843` : « …un niveau record de 3⎵737 points en mars… »

*Ponctuation double*
1. Leçon 100, `explanation` : « Tom a payé avec son livret⎵: ses placements n'ont pas… »
2. Leçon 102, `payload.question` : « Ton argent de sécurité doit d'abord être⎵: »
3. Leçon 100, `payload.question` : « Pourquoi récupérer 900 € lui coûte plus de 900 € de ce qu'elle avait investi⎵? »
4. Terme `Action` (et 184 autres sur 203) : « Exemple⎵: Si Apple vaut… »
5. Article `les-volte-face-de-donald-trump-strategie-calculee-ou-imprevisibilite-politique` : « …stratégie calculée ou imprévisibilité politique⎵? » ; article `bitcoin-comprendre-la-star-des-cryptos-en-2026` : « …sans passer par ta banque⎵! »

*Guillemets*
1. Leçon 100, `val.wrong.line` : « La fausse, c'est «⎵vendre pour sauver ce qui… »
2. Leçon 101, `val.wrong.line` : « Le piège, c'est «⎵un mois de salaire⎵». »
3. Leçon 102, `val.wrong.line` : « Le livret «⎵boosté⎵» n'en est pas un »
4. Terme `Blockchain`, `definition` : « Chaque «⎵bloc⎵» de transactions… »
5. Article `le-29-avril-2026-a-wall-street-quatre-geants-de-la-tech-publient-leurs-resultats` : « …surnommé les «⎵Sept Magnifiques⎵» »

*Unités*
1. Leçon 100, `payload.subtitle` : « …ta paie tombe dans 9⎵jours. Compte : 80 €. »
2. Leçon 101, `options[].text` : « 1 à 2⎵mois de dépenses »
3. Leçon 102, `payload.question` : « Léa a 19⎵ans, elle est apprentie… »
4. Terme `Bull market`, `full_definition` : « …un bull market exceptionnel de 11⎵ans… »
5. Article `pea` : « Retrait avant 5⎵ans : imposition des gains… »

**Après `frenchSpaces()` (prototype testé sur les 6 003 chaînes de contenu, hors titres et extraits, d'où des « Avant » un peu plus bas) :**

| Cas | Avant | Après |
|---|---|---|
| Montant + € | 2 608 | 0 |
| % | 1 644 | 0 |
| Milliers | 2 239 | 0 |
| Guillemets | 90 | 0 |
| Ponctuation | 3 538 | 27 |

Les 27 ponctuations restantes sont des « Alphabet⎵:</h3> », des deux-points suivis d'une balise HTML, qui disparaissent si le HTML est retiré d'abord. Aucune balise ni aucun attribut HTML n'est modifié.

---

## 5. Tests qui figent l'erreur

La correction (a) a été simulée sur une copie : constantes U+00A0/U+202F, `grouped()`/`quantity()` en `/\s/g` et `valTips.ts:31`. Résultat : **6 tests cassent sur 372**. Tous figent des U+0020 :

| Fichier:ligne | Assertion actuelle (octets) | À écrire |
|---|---|---|
| `tests/patrimoine.test.ts:209` | `'…passé⎵de⎵1⎵000⎵€⎵à⎵3⎵500⎵€⎵depuis…'` | `1‿000⍽€`, `3‿500⍽€` |
| `tests/patrimoine.test.ts:216-223` | `'48⎵320⎵€'`, `'805⎵€'`, `'805,40⎵€'`, `'12,40⎵€'`, `'•••••⎵€'`, `'+⎵6⎵320⎵€'`, `'−⎵95,00⎵€'`, `'+⎵410⎵€'` | `48‿320⍽€`, `+⍽6‿320⍽€`… |
| `tests/patrimoine.test.ts:225-226` | `'5⎵SOL'`, `'42⎵parts'` | U+00A0 |
| `tests/patrimoine.test.ts:231` | `'Mis⎵à⎵jour⎵il⎵y⎵a⎵3⎵min'` | `3⍽min` |
| `tests/patrimoine.test.ts:276` | `includes('ETF⎵Monde⎵pèse⎵40⎵%')` | `40⍽%` |
| `tests/patrimoineDevisesEchelle.test.ts:56` | `tickLabel(27000,'eur')` donne `'27⎵000⎵€'` | `27‿000⍽€` |
| `tests/patrimoineDevisesEchelle.test.ts:107-111` | `'81,46⎵$,⎵soit⎵72,45⎵€'`, `'105,34⎵€'`, `'10,00⎵CHF'`, `'81,46⎵$'` | U+00A0 avant le symbole |
| `tests/patrimoineDevisesEchelle.test.ts:125-127` | `'taux⎵au⎵1er⎵août⎵2026'`, `'…12⎵février…'`, `'…17⎵octobre…'` | `1er⍽août`, `12⍽février`, `17⍽octobre` |

Ces tests figent l'erreur seulement si l'on corrige les chaînes une à une, pas avec la correction à l'affichage recommandée :
- `tests/speechBubble.test.ts:13` (« Salut⎵! ») ;
- `tests/discovery.test.ts:381, 404` (« 1⎵800⎵€ », « 15⎵%… 3240⎵€ », sans séparateur de milliers non plus, car `fillTemplate(…, String)`) ;
- `tests/discoveryHome.test.ts:104` ;
- `tests/accuracy.test.ts:114-115` ;
- `tests/dailyProgram.test.ts:95-96, 131-134` ;
- `tests/streakRewards.test.ts:120-125, 217-221` (« dans⎵2⎵jours ») ;
- `tests/profile.test.ts:51-52` (« 25⎵XP »), `tests/lessonPlayer.test.ts:177-178` (« 30⎵ans »).
- `tests/lessonPlayer.test.ts:66` (`300⎵000${NBSP}€`) est une entrée de `fitFontSize`, pas une sortie figée.

Au total, environ 210 occurrences dans les assertions, messages compris.

---

## 6. Correction globale proposée

### (a) Corriger les constantes et les formateurs (cause racine)

1. **`src/utils/patrimoine/format.ts`.** Écrire les espaces **en échappement**, jamais en caractère invisible :
   ```ts
   const NBSP = '\u00A0';
   const NNBSP = '\u202F';
   // grouped() et quantity()
   .replace(/\s/g, NNBSP);
   ```
   Le mieux est d'importer ces constantes depuis un module unique (`frenchSpaces.ts` ci-dessous ou `utils/format.ts`) au lieu de les redéclarer dans 8 fichiers.
2. **`patrimoine/valTips.ts:31`** : `` `${Math.round(share * 100)}\u00A0%` `` (ou `withUnit()`).
3. **Outils** (Portefeuille, PositionRow, Epargne, Cashflow, EntryRow, CategoryBreakdown) : remplacer les `toLocaleString(…) + ' €'` et `toFixed(2)%` par `formatAmount()` / `formatVariationPercent()` de `utils/format.ts`.
4. **Ne plus détruire les insécables reçues.** Dans `dictionary.ts:27` et `:522` et dans `notebook.ts:47`, utiliser `replace(/[^\S\u00A0\u202F]+/g, ' ')`, qui replie les blancs sauf les insécables.
5. **`AccessTile.tsx:45`** : `` {`\u00A0${unit}`} ``. La valeur et l'unité sont dans deux `Text` distincts, donc aucun filtre global ne les voit ensemble.
6. **Garde-fou** : un test statique, sur le modèle de `worklets.test.ts`, qui échoue si une constante `NBSP`/`NNBSP` ne vaut pas U+00A0/U+202F, ou si une chaîne contient une U+00A0 ou une U+202F littérale au lieu d'un échappement.

### (b) Une fonction unique `frenchSpaces(text)`

**Compatibilité Hermes.** La fonction n'utilise ni `\p{…}`, ni lookbehind, ni drapeau `u`. Elle se limite aux classes, aux groupes capturants, aux lookahead et à `split` avec capture.

À titre d'information :
- le `hermesc` du projet (`hermes-compiler` 250829098.0.17) **accepte** `(?<!…)` et `/\p{L}/u` à la compilation, et `BlockRenderer.tsx:22-26` s'en sert déjà ;
- je n'ai pas pu vérifier le comportement **à l'exécution** sous Hermes, faute de binaire d'exécution. D'où le choix prudent.

Les 12 regex de la fonction compilent sans erreur avec ce `hermesc`.

```ts
// src/utils/frenchSpaces.ts
// Espaces insécables à la française, posées à l'affichage : un montant, une
// unité, un « ? » ou un guillemet ne se retrouvent jamais seuls en début de
// ligne. Fonction pure, idempotente, sans React : testable avec Node.
//
// Compatible Hermes : ni propriétés Unicode (\p{…}), ni lookbehind, ni
// drapeau « u » ; seulement des classes, des groupes et des lookahead.
// Les espaces spéciales sont TOUJOURS écrites en échappement : un caractère
// invisible collé dans le source se perd sans bruit (cause du bug actuel).

export const NBSP = '\u00A0'; // insécable : avant € % : » et les unités, après « et n°
export const NNBSP = '\u202F'; // fine insécable : milliers, avant ; ! ?

// Espace « cassable » à remplacer : espace normale ou fine sécable (U+2009)
const SP = '[ \u2009]';
// Ni lettre ni chiffre juste après l'unité : « 3 mois » oui, « 3 hommes » non
const END = '(?![0-9A-Za-zÀ-ÖØ-öø-ÿ])';
const UNITS =
  '€|%|‰|\\$|£|k€|M€|Md€|euros?|ans?|mois|jours?|semaines?|années?|h|min|heures?|minutes?|secondes?|pts?|points?|x|XP|Vals?|fois';

// Morceaux jamais retouchés : adresses web et e-mails
const PROTECTED = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s@]+@[^\s@]+\.[a-z]{2,})/gi;

// 1 000 · 27 071 · 1 000 000 : groupe de tête de 1 à 3 chiffres, non précédé
// d'un chiffre, d'une virgule ou d'un point (« 2024 100 », « 3,141 592 »
// restent tels quels)
const THOUSANDS = new RegExp('(^|[^0-9,.])([0-9]{1,3}(?:' + SP + '[0-9]{3})+)(?![0-9])', 'g');
const THOUSAND_SEP = new RegExp(SP, 'g');
// 850 € · 3,5 % · 30 ans · 14 h · {epargne} % (gabarits des leçons)
const UNIT = new RegExp('([0-9}])' + SP + '(' + UNITS + ')' + END, 'g');
// 14 h 30 : les minutes restent avec l'heure
const HOUR_MINUTES = new RegExp('([0-9]\u00A0h)' + SP + '(?=[0-9]{2}(?![0-9]))', 'g');
// n° 12
const NUMERO = new RegExp('([nN]°)' + SP + '(?=[0-9])', 'g');
// mot ? · mot ! · mot ; suivis d'une fin, d'un blanc ou d'une fermeture
// (« ![image](…) » de Markdown et « a ?b » intacts)
const HIGH_PUNCT = new RegExp('([^\\s])' + SP + '([?!;]+)(?=$|[\\s»"\'’)\\]*.,…])', 'g');
// mot : suite (deux-points suivi d'un blanc ou d'une fin) ; « 14:30 », « 1:2 »,
// « :) » et « https:// » ne bougent pas
const COLON = new RegExp('([^\\s])' + SP + ':(?=$|[\\s*])', 'g');
// « texte » (avec ou sans espace d'origine)
const OPEN_QUOTE = new RegExp('«(?:' + SP + ')?(?=[^\\s])', 'g');
const CLOSE_QUOTE = new RegExp('([^\\s])(?:' + SP + ')?»', 'g');
const NEEDS_WORK = /[ \u2009«»]/;
const THIN = /\u202F/g;

function fix(text: string): string {
  return text
    .replace(THOUSANDS, (_m: string, before: string, group: string) => before + group.replace(THOUSAND_SEP, NNBSP))
    .replace(UNIT, '$1' + NBSP + '$2')
    .replace(HOUR_MINUTES, '$1' + NBSP)
    .replace(NUMERO, '$1' + NBSP)
    .replace(HIGH_PUNCT, '$1' + NNBSP + '$2')
    .replace(COLON, '$1' + NBSP + ':')
    .replace(OPEN_QUOTE, '«' + NBSP)
    .replace(CLOSE_QUOTE, '$1' + NBSP + '»');
}

// Petit cache : les mêmes chaînes reviennent à chaque rendu
const cache = new Map<string, string>();
const CACHE_MAX = 500;

// thin: false → pas d'espace fine (police sans U+202F : Fraunces)
export function frenchSpaces(text: string, opts: { thin?: boolean } = {}): string {
  if (typeof text !== 'string' || !NEEDS_WORK.test(text)) return text;
  let out = cache.get(text);
  if (out === undefined) {
    // split avec groupe capturant : indices impairs = morceaux protégés
    out = text
      .split(PROTECTED)
      .map((part, i) => (i % 2 === 1 ? part : fix(part)))
      .join('');
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(text, out);
  }
  return opts.thin === false ? out.replace(THIN, NBSP) : out;
}
```

**Où l'appliquer** (pour couvrir l'app et le site sans réécrire les chaînes) :

1. **`AppText`, comme filet global.** Il fusionne les morceaux de texte voisins, puis applique `frenchSpaces`. La fusion est indispensable : `{montant} €` arrive en deux enfants, `["27 071", " €"]`.
   ```tsx
   import { Children, ReactNode } from 'react';
   import { StyleSheet } from 'react-native';
   import { frenchSpaces } from '@/src/utils/frenchSpaces';

   function frenchChildren(children: ReactNode, thin: boolean): ReactNode {
     if (typeof children === 'string') return frenchSpaces(children, { thin });
     if (!Array.isArray(children)) return children;
     const out: ReactNode[] = [];
     let buf: string | null = null;
     // toArray : clés posées sur les éléments, donc pas d'avertissement de liste
     for (const c of Children.toArray(children)) {
       if (typeof c === 'string' || typeof c === 'number') buf = (buf ?? '') + String(c);
       else {
         if (buf !== null) out.push(frenchSpaces(buf, { thin }));
         buf = null;
         out.push(c);
       }
     }
     if (buf !== null) out.push(frenchSpaces(buf, { thin }));
     return out;
   }
   // dans AppText :
   // const family = StyleSheet.flatten([variantStyle, style])?.fontFamily ?? '';
   // const thin = !String(family).startsWith('Fraunces');   // Fraunces n'a pas U+202F
   // <Text …>{frenchChildren(props.children, thin)}</Text>
   ```
   Ce filet couvre les 303 textes affichés de la section 2, et tout texte du site rendu par AppText.
2. **Aux points d'entrée du site**, une fois par chargement, parce que plusieurs affichages utilisent `Text` natif :
   - `normalize.ts` : `plainText()` et `valText()` renvoient `frenchSpaces(text)`. Cela couvre toutes les leçons, y compris ValBubble ;
   - `dictionary.ts` : `normalizeEntry()`, après la correction du repli `\s+` ;
   - `notebook.ts` : `plainDeclic()` ;
   - `ArticleDetailScreen.tsx`, dans le `useMemo` des blocs : un parcours récursif qui applique `frenchSpaces` à chaque chaîne (`content`, `items[]`, `text`, `left`/`right`, `quiz`, `value`, `label`).

   Comme la fonction est idempotente, le double passage avec AppText ne coûte rien. **Pas** dans `ApiContext.tsx`.
3. **`ValBubble.tsx:377`** : `parseWords(noOrphan(frenchSpaces(text)))`. Pour les répliques construites dans l'app, comme `discoveryHome.ts:311` ou `valLines.ts`, ValBubble utilise `Text` natif.
4. **Écrans en `Text` natif restants** (BlockRenderer, TermRow, WordOfDayLine, StatPills, StreakWeek, HomeHeader, outils) : soit passer à AppText, soit appliquer `frenchSpaces` à la chaîne.

**Pièges (tous couverts par le prototype et ses tests) :**
- **URL et e-mails** : protégés grâce à `split` avec groupe capturant. Effet de bord accepté : un `!` juste après une URL n'est pas collé.
- **Heures « 14:30 », ratios « 1:2 », « :) », « https:// »** : les deux-points ne sont traités que s'ils sont précédés d'une espace **et** suivis d'un blanc ou d'une fin.
- **Décimaux « 3,5 % »** : donnent « 3,5⍽% ». Le motif des milliers exige un groupe de tête non précédé d'un chiffre, d'une virgule ou d'un point. Ainsi « 3,141 592 » et « En 2024 100 personnes » restent intacts. Seul faux positif possible : deux nombres de 1 à 3 chiffres suivis d'un nombre de 3 chiffres (« les 12 100 »), cas rare.
- **Emoji** : sans drapeau `u`, un emoji compte pour deux unités UTF-16. `([^\s])` accepte la seconde, donc « Bravo 🎉 ! » donne « 🎉‿! ».
- **Markdown** : `**Pourquoi ?**` donne `**Pourquoi‿?**`. `![image](…)` n'est pas touché (lookahead sur la fermeture).
- **Retours à la ligne** : préservés, car seules U+0020 et U+2009 sont remplacées, jamais `\n`.
- **Unités ambiguës** : `END` exige une non-lettre après l'unité. « 3⎵mois » est traité, « 2⎵hommes » ne l'est pas. Le « s » seul (secondes) a été exclu exprès.
- **Police Fraunces** : sans U+202F, d'où `thin: false`, qui convertit en U+00A0 comme le font BigNumber et StatBand.
- **Liens du dictionnaire (BlockRenderer)** : construire la regex des termes avec `[ \u00A0\u202F]` à la place de chaque espace. Un terme comme « Livret A » reste repérable si une insécable apparaît, même si les règles proposées ne touchent pas l'espace interne d'un tel terme.
- **Saisie** : ne jamais appliquer la fonction à un `TextInput`. `parseDecimal()` et `parseNumber()` acceptent déjà toutes les espaces.
- **Performance** : 6 003 chaînes en 51 ms sous Node, avec un rejet rapide et un cache de 500 entrées. Négligeable par rendu.

### (c) Tests à ajouter ou mettre à jour

1. **`tests/frenchSpaces.test.ts`** (nouveau, 5 tests verts sur la copie simulée) :
   ```ts
   // tests/frenchSpaces.test.ts
   import assert from 'node:assert/strict';
   import { test } from 'node:test';

   import { frenchSpaces } from '@/src/utils/frenchSpaces';

   const N = '\u00A0';
   const T = '\u202F';
   const f = (s: string) => frenchSpaces(s);

   test('montants, pourcentages, unités : insécable avant l’unité, fine entre milliers', () => {
     assert.equal(f('Tu as 27 071 € sur ton livret.'), `Tu as 27${T}071${N}€ sur ton livret.`);
     assert.equal(f('Plafond de 1 000 000 €'), `Plafond de 1${T}000${T}000${N}€`);
     assert.equal(f('Taux de 3,5 % par an'), `Taux de 3,5${N}% par an`);
     assert.equal(f('+12 % en un mois'), `+12${N}% en un mois`);
     assert.equal(f('8 ans et 3 mois, 2 hommes'), `8${N}ans et 3${N}mois, 2 hommes`);
     assert.equal(f('À 14 h 30 pile'), `À 14${N}h${N}30 pile`);
     assert.equal(f('il y a 3 min'), `il y a 3${N}min`);
     assert.equal(f('n° 12 du classement'), `n°${N}12 du classement`);
     assert.equal(f('Dans un an : {epargne_montant*12} €'), `Dans un an${N}: {epargne_montant*12}${N}€`);
   });

   test('ponctuation double et guillemets', () => {
     assert.equal(f('Et toi ?'), `Et toi${T}?`);
     assert.equal(f('Bravo 🎉 !'), `Bravo 🎉${T}!`);
     assert.equal(f('Exemple : un livret'), `Exemple${N}: un livret`);
     assert.equal(f('**Pourquoi ?** Parce que'), `**Pourquoi${T}?** Parce que`);
     assert.equal(f('Le « coussin » de sécurité'), `Le «${N}coussin${N}» de sécurité`);
     assert.equal(f('«Combien garder de côté ?»'), `«${N}Combien garder de côté${T}?${N}»`);
   });

   test('pièges : rien ne bouge', () => {
     for (const s of [
       'Rendez-vous à 14:30, ratio 1:2',
       'Smiley :) ok',
       'En 2024 100 personnes',
       'Pi vaut 3,141 592',
       'Ouvre ![image](x.png) ici',
       'https://valtheria.fr/a?b=1',
       'contact@valtheria.fr',
       'S&P 500',
       '',
     ]) {
       assert.equal(f(s), s, s);
     }
     // Retours à la ligne gardés ; U+2009 (fine sécable) traitée comme une espace
     assert.equal(f('Ligne 1\nLigne 2 ?'), `Ligne 1\nLigne 2${T}?`);
     assert.equal(f('20\u2009%'), `20${N}%`);
   });

   test('idempotente, et sans espace fine pour Fraunces', () => {
     const once = f('Tu as 27 071 € ? « Oui » : 3,5 %');
     assert.equal(f(once), once);
     assert.equal(frenchSpaces('1 000 € ?', { thin: false }), `1${N}000${N}€${N}?`);
   });

   test('déjà insécables : laissées telles quelles', () => {
     const s = `27${T}071${N}€`;
     assert.equal(f(s), s);
   });
   ```
2. **Mettre à jour les 6 tests listés en section 5**, avec des valeurs écrites en échappement, par exemple `money(27071) === '27\u202F071\u00A0€'`.
3. **Ajouter une assertion d'octets** sur `money()`, `quantityLabel()` et `updatedLabel()`, pour que la régression ne puisse plus revenir en silence.
4. **Ajouter le garde-fou statique (a).6.**
5. **Facultatif : un test « contenu »** avec un petit extrait figé du relevé (quelques chaînes de leçons 100 à 103 et de termes). Il vérifierait qu'après `frenchSpaces` il ne reste aucune occurrence de `\d⎵€`, `\d⎵%`, `\d{1,3}⎵\d{3}` ni `\S⎵[?!;:]`.

### Et côté site ?

**Oui, mais en complément, pas à la place.**

- **Intérêt.** Une normalisation à l'enregistrement (mutator ou observer Laravel sur `lessons.questions_data`, `terms.definition`/`full_definition` et `articles.content`, appliquée aux **nœuds texte seulement**, via DOMDocument pour le HTML), plus une commande de migration du contenu existant, profiterait aussi au web. Elle permettrait de corriger ce que le filtre de l'app ne doit pas toucher : les 2 267 montants collés (« 600€/an », « 20% ») et le HTML brut des articles.
- **Le filtre de l'app reste nécessaire**, pour trois raisons :
  1. l'ancien contenu et les saisies futures (éditeur WYSIWYG, copier-coller) réintroduiront des U+0020 ;
  2. l'app affiche aussi ses propres textes ;
  3. `dictionary.ts` détruit aujourd'hui toute insécable reçue.
- **Contrainte.** Le site est **gelé** (CLAUDE.md). Ce chantier n'est donc envisageable que comme un lot API explicitement demandé : worktree depuis `origin/main`, branche dédiée, tests, pull request, staging, puis production avec accord. Sinon, il se fera lors de la refonte. La correction côté app suffit seule à régler le problème d'affichage.
