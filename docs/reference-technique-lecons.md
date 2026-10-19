# Référence technique des leçons

État au 17 octobre 2026. Relevé en lecture seule dans l'app (branche `main`, commit 2072b74) et dans le site (dépôt Valtheraa/Valtheria, branche `main`, commit 780dc18). Aucun fichier de code n'a été modifié pour ce document.

**Décision : le format de l'app fait foi.** Quand l'app et le site diffèrent, c'est le site qui s'aligne. Les modifications à faire sur le site sont listées en fin de document (partie 5) et reprises dans `docs/lot-serveur.md` (section 9).

> **Lot serveur n° 9 (17 octobre 2026) : le site s'aligne sur l'app.** Les écarts E1 à E9 et E13 à E18 sont traités sur le site (pull request n° 11, fusion d7bdb11), vérifiés sur le staging, **en production depuis le 17 octobre 2026**. Les parties 0 à 4 décrivent le site avant le lot ; ce qui change est résumé en partie 5.0.

Fichiers de référence :

| Rôle | App | Site |
|---|---|---|
| Lecture du format serveur | `src/lesson/normalize.ts` (seul point d'entrée) | — |
| Modèle interne | `src/lesson/model.ts` | — |
| Validation | gardes de `normalize.ts` (écran de secours si mal formé) | `app/Services/LessonFormatValidator.php` |
| Correction | `src/utils/grade.ts`, seule source de correction pour tous les types, miroir du site (depuis le 17/10/2026) ; `src/lesson/interactive.ts` ne garde que l'affichage | `app/Services/Lesson/ScreenGrader.php`, `LessonGrader.php`, `resources/js/reader/grade.js` |
| Rendu | `src/components/apprendre/ScreenRenderer.tsx` et `screens/*.tsx` | `resources/views/pages/learn/reader.blade.php`, `resources/js/reader/*.js` |
| Lecteur | `src/screens/ApprendreDetailScreen.tsx`, `src/utils/lessonPlayer.ts` | `LearnController.php`, `Api/LessonController.php` |
| Leçons d'exemple | `src/lesson/discovery/*.ts` : six leçons découvertes au format serveur, dont trois construites à partir des chiffres réglementaires (`discoveryLesson`, partie 3.6) | `database/seeders/data/01…04-lecon-*.json`, `tests/Support/BuildsReaderDemoLesson.php` |
| Cas de correction | `tests/interactive.test.ts` (nouveaux types) ; l'app n'a pas de copie des cas du site | `tests/fixtures/reader-grading.json` (54 cas) |

---

## 0. Les types d'écrans en un tableau

| Clé `type` | Nom | Joué par l'app | Accepté par le site | Peut être noté | Corrigé par le serveur | Révision de l'app | Révision du serveur |
|---|---|---|---|---|---|---|---|
| `choice` | Choix (QCM, vrai ou faux à deux options, piège) | oui | oui | oui | oui | oui si noté | oui si noté |
| `slider` | Pari (non noté) ou estimation (notée) | oui | oui | oui | oui | oui si noté | oui si noté |
| `reveal` | Révélation | oui | oui | **non** | — | non | non |
| `document` | Relevé ou document à lire | oui (relevé) | oui (par artefact) | oui | oui | oui si noté | oui si noté |
| `dialogue` | Dialogue | oui, **format app** (messages) | oui, **format site** (une réplique) | oui | oui | oui si noté | oui si noté |
| `allocate` | Répartir | oui, **format app** (règles) | oui, **format site** (cibles) | oui | oui, sur les cibles | oui si noté | **non** (`review: false` obligatoire) |
| `true_false` | Vrai ou faux en rafale | oui | **non** | oui | non | oui si noté | — |
| `order` | Remettre dans l'ordre | oui | **non** | oui | non | oui si noté | — |
| `match` | Associer | oui | **non** | oui | non | oui si noté | — |
| `simulator` | Simulateur | oui | **non** | **non** | — | non | — |
| `number` | Nombre à saisir | **non** (écran de secours) | oui | oui | oui | non | **oui** |
| `live_month` | Mois vécu | **non** (écran de secours) | oui | oui (toujours) | oui | non | non |

Deux points à savoir :
- **Pari** n'est pas un type : c'est un `slider` non noté, suivi d'un `reveal` qui y renvoie par `from_screen`. Le site l'appelle « guess_then_reveal » (`docs/FORMAT_ECRANS.md`).
- **Vrai ou faux** existe sous deux formes : un `choice` à deux options (convention du site), ou un `true_false` en rafale de cartes (format de l'app, pas encore accepté par le site).

Les quatre leçons réelles du site (module « Ne jamais être obligé de vendre », univers « Avant d'investir ») n'utilisent que `choice` (noté), `reveal`, `document` (noté) et un `slider` non noté : l'app les joue toutes. La leçon « Où mettre ce coussin » contient 21 jetons `{{cle}}` et un écran `selon_chiffres` (partie 3.6).

---

## 1. Règles communes à tous les écrans

### 1.1 L'enveloppe d'un écran

| Clé | App | Site |
|---|---|---|
| `type` | clé exacte, sans alias ni casse ignorée ; inconnue → écran de secours | snake_case, doit être dans la liste des 8 types |
| `scored` | `true` si exactement `true`, sinon `false` | booléen **obligatoire** |
| `notion` | lue si chaîne, recopiée mais jamais envoyée | slug de `notions.slug` ; **obligatoire si noté, interdite sinon** ; 1 à 3 notions par leçon |
| `val` | `{intro, correct, wrong}`, chacun `{line, mood}` | même forme ; `correct` et `wrong` réservés aux écrans notés ; `line` obligatoire |
| `explanation` | texte, montré dans la feuille de réponse | texte |
| `payload` | objet ; `question` et `subtitle` sont lus **pour tous les types** | objet obligatoire, clés permises selon le type (inconnue → refus) |
| `review` | ignoré | seule la valeur `false` est admise ; absent = rejouable en révision |
| `artifact`, `variant` | ignorés (l'app reçoit le document déjà résolu) | réservés à `document` |
| `selon_chiffres` | jamais reçu (le site sert la version choisie) | admis : deux versions de l'écran selon les chiffres réglementaires (partie 3.6) |
| `has_volatile_note`, `volatile_verified_at` | lus (`volatileVerifiedAt`) : « Taux en vigueur au 8 septembre 2026 », discret, sous l'écran (depuis le 17/10/2026) | ajoutés au service sur un écran qui a reçu au moins un chiffre ; refusés s'ils sont écrits dans la leçon |

Aucun champ `image`, `illustration` ni `title` par écran, ni dans l'app ni sur le site.

### 1.2 Val et ses humeurs
- **Humeurs** (identiques des deux côtés) : `neutre`, `complice`, `preoccupe`, `determine`, `alerte`, `fier`, `celebrant`, `rassurant`. Absente : `neutre` des deux côtés. Inconnue : `neutre` dans l'app, **refusée** par le validateur du site (`LessonFormatValidator.php:680-684`).
- **Sans `val.intro`**, l'app prend une réplique par défaut selon le type (`defaultValLine`, `lessonPlayer.ts`). Un `slider` non noté d'une leçon découverte reçoit toujours « Petit pari, sans mauvaise réponse. À ton avis ? ».
- **Après Valider**, l'app montre `val.correct` ou `val.wrong`. Si une série de bonnes réponses démarre ou passe un palier, une réplique de série les remplace en haut de l'écran.
- Dans un `dialogue`, Val n'est pas affiché en haut : sa réplique est dans la feuille de réponse, qui garde `val.correct`, et seul le grand texte « n d'affilée ! » signale la série (`lessonPlayer.ts:52-54`, `ApprendreDetailScreen.tsx:522-529`).
- Sans `val.correct` ni `val.wrong`, la réplique d'arrivée est reprise, en humeur `celebrant` ou `rassurant` (`ApprendreDetailScreen.tsx:520`).

### 1.3 Textes
- **Seules les balises nues `<em>` et `<strong>` sont admises.** Le site les autorise dans `val.*.line`, `explanation` et toutes les chaînes du `payload`. L'app les retire, ou les transforme en gras dans la bulle de Val.
- **Longueurs** : aucune longueur maximale n'est imposée, ni par le site ni par l'app. Les limites sont visuelles ; elles sont données type par type.
- Le site remplace les jetons `{{cle}}` par les chiffres réglementaires (`regulatory_figures`) avant d'envoyer la leçon. Dans les leçons découvertes, l'app remplace elle-même les jetons (`fillFiguresDeep`) ; une clé inconnue est retirée. Détails et liste des clés : partie 3.6.
- **Balises** : seules `<em>` et `<strong>` sont retirées par l'app ; toute autre balise reste affichée telle quelle. Une chaîne vide devient `null` (`normalize.ts:59-64`).

### 1.4 Réponse, note, série
- **Un seul essai compte.** Le site ne garde que la première tentative (`LessonGrader::MAX_ATTEMPTS = 1`). L'app n'envoie que la première, et ne joue le rattrapage qu'en local.
- **Corps envoyé à la fin** : `{ "responses": { "<index de l'écran>": [réponse brute] } }`, pour les seuls écrans `scored: true`.
- **Un écran noté sans réponse compte comme raté** côté serveur.
- **Écran « gradable » dans l'app** (`isGradable`) : `scored: true` et un type joué autre que `reveal` et `simulator`. Il décide :
  - du bouton « Valider » ;
  - du rattrapage ;
  - de la mémoire de révision de l'app.
- **Série de bonnes réponses du premier coup** : la pastille ⚡ apparaît à 3, avec des paliers à 5 « En feu ! » et 10 « Inarrêtable ! ». Elle est calculée et gardée par l'app seule.
- **Piège** : un `reveal` ou un `simulator` marqué `scored: true` est compté juste par l'app et part à `/complete` (`{type: 'reveal', seen: true}` ou la valeur du curseur). Le site le refuse au contrôle de format, mais pas à l'enregistrement dans l'administration ; s'il arrive quand même au serveur, `ScreenGrader` ne sait pas le noter et `LessonGrader` le compte **raté** (`ScreenGrader.php:33-41`).

### 1.5 Écran de secours
Un type inconnu, ou un écran connu mais mal formé (voir les gardes de chaque type), devient `unsupported` dans l'app :
- la question s'affiche, avec « Cet écran arrive bientôt dans l'app. Tu peux passer à la suite. », puis « Continuer ». Le type et le JSON ne s'affichent qu'en développement (`FallbackScreen.tsx:20-28`). Val dit « Regarde bien. » si l'écran n'a pas de `val.intro` ;
- aucune réponse n'est envoyée, ce qui fait **compter l'écran comme raté par le serveur** s'il est noté.
- Un écran qui plante au rendu affiche « Cet écran a un souci » et « Passer cet écran » (`player/ScreenBoundary.tsx:39-45`).

### 1.6 Affichage commun et cas qui bloquent dans l'app
- **Sous-titre** : `subtitle` ne s'affiche qu'avec une `question` (`player/ScreenIntro.tsx:29`). Sur un `true_false` dont la question est absente ou vaut « Vrai ou faux ? », tout le bloc est masqué, sous-titre compris.
- **Taille de la question** : 25 px (31 d'interligne) pour `choice`, `true_false`, `order`, `match`, `document` et l'écran de secours ; 23 px (30) pour `slider`, `reveal`, `allocate`, `simulator` et `dialogue`. Agrandissement du texte plafonné à ×1,3, sans troncature (`ScreenIntro.tsx:11-15`).
- **Feuille de réponse** : contenu limité à 55 % de la hauteur de l'écran, puis défilement (`AnswerSheet.tsx:18,104`). « La bonne réponse » au singulier, « Les bonnes réponses » seulement s'il y en a plusieurs (`correctCount`, `correctAnswerLabel`), même si l'unique réponse contient une virgule (corrigé le 17/10/2026).
- **Rattrapage** : l'aperçu d'une question ratée est coupé à 90 caractères ; il prend la question, sinon la première carte (`true_false`) ou le premier message (`dialogue`) (`lessonPlayer.ts:235-251`).
- **Bouton du bas** : `true_false`, `match` et `dialogue` n'en ont pas, la réponse part d'elle-même (`lessonPlayer.ts:46-48`).

Les gardes de `normalize.ts` mènent à l'écran de secours (elles sont rappelées type par type). D'autres cas passent les gardes mais **bloquent ou faussent l'écran** :

| Type | Cas sans garde |
|---|---|
| `choice` | 0 option sur un écran noté : « Valider » reste grisé, la leçon est bloquée. Une option sans texte s'affiche vide. |
| `slider` | Noté sans `answer` : toujours faux. Un `answer` en texte est bien corrigé, mais la feuille ne montre pas la bonne réponse (`normalize.ts:232` ne lit qu'un nombre). |
| `reveal` | Un `from_screen` qui vise un `number` ne rappelle jamais rien : l'app ne reçoit pas de réponse à un `number`. |
| `true_false` | Des `id` en double s'écrasent dans la réponse (`TrueFalseScreen.tsx:136`). |
| `order` | `id` en double non contrôlés. « Valider » est actif dès l'arrivée. La colonne du rang fait 14 px : trop étroite au-delà de 9 éléments. |
| `match` | `id` en double non contrôlés. |
| `allocate` | Une règle sur un pot inexistant échoue toujours si `min > 0`. « Valider » est actif dès l'arrivée, sur la répartition de départ. |
| `simulator` | Une formule inconnue ne donne pas l'écran de secours : elle affiche 0. |
| `dialogue` | Sans aucune réponse `correct` : toujours faux. Une réponse sans `reaction` n'ajoute pas de bulle, mais l'attente a lieu quand même. |
| `document` | Un écran noté sans ligne touchable bloque la leçon. Une ligne `type: "section"` n'est jamais touchable (`DocumentScreen.tsx:147-152`) : marquée `correct`, l'écran ne peut plus être réussi. En `pick`, plusieurs lignes `correct` rendent aussi l'écran impossible. |

---

## 2. Écran par écran

Pour chaque type : le format de l'app (qui fait foi), un exemple complet, le format du site, les différences, la règle de réussite, la note, la révision et les limites.

Les exemples viennent des leçons découvertes de l'app (`src/lesson/discovery/*.ts`) ou des leçons et tests du site. Les leçons découvertes n'ont pas de `notion` : celles des exemples notés sont ajoutées, car le site l'exige sur tout écran noté.

### 2.1 `choice` : question à choix

**Format de l'app**

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `question` | texte | conseillé | titre de l'écran |
| `subtitle` | texte | non | sous la question |
| `mode` | `"single"` ou `"multiple"` | non | toute valeur autre que `multiple` donne une réponse unique |
| `options[]` | liste | oui | une option sans `id` est écartée |
| `options[].id` | texte (un nombre est converti) | oui | |
| `options[].text` | texte | oui | |
| `options[].correct` | booléen | non | `true` exactement, sinon `false` |

```json
{
  "type": "choice",
  "scored": true,
  "notion": "epargne_automatique",
  "val": {
    "correct": { "line": "Le vrai secret de ceux qui épargnent sans effort.", "mood": "fier" },
    "wrong": { "line": "C’est ce que fait presque tout le monde, et c’est pour ça que ça marche rarement.", "mood": "rassurant" }
  },
  "explanation": "À la fin du mois, il reste rarement quelque chose, et les primes sont irrégulières. Un virement le jour de la paie, c’est te payer en premier.",
  "payload": {
    "question": "Pour mettre de côté sans y penser, le plus efficace ?",
    "mode": "single",
    "options": [
      { "id": "reste", "text": "Garder ce qui reste à la fin du mois" },
      { "id": "virement", "text": "Programmer un virement le jour où la paie tombe", "correct": true },
      { "id": "prime", "text": "Mettre de côté chaque fois qu’une prime arrive" }
    ]
  }
}
```
(Tiré de `src/lesson/discovery/epargner.ts`.)

**Format du site** : mêmes clés, plus :
- `question` obligatoire ; `mode` vaut `single` par défaut ;
- `trap` (booléen) et `trap_found` (texte affiché quand le piège est déjoué, admis seulement avec `trap: true`) ;
- `options` : de 2 à 8, `id` et `text` en textes non vides, ids uniques, `correct` booléen ;
- un écran **noté** en `single` a **exactement une** bonne réponse, en `multiple` **au moins une**. Le `mode` n'intervient pas dans la correction.

**Différences** :
- `trap` et `trap_found` sont ignorés par l'app : le verdict « C'était un piège » n'existe que sur le web.
- Le site refuse un id numérique ; l'app l'accepte.

**Réussite** : l'ensemble des ids choisis est exactement l'ensemble des options `correct: true`. L'ordre ne compte pas. Sans aucune option correcte, c'est toujours faux.

**Réponse envoyée** : l'id (`"virement"`), ou la liste d'ids en mode `multiple`.

**Note et révision** : noté si `scored: true`. Entre dans la révision de l'app et dans celle du serveur.

**Limites** :
- site : 2 à 8 options ;
- app : aucune limite codée. Les options passent à la ligne sans troncature.
- Convention des leçons de l'app : une seule juste (vérifié par `tests/discovery.test.ts`), 3 options (convention, non testée).
- Rendu : options de 56 px de haut au minimum, texte en 17 px (23 d'interligne) ; en mode `multiple`, la consigne « Plusieurs réponses possibles » s'affiche (`ChoiceScreen.tsx:59`, `ReliefOption.tsx:25-26`).

### 2.2 `slider` : pari ou estimation

**Format de l'app**

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `question`, `subtitle` | texte | conseillé | |
| `min`, `max` | nombre | **oui**, `max > min` | sinon écran de secours |
| `step` | nombre > 0 | non | 1 par défaut |
| `start` | nombre | non | `min` par défaut, ramené dans les bornes |
| `unit` | texte | non | affichée après le chiffre |
| `answer` | nombre | si noté | valeur juste |
| `tolerance` | nombre | non | 0 par défaut |

Pari, non noté (`epargner.ts`) :
```json
{
  "type": "slider",
  "scored": false,
  "val": { "intro": { "line": "Petit pari, sans mauvaise réponse. À ton avis ?", "mood": "complice" } },
  "payload": {
    "question": "Tu laisses 1 000 € sur ton compte courant pendant 10 ans. Avec 2 % d’inflation par an, que pourras-tu encore acheter avec, en euros d’aujourd’hui ?",
    "min": 500, "max": 1200, "step": 10, "start": 1000, "unit": "€"
  }
}
```

Estimation notée (bornes et réponse de la leçon de démonstration du site, question pour l'exemple) :
```json
{
  "type": "slider",
  "scored": true,
  "notion": "frais_bancaires",
  "val": { "correct": { "line": "Bien vu.", "mood": "fier" }, "wrong": { "line": "C’est plus que ça.", "mood": "rassurant" } },
  "explanation": "…",
  "payload": { "question": "Combien te coûtent ces frais sur un an ?", "min": 0, "max": 100, "step": 1, "start": 50, "unit": "€", "answer": 32, "tolerance": 10 }
}
```

**Format du site** : mêmes clés.
- `question`, `min`, `max` et `step` sont obligatoires, et `answer` l'est si l'écran est noté.
- `min < max`, avec `answer` et `start` dans les bornes, et `step > 0`.

**Différences** : aucune sur le format. Le site exige `question` et `step`, l'app les tolère absents.

**Réussite** : `|réponse − answer| ≤ |tolerance|` (à 1e-9 près). La réponse comme `answer` acceptent aussi un texte comme « 1 234,5 » (espaces, espaces insécables et virgule admis). Sans `answer` lisible, c'est faux. Côté site, `tolerance` n'a pas de contrainte de signe.

**Réponse envoyée** : le nombre choisi, si l'écran est noté. Un pari n'envoie rien : sa valeur sert au `reveal` qui suit.

**Note et révision** :
- **noté** : bouton « Valider », révision ;
- **non noté** : bouton « Je parie », toujours « juste », jamais révisé.

**Limites** : aucune borne imposée. Le grand chiffre fait 78 px, 60 sur un écran bas (moins de 800 px), et rétrécit jusqu'à 28 px si le texte est trop large ; il est dimensionné sur la plus longue des deux bornes, avec 0 à 2 décimales. `start` est arrondi au pas. Un pari affiche « Fais glisser pour parier » (`BigNumber.tsx`, `fit.ts`, `SliderScreen.tsx`).

**Leçons découvertes** : le pari d'Épargner est construit à partir de l'inflation des chiffres réglementaires (`buildEpargner`) ; l'exemple ci-dessus vaut pour 2 %.

### 2.3 `reveal` : révélation

**Format de l'app**

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `value` | nombre | **oui** | sinon écran de secours |
| `unit` | texte | non | |
| `decimals` | entier de 0 à 4 | non | 0 par défaut |
| `label` | texte | non | titre au-dessus du chiffre, « En vrai » par défaut |
| `start` | `{label, value}` | non | barre de départ, affichée seulement s'il y a une estimation ; « Au départ » est le libellé par défaut. Sa valeur masque toujours les lignes égales, même sans barre |
| `from_screen` | entier | non | index d'un `slider` ou `number` **précédent** : rappelle le pari |
| `lines[]` | liste de `{label, value, key, dim}` | non | `key` : ligne en or ; `dim` : ligne atténuée, seul le libellé s'affiche (valeur `""` admise) |

```json
{
  "type": "reveal",
  "scored": false,
  "val": { "intro": { "line": "Le chiffre ne bouge pas. C’est ce qu’il achète qui fond.", "mood": "alerte" } },
  "payload": {
    "value": 820, "unit": "€",
    "start": { "label": "Au départ", "value": 1000 },
    "label": "En vrai, environ",
    "from_screen": 0,
    "lines": [
      { "label": "Sur le compte, toujours", "value": 1000 },
      { "label": "Ce que ça achète encore, environ", "value": 820, "key": true },
      { "label": "2 % par an est une hypothèse", "value": "", "dim": true }
    ]
  }
}
```

**Format du site** :
- clés `question`, `value` (obligatoire), `unit`, `decimals`, `label`, `lines` (0 à 8, `label` et `value` obligatoires), `from_screen` ;
- `scored: true` interdit.

**Différences** :
- **`start` est refusé par le site** (clé inconnue).
- **Une ligne `dim` à valeur vide est refusée** : le site exige une valeur non vide.
- `label` n'est pas affiché par le lecteur web, alors que l'app l'affiche.
- `explanation` n'est affichée ni par l'app ni par le web sur une révélation.

**Comportement avec un pari** (app) :
- pastille « Pile dans le mille » si l'estimation est exacte ;
- « Tout près : tu étais à X » si l'écart est de 10 % au plus, X étant **l'écart**, avec l'unité ;
- sinon « Un peu plus (ou moins) que tu pensais » sous 50 % d'écart, « Bien plus (ou moins) que tu pensais » au-delà (`lessonPlayer.ts:129-134`).

Val passe en `fier` si la personne était proche, en `alerte` sinon, seulement si l'écran a un `val.intro`, dont il garde le texte (`RevealScreen.tsx:92-93`). Les lignes qui répètent un chiffre déjà affiché (la valeur, le départ, l'estimation) sont masquées, **sauf la ligne `key`** (en or) et la ligne `dim`, toujours affichées (corrigé le 17/10/2026 : la ligne dorée de Salaire, 3 055 €, et d'Épargner, 820 €, apparaît).

**Note et révision** : jamais noté, jamais révisé.

**Limites** :
- site : 8 lignes au plus ;
- app : aucune limite codée. Les valeurs des lignes sont affichées sans unité, avec 0 à 2 décimales (`decimals` ne s'y applique pas). Grand chiffre : 92 px, 60 sur un écran bas, 28 au minimum.

### 2.4 `true_false` : vrai ou faux en rafale (format de l'app)

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `question` | texte | non | masquée si elle vaut « Vrai ou faux ? » (Val le dit déjà) |
| `cards[]` | liste | oui, au moins 1 carte valide | sinon écran de secours |
| `cards[].id` | texte | non | index par défaut |
| `cards[].statement` | texte | oui | |
| `cards[].answer` | booléen | oui | |
| `cards[].explanation` | texte | non | verdict de la carte : « C'est vrai : … » |
| `pass` | entier de 1 au nombre de cartes | non | toutes les cartes par défaut |

```json
{
  "type": "true_false",
  "scored": true,
  "notion": "livret_a",
  "val": {
    "correct": { "line": "Tu sais déjà où ranger ton argent.", "mood": "celebrant" },
    "wrong": { "line": "Pas grave, c’est exactement ce qu’on va voir ensemble.", "mood": "rassurant" }
  },
  "payload": {
    "question": "Vrai ou faux ?",
    "pass": 3,
    "cards": [
      { "id": "perte", "statement": "Le Livret A peut te faire perdre des euros.", "answer": false, "explanation": "Ce que tu y mets est garanti." },
      { "id": "dispo", "statement": "L’argent d’un Livret A est disponible à tout moment.", "answer": true, "explanation": "Tu peux le retirer quand tu veux, sans frais." },
      { "id": "coussin", "statement": "Un coussin de sécurité se place en bourse.", "answer": false, "explanation": "Il doit rester disponible et stable, la bourse peut baisser au mauvais moment." },
      { "id": "vingt", "statement": "Mettre 20 € de côté par mois, ça ne sert à rien.", "answer": false, "explanation": "C’est 240 € par an, et surtout une habitude." }
    ]
  }
}
```

**Site** : type inconnu, refusé par le validateur. `API.md` du site en donne un exemple d'une autre forme (`statement`, `answer` à la racine du payload), qui n'est plus valable.

**Réussite** : toutes les cartes jouées **et** au moins `pass` bonnes réponses.

**Réponse envoyée** : `{ "perte": false, "dispo": true, … }`, envoyée d'elle-même après la dernière carte.

**Note et révision** : noté si `scored: true`, révisé par l'app. La feuille de réponse affiche « n bonnes réponses sur N » à la place de l'explication.

**Limites** : carte de hauteur fixe (236 px, environ 193 px utiles), énoncé en 27 px (34 d'interligne) : **5 lignes au plus, 4 en grand texte** ; au-delà, le texte est **coupé sans points de suspension** (`TrueFalseScreen.tsx:51-53, 514`). Explication de carte sur 3 lignes au plus, préfixe « C'est vrai : » compris. La carte suivante arrive seule après 1,5 s, et Val réagit à chaque carte (`interactive.ts:30-43`). Convention : 4 cartes, `pass` à 3.

### 2.5 `order` : remettre dans l'ordre (format de l'app)

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `items[]` | liste de `{id, text}`, **dans l'ordre juste** | oui, au moins 2 | sinon écran de secours |
| `start` | liste d'ids | non | ordre présenté ; retenu seulement si c'est une permutation exacte des ids |
| `axis` | `{start, end, risk}` | non | libellés « Premier » et « Dernier » par défaut ; `risk: true` colore du vert au rouge |

```json
{
  "type": "order",
  "scored": true,
  "notion": "diversification",
  "val": {
    "correct": { "line": "Tu viens de comprendre la diversification.", "mood": "fier" },
    "wrong": { "line": "Presque. Plus ton argent est réparti, moins il est risqué.", "mood": "rassurant" }
  },
  "explanation": "Le Livret A est garanti par l’État. Le fonds en euros protège ton capital. Un ETF Monde répartit ton argent sur des milliers d’entreprises. Une seule action, c’est tout miser sur un seul nom.",
  "payload": {
    "question": "Classe ces placements, du moins risqué au plus risqué.",
    "axis": { "start": "Moins risqué", "end": "Plus risqué", "risk": true },
    "items": [
      { "id": "livret", "text": "Livret A" },
      { "id": "fonds", "text": "Fonds en euros d’une assurance-vie" },
      { "id": "etf", "text": "ETF Monde" },
      { "id": "action", "text": "Action d’une seule entreprise" }
    ],
    "start": ["etf", "action", "livret", "fonds"]
  }
}
```

**Site** : type inconnu. Les anciens `mise_en_ordre` et `association` sont archivés.

**Réussite** : chaque id à sa place, sans crédit partiel.

**Réponse envoyée** : la liste d'ids dans l'ordre choisi.

**Note et révision** : noté si `scored: true`, révisé par l'app.

**Limites** : aucun nombre maximal codé, mais la colonne du rang (14 px) est trop étroite au-delà de 9 éléments. Lignes de 59 px au minimum, texte en 17 px. Les libellés de l'axe sont écrits à la verticale, en capitales sur une ligne : environ 7,4 px par caractère, qui doivent tenir dans la hauteur de la liste. La feuille de réponse montre « a → b → c ». Convention : 4 éléments, dont aucun à sa place au départ.

### 2.6 `match` : associer (format de l'app)

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `pairs[]` | liste de `{id, left, right}` | oui, au moins 2 | sinon écran de secours |
| `right_order` | liste d'ids | non | ordre de la colonne de droite, si c'est une permutation exacte |
| `max_errors` | entier ≥ 0 | non | 0 par défaut |

```json
{
  "type": "match",
  "scored": true,
  "notion": "vocabulaire_crypto",
  "val": {
    "correct": { "line": "Tu parles déjà crypto couramment.", "mood": "celebrant" },
    "wrong": { "line": "Ces mots reviendront souvent : tu vas vite les retenir.", "mood": "rassurant" }
  },
  "payload": {
    "question": "Relie chaque mot à sa définition.",
    "max_errors": 1,
    "pairs": [
      { "id": "bitcoin", "left": "Bitcoin", "right": "La première crypto, créée en 2009" },
      { "id": "stablecoin", "left": "Stablecoin", "right": "Une crypto qui suit la valeur d’une monnaie, comme le dollar" },
      { "id": "blockchain", "left": "Blockchain", "right": "Le registre partagé de toutes les transactions" },
      { "id": "portefeuille", "left": "Portefeuille", "right": "L’outil qui garde tes clés d’accès à tes cryptos" }
    ],
    "right_order": ["blockchain", "portefeuille", "bitcoin", "stablecoin"]
  }
}
```

**Site** : type inconnu.

**Réussite** : toutes les paires trouvées **et** pas plus de `max_errors` erreurs.

**Réponse envoyée** : `{ "errors": 1, "found": ["bitcoin", "stablecoin", "blockchain", "portefeuille"] }`.

**Note et révision** : noté si `scored: true`, révisé par l'app. La feuille affiche « Toutes les paires du premier coup. » ou « n erreurs en chemin. ».

**Limites** : deux colonnes côte à côte, les mots à 40 % de la largeur et les définitions à 60 %, 12 px entre elles (`MatchScreen.tsx:189-201`) ; cellules de 64 px de haut au minimum, texte en 15 px (20 d'interligne). `found` suit l'ordre où les paires ont été trouvées. Convention : 4 paires, aucune définition en face de sa paire.

### 2.7 `allocate` : répartir

**Format de l'app (à règles)**

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `question`, `subtitle` | texte | conseillé | |
| `total` | nombre | **oui** | somme à répartir |
| `step` | nombre > 0 | non | 1 par défaut |
| `unit` | texte | non | |
| `base`, `base_unit` | nombre, texte | non | si `total` vaut 100 : les pots sont en %, avec le montant dessous |
| `buckets[]` | liste | **au moins 2** | |
| `buckets[].key` | slug | oui | |
| `buckets[].label` | texte | oui | |
| `buckets[].hint` | texte | non | lu mais pas affiché aujourd'hui |
| `buckets[].start` | nombre | non | 0 par défaut ; **la somme des `start` doit valoir `total`** |
| `buckets[].reservoir` | booléen | **exactement un pot** | il absorbe les changements, on ne le règle pas directement |
| `buckets[].live` | texte | non | ligne vivante, avec gabarits |
| `rules[]` | liste de `{bucket, min, val}` | **au moins 1** | `val` : réplique de Val si la règle est violée |

Gabarits admis dans `live` et dans `val.correct.line` :
- `{clé}` : la valeur du pot ;
- `{clé*12}` : la valeur multipliée par 12 ;
- `{clé_montant}` : le montant en euros, si `base` est donné.

```json
{
  "type": "allocate",
  "scored": true,
  "notion": "budget_50_30_20",
  "val": {
    "correct": { "line": "{epargne} % de ta paie, c’est {epargne_montant} € par mois et {epargne_montant*12} € dans un an, sans y penser.", "mood": "fier" },
    "wrong": { "line": "Essaie d’en garder au moins 10 %. Tes envies s’en remettront.", "mood": "rassurant" }
  },
  "payload": {
    "question": "Ta paie de 1 800 € vient de tomber. Quelle part pour chaque pot ?",
    "total": 100, "step": 5, "unit": "%", "base": 1800, "base_unit": "€",
    "buckets": [
      { "key": "besoins", "label": "Besoins", "hint": "Loyer, courses, transport", "start": 70 },
      { "key": "envies", "label": "Envies", "hint": "Sorties, achats", "start": 30, "reservoir": true },
      { "key": "epargne", "label": "Épargne", "start": 0, "live": "Dans un an : {epargne_montant*12} €" }
    ],
    "rules": [
      { "bucket": "epargne", "min": 10, "val": { "line": "Essaie d’en garder au moins 10 %. Tes envies s’en remettront.", "mood": "rassurant" } },
      { "bucket": "besoins", "min": 50, "val": { "line": "Garde au moins la moitié pour le loyer et les courses.", "mood": "rassurant" } }
    ]
  }
}
```

**Format du site (à cibles)** :
- clés `question`, `subtitle`, `total` (> 0), `step`, `unit` (« € » par défaut), `remaining_label`, `insight`, `buckets` ;
- `question` obligatoire ; `step` obligatoire si l'écran est noté ;
- `buckets` : 2 à 5 postes `{key, label, target, tolerance, locked, max}`, `target` numérique ≥ 0, `max` ≥ `target` ;
- écran noté : au moins 2 postes libres, chacun avec une `tolerance` ≥ 0 ; somme des cibles = `total` ; cibles des postes libres et `total` multiples du pas ;
- écran non noté : tous les postes verrouillés, somme des cibles ≤ `total` ;
- `review: false` obligatoire.
- **Réussite côté site** : chaque poste libre a une valeur entre 0 et `max` (`total` par défaut) et à `tolerance` près de sa cible ; la somme des postes libres et des cibles des postes verrouillés vaut exactement `total` (`ScreenGrader.php:95-121`).

**Différences** : les deux formats sont incompatibles.
- L'app joue le format à règles et met le format à cibles en écran de secours.
- Le site corrige le format à cibles et jugerait faux un écran à règles, qui n'a pas de cible.
- Le site interdit la révision de ce type ; l'app le révise.

**Réussite (app)** : chaque règle respectée (`valeur ≥ min`). La première règle violée donne sa réplique, et son pot clignote. L'explication n'est jamais affichée : Val parle à sa place.

**Réponse envoyée** : `{ "besoins": 60, "envies": 25, "epargne": 15 }`.

**Limites** :
- site : 2 à 5 postes ;
- app : 5 couleurs de pots, en boucle. Le texte d'un segment de la barre ne s'affiche que s'il fait au moins 40 px de large ; barre de 40 px de haut, pourcentages en 22 px ; légende « S'ajuste quand tu bouges les autres » sous le réservoir. Les gabarits acceptent n'importe quel facteur (`{clé*N}`, `interactive.ts:172`).
- Convention : 3 pots.

### 2.8 `simulator` : simulateur (format de l'app)

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `question`, `subtitle` | texte | conseillé | |
| `label` | texte | non | libellé du curseur |
| `min`, `max` | nombre | **oui**, `max > min` | |
| `step`, `start`, `unit` | | non | comme pour `slider` |
| `formula` | texte | **oui** | `savings_from_age` ou `loan_over_years` |
| `params` | objet de nombres | non | |
| `outputs[]` | liste de `{key, label, unit, big, caption}` | **au moins 1** | `caption` : `{}` est remplacé par la valeur |
| `ranges[]` | liste de `{min, max, line, mood}`, **à plat** | non | réplique de Val selon la valeur du curseur ; bornes incluses |

Formules connues (`src/lesson/formulas.ts`) :

| Formule | Paramètres (défaut) | Sorties |
|---|---|---|
| `savings_from_age` (le curseur est l'âge de départ) | `monthly` (100), `rate` (0,05), `end_age` (65) | `capital`, `paid` |
| `loan_over_years` (le curseur est la durée en années) | `capital` (200 000), `rate` (0,035) | `monthly`, `interest` |

```json
{
  "type": "simulator",
  "scored": false,
  "payload": {
    "question": "Et si tu commençais plus tôt, ou plus tard ? Bouge le curseur.",
    "subtitle": "100 € par mois jusqu’à 65 ans, à 5 % par an.",
    "label": "Âge de départ", "min": 20, "max": 50, "step": 1, "start": 30, "unit": "ans",
    "formula": "savings_from_age",
    "params": { "monthly": 100, "rate": 0.05, "end_age": 65 },
    "outputs": [
      { "key": "capital", "label": "Ton capital à 65 ans", "unit": "€", "big": true },
      { "key": "paid", "label": "Total versé", "unit": "€", "caption": "dont {} versés" }
    ],
    "ranges": [
      { "max": 29, "line": "Commencer tôt, c’est le meilleur cadeau à te faire.", "mood": "complice" },
      { "min": 30, "max": 40, "line": "Chaque année gagnée compte, et il n’est pas trop tard.", "mood": "complice" },
      { "min": 41, "line": "Moins de temps, donc plus d’effort par mois : mais ça reste utile.", "mood": "complice" }
    ]
  }
}
```

**Site** : type inconnu. Le `live_month` du site est un autre exercice (voir 2.12).

**Réussite** : aucune. Le simulateur n'est jamais noté ; « Continuer » s'active **au lâcher** du curseur, et la réplique de `ranges` n'arrive qu'après un premier mouvement (`SimulatorScreen.tsx:64-75`). `explanation`, `val.correct` et `val.wrong` ne servent jamais (pas de feuille de réponse).

**Limites** :
- une formule inconnue affiche 0 partout, sans courbe ;
- les résultats sont arrondis à l'unité ;
- la courbe compte 24 points, avec des légendes propres à chaque formule ;
- une seule grande valeur : la première sortie `big: true`, à défaut la première sortie ; les autres s'affichent en petit (56 px pour la grande, 28 au minimum). `caption` ne remplace que le premier `{}` ; sans `caption`, la ligne est « label : valeur » (`SimulatorScreen.tsx:50, 97`).
- **Leçons découvertes** : le simulateur de Logement prend son `max` et son `start` dans la durée maximale d'un crédit (`credit_duree_max`, `buildLogement`).

### 2.9 `dialogue` : dialogue

**Format de l'app (en messages)**

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `question` | texte | non | |
| `character` | `{name, role}` | `name` **obligatoire** | avatar à l'initiale du nom |
| `messages[]` | liste de textes | **au moins 1** | le premier message arrive après 600 ms de « il écrit », les suivants toutes les 750 ms ; les réponses n'apparaissent qu'après le dernier |
| `replies[]` | liste de `{id, text, correct, reaction}` | **au moins 2**, `id` et `text` obligatoires | `reaction` : réponse du personnage |

```json
{
  "type": "dialogue",
  "scored": true,
  "notion": "risque_crypto",
  "val": {
    "correct": { "line": "Exactement : on ne place pas son argent sur un simple conseil, sans comprendre ce qu’on achète. Et jamais plus que ce qu’on peut perdre.", "mood": "fier" },
    "wrong": { "line": "Une crypto inconnue qui promet ×10, c’est souvent comme ça que commencent les arnaques. D’abord comprendre ce qu’on achète.", "mood": "rassurant" }
  },
  "explanation": "Un proche qui promet un gain énorme sur une crypto inconnue : c’est le schéma classique des arnaques, même quand il est de bonne foi. Avant d’acheter, il faut savoir ce que c’est, qui l’a créée et comment on peut perdre. Et même là, on n’y met jamais plus que ce qu’on peut se permettre de perdre.",
  "payload": {
    "character": { "name": "Léo", "role": "ton pote, très enthousiaste" },
    "messages": ["J’ai trouvé une nouvelle crypto, elle va faire ×10 cette année. Mets tout ton livret dessus !"],
    "replies": [
      { "id": "tout", "text": "Grave, je mets tout.", "reaction": "Euh… et si ça fait comme en 2022 ?" },
      { "id": "petite", "text": "Je mets juste une petite somme pour voir, au pire je ne perds pas grand-chose.", "reaction": "Mouais… Tu sais au moins ce que c’est ? Parce que moi, pas trop." },
      { "id": "comprendre", "text": "Pas sur un simple conseil. Je veux d’abord comprendre ce que j’achète, et jamais plus que ce que je peux perdre.", "correct": true, "reaction": "Ouais… En vrai, je ne sais même pas qui l’a créée. Je vais me renseigner avant, moi aussi." }
    ]
  }
}
```
(Tiré de `src/lesson/discovery/crypto.ts`, version du 17 octobre 2026 ; vérifié par `tests/discovery.test.ts`.)

**Format du site (une réplique)** :
- clés `question`, `speaker` (obligatoire), `line` (obligatoire), `replies` ;
- `replies` : 2 à 5 réponses `{id, text, cost, correct}` ;
- écran noté : au moins une réponse juste.

**Différences** :
- `speaker` et `line` donnent l'écran de secours dans l'app ; `character` et `messages` sont refusés par le site.
- `cost` (par exemple « −8 € ») n'est pas lu par l'app ; `reaction` est inconnu du site.

**Réussite** : la réponse choisie a `correct: true`. La règle est la même des deux côtés.

**Réponse envoyée** : l'id de la réponse (`"comprendre"`), envoyé de lui-même après la réaction du personnage (850 ms avant la réaction, puis 500 ms avant la feuille).

**Feuille de réponse** : `explanation` y est affichée, avec la réplique de Val, et « La bonne réponse : <texte de la réponse juste> » en cas d'erreur (`DialogueScreen.tsx:88`, `ApprendreDetailScreen.tsx:528`).

**Note et révision** : noté si `scored: true`. Révisé par l'app et par le serveur.

**Limites** :
- site : 2 à 5 réponses ;
- app : aucune limite codée. Chaque message ajoute 750 ms d'attente ; 1 à 3 messages sont conseillés. Avatars de 48 et 40 px, bulles sans troncature.

### 2.10 `document` : relevé à lire

L'app reçoit le document **déjà résolu par le site** : elle ne lit jamais l'artefact.

**Ce que le site attend à l'écriture** :
- sur l'écran : `artifact` (slug, obligatoire) et `variant` (`"random"` par défaut, ou le slug d'une variante) ;
- payload : `question`, `subtitle`, `mode` (`pick` ou `select`), `target` (étiquette des lignes justes, obligatoire si noté) ;
- contrôle de cohérence de chaque variante :
  - `pick` : exactement une ligne visée ; `select` : au moins une ;
  - **la question ne doit pas nommer la réponse** ;
  - ids uniques.

```json
{
  "type": "document",
  "notion": "taille_coussin",
  "scored": true,
  "artifact": "releve_bancaire",
  "variant": "random",
  "val": {
    "intro": { "line": "On ne cherche pas les sorties du samedi. On cherche ce qui part sans que tu fasses rien.", "mood": "neutre" },
    "correct": { "line": "C'est cette base-là qui sert à calculer un coussin.", "mood": "fier" },
    "wrong": { "line": "Ce qui revient tous les mois compte, même ce que tu as oublié avoir souscrit.", "mood": "rassurant" }
  },
  "explanation": "Un coussin se calcule sur ce qui tombe quoi qu'il arrive, pas sur ce qu'on peut couper le mois prochain.",
  "payload": { "question": "Touche toutes les charges qui reviennent chaque mois.", "mode": "select", "target": "charge_recurrente" }
}
```

**Ce que l'app reçoit et lit** (payload résolu) :

| Champ | Type | Lu par l'app |
|---|---|---|
| `mode` | `pick` ou `select` | oui |
| `entete` | `{etablissement, numero, periode, iban_masque}` | oui |
| `lines[]` | lignes `{zone: "ligne", type, id, date, libelle, sous_libelle, montant, revelation, correct}` | oui ; `type` vaut `normale`, `section`, `total` ou `gros` ; une ligne sans `id` n'est pas touchable |
| `lines[]` en `zone: "recap"` | cellules de récapitulatif | **non** |
| `solde` | `{libelle, montant}` | oui |
| `a_venir` | texte, ou liste de `{date, libelle, montant}` | oui |
| `entete.vue: "bulletin"`, `conges`, `footer`, `brut`, champs `base`, `taux`, `deduire`, `payer`, `patronale` | bulletin de paie | **non** : l'app l'affiche comme un relevé |

**Différences** :
- **Une cellule de récapitulatif marquée `correct` rendrait l'écran impossible à réussir dans l'app** : la correction l'attend, mais elle n'est pas touchable.
- Le bulletin de paie n'a pas de rendu dans l'app.

**Réussite** : l'ensemble des lignes touchées est exactement l'ensemble des lignes `correct`.

**Réponse envoyée** : un id (`pick`), ou une liste d'ids (`select`).

**Note et révision** : noté si `scored: true`. Révisé par l'app et par le serveur ; la variante tirée reste figée pendant la session.

**Limites** : libellé sur 2 lignes au plus (13 px), `sous_libelle` sans limite, colonne de date de 44 px. Montants en € avec 2 décimales : signés pour les lignes et `a_venir`, sans « + » pour le `solde` ; un montant positif est en vert. `revelation` s'affiche après validation sous les lignes touchées ou à trouver, et la page défile jusqu'à la première erreur (`DocumentScreen.tsx`).

### 2.11 `number` : nombre à saisir (site seulement)

```json
{
  "type": "number",
  "notion": "solde_disponible",
  "scored": true,
  "val": { "intro": { "line": "Fais le calcul toi-même.", "mood": "determine" }, "correct": { "line": "Juste.", "mood": "celebrant" }, "wrong": { "line": "Presque.", "mood": "rassurant" } },
  "explanation": "200 € affichés, moins 40 € de prélèvement à venir : il te reste réellement <strong>160 €</strong>.",
  "payload": { "question": "Solde affiché 200 €, un prélèvement de 40 € arrive. Combien peux-tu dépenser ?", "unit": "€", "hint": "Un nombre entier suffit.", "answer": 160, "tolerance": 0 }
}
```

**Site** :
- clés `question` (obligatoire), `subtitle`, `unit`, `hint`, `answer` (obligatoire si noté), `tolerance` (≥ 0), `trap`, `trap_found` ;
- correction : comme `slider` ;
- **révisable**.

**App** :
- aucun écran : écran de secours, aucune réponse envoyée ;
- `grade.ts` saurait pourtant le corriger.

**Conséquence** : un `number` noté, dans une leçon ou dans une révision du serveur, est **compté comme raté**. Aucune leçon réelle n'en contient aujourd'hui.

### 2.12 `live_month` : mois vécu (site seulement)

**Site** :
- clés `question`, `intro` (obligatoire), `starting_balance` (obligatoire), `unit`, `days` (28 à 31) ;
- `events` : 3 à 12 événements, avec un jour qui ne décroît pas, un montant fixe ou 2 à 4 options ;
- `outcome_thresholds` : seuils `{min, label, mood}` ;
- `days` vaut 30 par défaut ; un événement forcé n'a pas d'options, un événement à choix n'a pas de montant propre (options `{label, amount, note}`) ;
- seuils : `min` uniques, le plus bas au plus égal au solde final du pire parcours ;
- règles d'écran : `scored: true` obligatoire, sans `val.correct`, `val.wrong` ni `explanation`, avec `review: false`.

**Correction** : le parcours est juste s'il est complet (un index d'option valide par événement à choix). Le solde final ne compte pas.

**App** : aucun écran, donc écran de secours. **Toujours noté, il serait toujours compté comme raté.**

L'exemple complet est dans `tests/Support/BuildsReaderDemoLesson.php` du site.

### 2.13 Anciens types

Les types de l'ancien contenu (`qcm`, `vrai_faux`, `mise_en_ordre`, `association`, `slide`, `hook`, `summary`, `application_personnelle`, `defi`…) sont refusés par le validateur depuis le 14 septembre 2026. L'éditeur d'administration, le générateur IA (désactivé), les épreuves de module du web et le service des défis les connaissent encore. L'app ne les joue pas.

---

## 3. Leçon et module

### 3.1 Leçon

**Colonnes `lessons` (site)** :
- `id`, `module_id`, `slug` (unique), `title`, `description` ;
- `order` (entier, non unique) ;
- `xp_reward` (50 par défaut) ;
- `difficulty` : enum `debutant`, `intermediaire`, `avance` ;
- `is_published` (seul critère d'exposition ; `status` sert à la modération) ;
- `questions_data` (JSON) ;
- `summary`, `benefit`, `duration_minutes`, `estimated_duration` ;
- `icon`, `color`, `competence` (vestige).

**Contenu `questions_data`** : `{ "objective": "…", "screens": [ … ] }`. **Aucune autre clé racine n'est admise.**

**`GET /api/lessons/{id}`** (et `GET /api/lessons/slug/{slug}`, même réponse) renvoie `{ id, slug, title, description, objectif, notions[{slug, nom}], xp_reward, estimated_duration, difficulty, order, module{id, slug, title, color}, screens[…], user_progress{completed, status, best_score} }`. Les écrans sont servis **résolus** : version `selon_chiffres` choisie, jetons remplacés, `has_volatile_note` et `volatile_verified_at` ajoutés, variante d'artefact tirée.

**Ce que l'app lit** :

| Champ | Lu | Usage |
|---|---|---|
| `title` | oui | titre |
| `screens[]` | oui | les écrans (un tableau seul est aussi accepté) |
| `takeaway` | oui, **le site ne l'envoie pas** | phrase « À retenir » et déclic du carnet |
| `objectif` | non | — |
| `notions`, `difficulty`, `order`, `user_progress`… | non | — |

**Déclic avec mots clés entre crochets** (`takeaway`) :
- une phrase, avec 1 à 3 mots clés entre crochets : « Mis de côté en [premier], ton argent ne perd plus sa [valeur]. » ;
- à la fin de la leçon, l'app retire les crochets avec `unmark` (`normalize.ts:66-69`, après retrait des balises) ; le carnet et son test utilisent `plainDeclic` et lisent les mots clés avec `/\[([^\]]+)\]/g` (`declicKeywords`, `utils/notebook.ts`) ;
- le test du carnet masque un mot clé tiré au hasard parmi les mots marqués, et propose 3 réponses ;
- le nombre de 1 à 3 mots clés n'est pas contrôlé par l'app ;
- sans crochets, le mot le plus long (5 lettres au moins, lettres seules, hors mots courants) est masqué.

**Autres champs racine des leçons découvertes** : `hook`, la phrase d'accroche de la carte de l'accueil sans compte, lue par `utils/discoveryHome.ts`, pas par `normalize.ts`.

**Dans `GET /api/modules`, une leçon** vaut `{ id, slug, title, description, xp_reward, completed }`.
- L'ordre est celui du tableau. La première leçon non terminée est « en cours », les suivantes sont verrouillées.
- L'app sait lire aussi `kind` (`lesson`, `review`, `challenge`, `case`) pour la forme de l'étape du chemin ; le site ne l'envoie pas.

### 3.2 Module

**Colonnes `modules` (site)** :
- `slug`, `title`, `description` (le « déclic » du module à l'import) ;
- `difficulty`, `order`, `is_published`, `theme_id` (l'univers) ;
- `icon`, `color`, `cover_image`, `icon_image`, `type`, `duree_estimee_minutes`, `nombre_lecons`, `is_optional`.

**Difficulté, cinq valeurs** : `entree`, `debutant`, `inter`, `avance`, `expert`.
- C'est l'enum de `modules.difficulty`, et l'ordre de `LEVEL_ORDER` dans `src/utils/levels.ts`.
- Libellés de l'app : Entrée, Débutant, Intermédiaire, Avancé, Expert.
- Alias lus par l'app : `intermediaire`, `intermediate`, `moyen` et `medium` donnent `inter` ; `beginner`, `facile` et `easy` donnent `debutant`.
- Un module sans niveau, dans un univers qui en a, compte comme `inter`.
- **Déblocage** : un niveau s'ouvre quand tous les modules des niveaux précédents sont terminés.

**La leçon a sa propre difficulté, à trois valeurs** (`debutant`, `intermediaire`, `avance`, `debutant` par défaut). Elle fixe le montant des coffres (une valeur inconnue prend le barème `debutant`), et elle est renvoyée par `GET /api/lessons/{id}` et l'export JSON du module, sans que l'app la lise. L'import (`ModuleAvantDInvestirSeeder`) recopie le niveau du module dans la leçon sans correspondance : `inter`, `entree` et `expert` n'y entrent pas. Le module importé aujourd'hui est `debutant`, donc l'import passe. Une correspondance de 5 vers 3 valeurs existe (`lessonDifficultyFromModule`, `AdminModuleController.php:310-318` : `entree` et `debutant` → `debutant`, `inter` → `intermediaire`, `avance` et `expert` → `avance`), mais elle ne sert qu'au prompt de génération IA, coupé.

**`GET /api/modules`** renvoie `{ id, slug, title, icon, color, difficulty, lessons_count, lessons_completed, lessons[…], universe{id, slug, name} | null }`.
- L'app déduit l'état d'un module (terminé, commencé, nouveau) de `lessons[].completed`.
- Ordre : celui de la réponse ; dans un univers, celui de `module_ids`.

### 3.3 Univers
- **Site** : table `themes` (15 univers en 4 familles).
- **`GET /api/universes`** renvoie `{ id, slug, name, description, position, module_ids }`.
- **Univers d'un module pour l'app** : `module.universe.id`, sinon l'univers dont `module_ids` le contient.
- Couleur : `(position − 1) mod 4` parmi ardoise, sarcelle, cuivre, ivoire. Illustrations : par slug.

### 3.4 Règles de validation du site
1. **`LessonFormatValidator`**, seul validateur du format :
   - toutes les règles des parties 1 et 2 ;
   - seules les clés racine `objective` et `screens` ;
   - 1 à 3 notions par leçon, toutes existantes ;
   - jetons `{{cle}}` existants ;
   - **aucun chiffre réglementaire écrit en dur** (partie 3.6) ;
   - écrans `selon_chiffres` : structure, puis chaque version validée comme un écran ordinaire ;
   - cohérence des artefacts.

   Les contrôles en base (notions, jetons, chiffres en dur, `selon_chiffres`, artefacts) ne tournent qu'avec `checkNotionsExist = true`, ce que font tous les appelants : `php artisan lessons:check-format [--sync]`, la route interne `POST /api/internal/check-format`, l'import et les tests. **Le validateur n'est appelé ni à la sauvegarde ni à la publication dans l'administration.**
2. **Administration d'une leçon** :
   - `title` (obligatoire), `difficulty` (obligatoire, parmi les 3 valeurs) ;
   - `xp_reward` de 0 à 1000, `estimated_duration` de 1 à 60 ;
   - `questions_data` sans contrôle de format. Par défaut l'éditeur écrit l'ancien format (`{"questions": []}`), lu comme une leçon vide.
   - **À la publication** (pas pour un brouillon) : refus (422) si un chiffre réglementaire est écrit en dur dans `title`, `description` ou `questions_data` (`AdminLessonController.php:235-245`). Même règle à l'approbation d'une leçon en revue.
3. **Administration d'un module** : `difficulty` obligatoire parmi les 5 valeurs, `theme_id` existant.
4. **Génération IA** : désactivée (réponse 423). Son prompt produit l'ancien format.
5. **Au service** :
   - incohérence d'artefact : 409 ;
   - jeton `{{cle}}` restant : 409 sur le web seulement ;
   - écran `selon_chiffres` dont la comparaison est impossible : version `sinon`, avec un avertissement ;
   - leçon non publiée : 404.

### 3.5 Ce que l'app attend en plus
- `takeaway` à la racine de la leçon, avec ses crochets (lot serveur 4.1).
- La route publique `GET /api/regulatory-figures`, que l'app lit déjà pour ses leçons découvertes (partie 3.6). Elle existe depuis le 17 octobre 2026.
- La validation et la correction des types `true_false`, `order`, `match`, `simulator`, et des formats de l'app pour `allocate` et `dialogue` (lot serveur 4.2 et section 9).
- `lessons[].kind` (4.4), les dates d'activité (4.6), et `best_run` à la fin d'une leçon (4.9).

### 3.6 Chiffres réglementaires : les repères `{{cle}}`

Un taux, un plafond, un seuil, un barème ou une durée fixés par la loi **ne s'écrivent jamais en nombre** dans une leçon : on écrit son repère `{{cle}}`, que le site remplace au service par la valeur en vigueur. La source unique est la table `regulatory_figures` du site, tenue dans l'administration (« Chiffres réglementaires ») et rafraîchie par `figures:refresh`.

**Écriture**
- Motif : `{{cle}}`, espaces tolérés (`{{ livret_a_taux }}`), clé en `a-z A-Z 0-9 _ .`.
- **La valeur porte son unité** : `{{livret_a_taux}}` donne « 1,7 % », `{{livret_a_plafond}}` donne « 22 950 € », `{{pea_duree_exoneration}}` donne « 5 ans ». On n'écrit donc jamais « {{livret_a_taux}} % ».
- Une liste s'affiche entière : `{{ir_bareme_taux}}` donne « 0 % / 11 % / 30 % / 41 % / 45 % ». Pour citer une seule valeur, il faut une clé à elle.
- **Pas de calcul** à partir d'un chiffre de la table (« 31,4 % de 5 000 €, soit 1 570 € ») : le résultat deviendrait faux au changement suivant. On décrit le mécanisme, ou on prend un exemple qui n'en dépend pas.
- **Pas de comparaison** qui suppose la valeur du jour (« le livret le mieux payé ») : si la bonne réponse en dépend, l'écran utilise `selon_chiffres` (plus bas).
- Où : dans tous les textes de l'écran, à toute profondeur (`question`, `options[].text`, `lines[].label`, `val.*.line`, `explanation`…). **Pas dans un artefact** (`document`) : son contenu est injecté après la substitution, et le contrôle le refuse. Pas dans le titre, la description ni l'objectif de la leçon, qui ne sont pas résolus.

**Ce que fait le site**
- `LessonVariableService::apply()` remplace les repères au service (`GET /api/lessons/{id}`, lecteur web, révision). Un écran qui a reçu au moins un chiffre repart avec `has_volatile_note: true` et `volatile_verified_at` (la date de vérification la plus ancienne de ses chiffres) : le web affiche « Taux en vigueur au … », **l'app ne l'affiche pas**.
- **Contrôle de format** (`lessons:check-format`, import) : une clé inconnue est refusée, **et un chiffre réglementaire écrit en dur aussi** (« le LEP rapporte 2,5 % » → « écrire {{lep_taux}} »), qu'il soit périmé ou exact. Le contrôle (`HardcodedFigureDetector`) voit les pourcentages et les montants voisins d'un terme connu (Livret A, flat tax, plafond du PEA…) ; il ne voit pas les durées.
- **Publication** : la même règle refuse la mise en ligne d'une leçon, d'une définition, d'un article ou d'un parcours de vie dans l'administration, et à la revue. `php artisan content:hardcoded-figures` relève tout le contenu en base, brouillons compris (en production au 17/10/2026 : 0).
- **Route publique** `GET /api/regulatory-figures` (sans compte, lecture seule, cache de 10 min) : `{ data: [{ key, value, value_format, effective_at, verified_at }], meta: { count } }`.

**Bonne réponse qui dépend des chiffres : `selon_chiffres`** (site, depuis le 17/10/2026)

Un repère change un chiffre, pas la logique d'une question. Quand la bonne réponse dépend de l'écart entre deux chiffres, l'écran porte deux versions et le serveur choisit celle qui correspond aux valeurs en vigueur, **au service, à la fin de la leçon et en révision** (`Lesson\FigureCondition`). L'app ne voit jamais la clé : elle reçoit un écran ordinaire.

```json
{
  "type": "choice",
  "notion": "livrets_reglementes",
  "scored": true,
  "val": { "intro": { "line": "Compare les deux taux, puis regarde les plafonds.", "mood": "neutre" } },
  "payload": {
    "question": "Tu as 22 ans, 2 000 € de coussin, et tu as droit au LEP, à {{lep_taux}}. Ta banque paie le Livret jeune au taux minimum, {{livret_jeune_taux}}. Tu les ranges comment ?",
    "mode": "single"
  },
  "selon_chiffres": {
    "si": { "superieur": ["lep_taux", "livret_jeune_taux"] },
    "alors": {
      "val": {
        "correct": { "line": "Le LEP paie plus, et son plafond suffit : tout y va, et tout reste disponible.", "mood": "celebrant" },
        "wrong": { "line": "Ici, le LEP paie plus que le Livret jeune, et son plafond de {{lep_plafond}} suffit : tout va sur le LEP.", "mood": "rassurant" }
      },
      "explanation": "On remplit d'abord le livret qui paie le plus, jusqu'à son plafond, puis on déborde sur le suivant. Avec ces taux, c'est le LEP.",
      "payload": { "options": [
        { "id": "a", "text": "Tout sur le Livret jeune", "correct": false },
        { "id": "b", "text": "{{livret_jeune_plafond}} sur le Livret jeune, le reste sur le LEP", "correct": false },
        { "id": "c", "text": "Tout sur le LEP", "correct": true },
        { "id": "d", "text": "Tout sur le Livret A, pour n'avoir qu'un seul livret", "correct": false }
      ] }
    },
    "sinon": {
      "val": {
        "correct": { "line": "Tu remplis d'abord le mieux payé, le Livret jeune, puis le reste va sur le LEP. Tout reste disponible.", "mood": "celebrant" },
        "wrong": { "line": "Le Livret jeune paie plus, mais il s'arrête à {{livret_jeune_plafond}} : le reste va sur le LEP.", "mood": "rassurant" }
      },
      "explanation": "On remplit d'abord le livret qui paie le plus, jusqu'à son plafond, puis on déborde sur le suivant. Avec ces taux, c'est le Livret jeune.",
      "payload": { "options": [
        { "id": "a", "text": "Tout sur le Livret jeune", "correct": false },
        { "id": "b", "text": "{{livret_jeune_plafond}} sur le Livret jeune, le reste sur le LEP", "correct": true },
        { "id": "c", "text": "Tout sur le LEP", "correct": false },
        { "id": "d", "text": "Tout sur le Livret A, pour n'avoir qu'un seul livret", "correct": false }
      ] }
    }
  }
}
```
(Leçon « Où mettre ce coussin », écran 7, en production.)

- Opérateurs : `superieur` (>) et `superieur_ou_egal` (≥), entre deux clés comparées par leur valeur numérique (« 2,5 % » → 2,5).
- `alors` et `sinon` remplacent les champs de l'écran (fusion des objets ; une liste, comme `options`, est remplacée en entier). `type`, `notion` et `scored` restent communs.
- Le contrôle de format valide la structure, l'existence et le caractère numérique des deux clés, puis **chaque version** comme un écran ordinaire.
- Comparaison impossible au service : version `sinon`, avec un avertissement dans le journal.

**Côté app**
- Les leçons du site arrivent résolues : l'app ne lit ni `{{cle}}` ni `selon_chiffres`.
- Les **leçons découvertes**, jouées sans compte, lisent la route publique (`src/state/regulatoryFigures.ts`) : chiffres gardés sur le téléphone (`valtheria:chiffres-reglementaires`), redemandés au plus toutes les 12 h, valeurs de secours dans `src/utils/regulatoryFigures.ts` (production du 17/10/2026) si la route n'a jamais répondu. Une leçon prend les chiffres à son ouverture et ne change pas en cours de route.
- `discoveryLesson(objective, figures)` construit Impôts, Épargner et Logement à partir des chiffres (`buildImpots`, `buildEpargner`, `buildLogement` : barème, inflation, durée maximale d'un crédit, et chaque montant calculé), puis remplace les repères des autres textes (`fillFiguresDeep`, par exemple le taux et le seuil d'imposition des cryptos). Clés lues : `ir_bareme_taux`, `ir_bareme_seuils`, `inflation_annuelle`, `credit_duree_max`, `crypto_taux_imposition`, `crypto_seuil_exoneration`. Une clé inconnue est retirée du texte, jamais affichée en accolades.

**Liste complète des clés** (89, valeurs servies par la production le 17/10/2026 ; « — » : date d'effet non lue dans un texte). Formats : `percent`, `amount`, `duration` (« N ans »), `list` (montants ou pourcentages séparés par « / »), `text` (60 caractères au plus).

**Livrets réglementés**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `livret_a_taux` | Taux du Livret A | percent | 1,7 % | 01/08/2026 |
| `livret_a_plafond` | Plafond de versement du Livret A | amount | 22 950 € | — |
| `ldds_taux` | Taux du LDDS | percent | 1,7 % | 01/08/2026 |
| `ldds_plafond` | Plafond de versement du LDDS | amount | 12 000 € | — |
| `lep_taux` | Taux du LEP | percent | 2,5 % | 01/08/2026 |
| `lep_plafond` | Plafond de versement du LEP | amount | 10 000 € | — |
| `lep_rfr_plafond_1part` | Plafond de revenu fiscal de référence pour une part (accès au LEP) | amount | 23 028 € | — |
| `livret_jeune_taux` | Taux minimum du Livret Jeune | percent | 1,7 % | 01/08/2026 |
| `livret_jeune_plafond` | Plafond de versement du Livret Jeune | amount | 1 600 € | — |
| `livret_jeune_age` | Âges d'ouverture du Livret Jeune | text | 12 à 25 ans | — |

**PEA**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `pea_plafond` | Plafond de versement du PEA | amount | 150 000 € | — |
| `pea_pme_plafond_propre` | Plafond de versement du PEA-PME seul | amount | 225 000 € | — |
| `pea_pme_plafond` | Plafond global cumulé PEA + PEA-PME | amount | 225 000 € | — |
| `pea_jeune_plafond` | Plafond de versement du PEA Jeune (18-25 ans) | amount | 20 000 € | — |
| `pea_duree_exoneration` | Durée de détention du PEA pour l'exonération d'impôt | duration | 5 ans | — |
| `pea_frais_ouverture_plafond` | Plafond des frais d'ouverture d'un PEA bancaire | amount | 10 € | — |

**Fiscalité**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `flat_tax_taux` | Taux global de la flat tax (PFU) sur les revenus du capital, cas général | percent | 31,4 % | — |
| `pfu_ir_taux` | Part impôt sur le revenu de la flat tax (PFU) | percent | 12,8 % | 01/01/2018 |
| `pfu_taux_reduit` | Flat tax globale des produits restés à l'ancien taux de prélèvements sociaux (assurance-vie, PEL et CEL ouverts avant 2018) | percent | 30 % | 01/01/2026 |
| `prelevements_sociaux_capital` | Prélèvements sociaux sur revenus du capital (cas général, dont PEA) | percent | 18,6 % | — |
| `prelevements_sociaux_reduits` | Prélèvements sociaux à taux historique (assurance-vie, revenus fonciers, plus-values immobilières, PEL et CEL ouverts avant 2018) | percent | 17,2 % | — |
| `csg_capital_taux` | CSG sur les revenus du capital, cas général | percent | 10,6 % | 01/01/2026 |
| `crds_taux` | CRDS sur les revenus du capital | percent | 0,5 % | — |
| `ifi_seuil` | Seuil de patrimoine immobilier net taxable à l'IFI | amount | 1 300 000 € | 01/01/2018 |
| `tva_taux` | Taux de TVA (normal / intermédiaire / réduit / particulier) | list | 20 % / 10 % / 5,5 % / 2,1 % | 01/01/2014 |
| `metaux_precieux_taxe_forfaitaire` | Taxe forfaitaire sur la vente de métaux précieux (CRDS comprise) | percent | 11,5 % | 01/01/2018 |
| `metaux_precieux_pv_taux` | Taux global sur la plus-value de métaux précieux au régime réel (impôt + prélèvements sociaux) | percent | 36,2 % | — |

**Épargne long terme**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `per_plafond` | Plafond de déduction des versements PER (salarié) | amount | 37 680 € | — |
| `per_deduction_taux` | Plafond de déduction des versements PER d'un salarié, en % des revenus professionnels (avec plancher et plafond en euros) | percent | 10 % | — |
| `assurance_vie_seuil` | Seuil de versements cumulés sur une assurance-vie au-delà duquel la part correspondante des gains perd le taux réduit | amount | 150 000 € | — |
| `assurance_vie_abattement` | Abattement annuel sur les GAINS rachetés d'une assurance-vie après 8 ans (personne seule / couple) | list | 4 600 € / 9 200 € | — |
| `assurance_vie_duree_abattement` | Durée de détention de l'assurance-vie pour l'abattement | duration | 8 ans | — |
| `assurance_vie_abattement_deces` | Abattement par bénéficiaire sur les capitaux décès (primes versées avant 70 ans) | amount | 152 500 € | — |
| `assurance_vie_taux_deces` | Taux sur les capitaux décès au-delà de l'abattement (tranche basse puis tranche haute) | list | 20 % / 31,25 % | — |
| `assurance_vie_abattement_apres70` | Abattement global sur les primes versées après 70 ans | amount | 30 500 € | — |
| `assurance_vie_seuil_taux_deces` | Montant taxable par bénéficiaire au-delà duquel le taux haut des capitaux décès s'applique | amount | 700 000 € | — |

**Épargne logement**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `pel_taux` | Taux de rémunération d'un PEL ouvert cette année | percent | 2 % | 01/01/2026 |
| `cel_taux` | Taux de rémunération du CEL (compte épargne logement) | percent | 1,25 % | 01/08/2026 |
| `pel_plafond` | Plafond de versement du PEL | amount | 61 200 € | — |
| `pel_duree_minimale` | Durée minimale de détention d'un PEL pour conserver les droits au prêt et à la prime | duration | 4 ans | — |

**Donations**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `donation_enfant_abattement` | Abattement sur une donation parent → enfant | amount | 100 000 € | — |
| `donation_enfant_periodicite` | Périodicité de renouvellement de l'abattement sur les donations parent-enfant | duration | 15 ans | — |
| `don_familial_sommes_argent` | Don familial de sommes d'argent exonéré, cumulable avec l'abattement sur les donations | amount | 31 865 € | — |
| `donation_petits_enfants_abattement` | Abattement sur une donation grand-parent → petit-enfant | amount | 31 865 € | — |

**Impôt sur le revenu**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `ir_bareme_seuils` | Seuils des tranches du barème de l'impôt sur le revenu (par part) | list | 0 € / 11 600 € / 29 579 € / 84 577 € / 181 917 € | — |
| `ir_bareme_taux` | Taux des tranches du barème de l'impôt sur le revenu | list | 0 % / 11 % / 30 % / 41 % / 45 % | — |
| `ir_decote_montant` | Montant maximum de la DÉCOTE, qui réduit l'impôt sans forcément l'annuler (personne seule / couple) | list | 897 € / 1 483 € | — |
| `ir_quotient_familial_plafond` | Économie d'impôt MAXIMALE procurée par une demi-part de quotient familial (montant d'impôt en moins, ne se multiplie par aucun taux) | amount | 1 807 € | — |
| `ir_abattement_salaires_taux` | Taux de l'abattement forfaitaire pour frais professionnels sur les SALAIRES | percent | 10 % | — |
| `ir_abattement_salaires_plafond` | Plafond de l'abattement forfaitaire de 10 % sur les salaires, par personne | amount | 14 555 € | — |
| `bareme_kilometrique_reference` | Barème kilométrique, valeur de référence : voiture de 5 CV, jusqu'à 5 000 km parcourus | text | 0,636 €/km | — |
| `ir_rattachement_age_limite` | Âge limite de rattachement d'un enfant majeur au foyer fiscal de ses parents | duration | 21 ans | — |
| `ir_rattachement_age_limite_etudiant` | Âge limite de rattachement au foyer fiscal des parents si l'enfant majeur poursuit ses études | duration | 25 ans | — |
| `ir_exoneration_job_etudiant` | Salaire annuel d'un étudiant de moins de 26 ans exonéré d'impôt sur le revenu | amount | 5 601,06 € | — |

**Crédit immobilier**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `credit_taux_usure` | Taux d'usure des prêts immobiliers à taux fixe 20 ans et plus : PLAFOND LÉGAL maximal, ce n'est pas un taux de marché pratiqué | percent | 5,40 % | 01/10/2026 |
| `credit_taux_endettement_max` | Taux d'endettement maximum recommandé (HCSF) | percent | 35 % | — |
| `credit_duree_max` | Durée maximale d'un crédit immobilier (HCSF) | duration | 25 ans | — |
| `ptz_montant_max` | Montant maximum THÉORIQUE d'un prêt à taux zéro, cas le plus favorable (le montant réel dépend de la zone, des revenus et de la taille du foyer) | amount | 180 000 € | — |
| `ira_plafond` | Plafond légal de l'indemnité de remboursement anticipé d'un crédit immobilier | text | 3 % du capital restant dû / 6 mois d'intérêts | — |

**Immobilier locatif**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `micro_foncier_plafond` | Plafond de recettes du régime micro-foncier (location NUE, non meublée) | amount | 15 000 € | — |
| `micro_foncier_abattement` | Abattement forfaitaire du régime micro-foncier (location NUE, non meublée) | percent | 30 % | — |
| `micro_bic_meuble_plafond` | Plafond de recettes du micro-BIC en LOCATION MEUBLÉE longue durée (revenus locatifs, ne concerne aucune activité de freelance) | amount | 83 600 € | — |
| `micro_bic_meuble_abattement` | Abattement forfaitaire du micro-BIC en LOCATION MEUBLÉE longue durée | percent | 50 % | — |
| `lmnp_seuil_cotisations` | Recettes annuelles de LOCATION MEUBLÉE au-delà desquelles le loueur passe des prélèvements sociaux aux cotisations d'indépendant | amount | 23 000 € | — |

**Crypto**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `crypto_seuil_exoneration` | Montant total annuel des CESSIONS de cryptomonnaies (somme des prix de vente, pas le gain) en dessous duquel les plus-values sont exonérées | amount | 305 € | — |
| `crypto_taux_imposition` | Taux d'imposition des plus-values de cryptomonnaies | percent | 31,4 % | — |
| `crypto_amende_compte_etranger` | Amende par compte de cryptomonnaies ouvert à l'ÉTRANGER et non déclaré | amount | 750 € | — |

**Micro-entreprise**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `micro_entreprise_plafond_services` | Plafond annuel de chiffre d'affaires d'une micro-entreprise en PRESTATIONS DE SERVICES | amount | 83 600 € | — |
| `micro_entreprise_plafond_marchandises` | Plafond annuel de chiffre d'affaires d'une micro-entreprise en VENTE DE MARCHANDISES | amount | 203 100 € | — |
| `micro_entreprise_cotisations_services` | Taux de cotisations sociales en micro-entreprise, PRESTATIONS DE SERVICES | percent | 21,2 % | — |
| `micro_entreprise_cotisations_marchandises` | Taux de cotisations sociales en micro-entreprise, VENTE DE MARCHANDISES | percent | 12,3 % | — |
| `franchise_tva_seuils` | Seuils de franchise en base de TVA (prestations de services / vente de marchandises) | list | 37 500 € / 85 000 € | — |

**Épargne salariale**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `pee_plafond_versement` | Plafond annuel des versements volontaires sur un PEE, en pourcentage de la rémunération annuelle brute | percent | 25 % | — |
| `pee_duree_blocage` | Durée de blocage des sommes versées sur un PEE | duration | 5 ans | — |
| `pee_abondement_plafond` | Plafond annuel de l'abondement versé par l'employeur sur un PEE | amount | 3 844,80 € | — |

**Banque au quotidien**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `commission_intervention_plafond` | Plafond d'une commission d'intervention, frais facturés par la banque et non une amende (par opération / par mois) | list | 8 € / 80 € | — |
| `decouvert_taux_usure` | Taux d'usure du découvert en compte d'un particulier (tranche la plus basse des crédits à la consommation) : PLAFOND LÉGAL maximal, ce n'est pas un taux pratiqué | percent | 23,60 % | 01/10/2026 |
| `garantie_depots_plafond` | Garantie des dépôts bancaires, par déposant et par établissement | amount | 100 000 € | — |
| `frais_rejet_prelevement_plafond` | Plafond des frais de rejet d'un prélèvement (sans dépasser le montant rejeté) | amount | 20 € | 01/11/2009 |

**Salaire et travail**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `smic_brut_mensuel` | SMIC brut mensuel, temps plein (35 h) | amount | 1 867,02 € | 01/06/2026 |
| `smic_net_mensuel` | SMIC net mensuel, temps plein (35 h), indicatif | amount | 1 477,93 € | 01/06/2026 |

**Entreprise**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `is_taux_normal` | Taux normal de l'impôt sur les sociétés | percent | 25 % | 01/01/2022 |
| `is_taux_reduit` | Taux réduit de l'impôt sur les sociétés (PME) | percent | 15 % | — |
| `is_taux_reduit_plafond` | Bénéfice imposé au taux réduit de l'impôt sur les sociétés (par période de 12 mois) | amount | 42 500 € | — |

**Crédit**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `credit_conso_taux_usure` | Taux d'usure des crédits à la consommation, du plus petit au plus gros montant emprunté (trois tranches) : plafonds légaux | list | 23,60 % / 15,76 % / 8,56 % | 01/10/2026 |

**Immobilier**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `plus_value_immo_taux_ir` | Taux d'impôt sur le revenu des plus-values immobilières (hors prélèvements sociaux) | percent | 19 % | — |
| `plus_value_immo_durees_exoneration` | Durées de détention pour l'exonération totale des plus-values immobilières | text | 22 ans pour l'impôt, 30 ans pour les prélèvements sociaux | 01/09/2013 |

**Hypothèses**

| Clé | Libellé | Format | Valeur au 17/10/2026 | Date d'effet |
|---|---|---|---|---|
| `etf_world_rendement_moyen` | Rendement moyen annuel ETF World | percent | 8 %/an | — |
| `inflation_annuelle` | Inflation annuelle (France) | percent | 2 % | — |

---

## 4. Comment fonctionnent aujourd'hui les systèmes

### 4.1 Fin de leçon
- **Démarrage** : l'app appelle `POST /api/lessons/{id}/start` avant chaque partie. Le serveur exige seulement que la leçon ait été démarrée **une fois** (statut `en_cours`, `reussi`, `parfait` ou `rate`) ; sinon `/complete` répond 403 `not_started`.
- **Corps de `POST /api/lessons/{id}/complete`** : `{ "responses": { "<index>": [première réponse] } }`. Rien d'autre : ni score ni série.
- **Correction** : sur les écrans tels qu'ils ont été servis (variante d'artefact figée au rendu). La version `selon_chiffres` est recalculée avec les chiffres en vigueur **au moment de `/complete`** : rien ne la fige (`LessonRunService.php:41-44`).
- **Score** : `round(justes / max(1, notés) × 100)` ; une leçon sans écran noté donne 0 et le statut `rate`.
  - Statut `parfait` à 100, `reussi` à partir de 75, sinon `rate`.
  - Le meilleur score et le meilleur statut sont gardés ; `parfait` n'est jamais dégradé.
- **Notions** : une notion est réussie si tous ses écrans notés sont justes du premier coup.
- **Réponse lue par l'app** :
  - `xp_gained` (bilan et journal de la semaine) ;
  - `first_try_correct` et `scored_total`, seulement si ce sont deux nombres, sinon l'app prend son propre compte ;
  - `chest{rarity, amount}`, `surprise_chest{amount}` ;
  - `module_just_completed`, et `module.title` avant le titre local ;
  - `user{xp, streak}`, gardés tout de suite dans l'état de l'app ;
  - `user.vals` : affiché seulement comme total sur le dernier coffre, **pas gardé** dans l'état de l'app.
  - Envoyés mais non lus : `vals_gained`, `daily_streak_bonus`, `notions`, `status`, `score`, `best_score`, `is_new_best`, `is_new_record`, `module_status`, `streak_progressed`, `user.level`, `diversity_multiplier`.
  - Une relecture `GET /api/modules` + `GET /api/progress` en tâche de fond met à jour modules, série et XP, mais ni les Vals ni le niveau : ils ne changent qu'au retour sur Apprendre.
- **Après la réponse, sur le téléphone**, dans cet ordre (`ApprendreDetailScreen.tsx:436-482`) :
  1. XP et série dans l'état de l'app ;
  2. relecture des modules et de la progression, en tâche de fond ;
  3. déclic au carnet, si la leçon a un `takeaway` (`valtheria:carnet:<compte>`) ;
  4. journal de la semaine (`valtheria:journal:<compte>`, 400 entrées au plus) ;
  5. journal des leçons (`valtheria:apprendre:lecons:<compte>`, 500 entrées au plus) ;
  6. mémoire de révision : écrans gradables et premier essai de chacun (`valtheria:revision:<compte>`) ;
  7. défis de précision (`valtheria:precision:<compte>`).
- Le texte de la leçon est gardé **au chargement** (`valtheria:lecons-textes`), pour l'index du dictionnaire.
- **Écrans de fin**, dans l'ordre : bilan → série (si elle a augmenté) → médaille → défis gagnés → coffre → coffre surprise → module terminé.
- **Envoi en échec** : « Tes réponses sont gardées », et « Réessayer » renvoie les mêmes réponses.

### 4.2 Révision du serveur (comptes connectés)
- **`GET /api/revision`** :
  - Le serveur sélectionne les notions dues (échéance passée, fuseau de Paris), les plus en retard d'abord, 10 au plus.
  - S'il y en a au moins une mais moins de 3, il complète avec les notions les plus proches, marquées `due: false`. **Sans aucune notion due, pas de session**, même s'il y a des notions à venir.
  - **Un écran tiré au hasard par notion**, parmi les écrans notés des leçons terminées (publiées ou non), hors `review: false`, `allocate` et `live_month`.
  - Les écrans sont servis résolus (`selon_chiffres`, jetons, note de fraîcheur) ; la correction reprend la version `selon_chiffres` puis la variante figée.
  - Chaque appel crée une session, gardée 6 h.
- **Réponse** : `{ session: { id, screens, items[{notion, notion_nom, lesson_title, due}] } | null, empty: { has_notions, next{date, count, in_days, label} } | null }`.
- **Côté app** :
  - la session est gardée et redemandée après 5 h 30 (`SESSION_SAFE_MINUTES = 330`) ; une révision terminée, ou sans session, vaut pour toute la journée ; si le serveur est indisponible, l'app redemande au plus toutes les 5 minutes. Le tout est dans `valtheria:revision:<compte>` (champ `servers`, 3 jours gardés) ;
  - l'app ajoute ensuite **jusqu'à 3 éléments à elle** : 2 mots du dictionnaire et 2 déclics au plus, **en commençant par les mots** (mot, déclic, mot) ; ratés d'abord, puis les plus anciens ; rien de la veille sauf ce qui a été raté ; tirage figé pour la journée ;
  - elle joue d'abord les écrans du serveur, puis ses ajouts, dans le lecteur, avec la pastille « RÉVISION » et sans rattrapage ;
  - des réponses vides du serveur, elle lit `empty.has_notions` et `empty.next.label` ; les `items` ne sont pas affichés.
- **`POST /api/revision/{id}/complete`** :
  - corps : `{ responses }`, avec seulement les positions servies par le serveur ;
  - une seule fin par session ; une session inconnue ou terminée répond 404 `session_inconnue`.
- **Paliers des notions** : intervalles de 1, 3, 7, 21 et 60 jours.
  - Une réussite à l'échéance fait monter d'un palier.
  - Un échec fait descendre de 2 paliers, sans passer sous le palier 1.
  - Une réussite avant l'échéance ne change rien.
- **Récompense** : à partir de 3 écrans répondus, **30 XP** si tout est juste, **20** à partir de 70 %, sinon **10**. Le total est le nombre d'éléments de la session, y compris ceux qui n'ont pas pu être notés parce que leur leçon a changé.
  - Sans multiplicateur. La série avance, et +10 Vals à la première activité de chaque jour (voir 4.8). Le niveau est recalculé. Pas de coffre.
  - L'app lit `xp_earned`, `new_streak`, `first_try_correct` et `scored_total` (le score affiché ajoute ses propres éléments), recopie `daily_streak_bonus` sans l'afficher, puis relit `GET /api/progress` (XP, série, Vals).
  - Fin : « RÉVISION TERMINÉE », « Révision du jour », sans coffre ni défi de précision ; série et médaille si la série augmente. **Les XP de révision n'entrent pas dans le journal de la semaine.** Envoi en échec : « Réessayer » ou « Terminer sans l'enregistrer » (bilan local). Session vide mais avec des ajouts : bilan local, rien n'est envoyé.

### 4.3 Révision de l'app (repli)
Elle sert si la route du serveur échoue ou si l'on est hors ligne. Sans compte, il n'y a pas de révision.

- **Matière** :
  - les écrans « gradables » des leçons terminées (notés, hors `reveal`, `simulator`, écran de secours et écrans `review: false`, écartés aussi des leçons gardées avant le 17/10/2026), gardés sur le téléphone à la fin de chaque leçon ; les leçons terminées ailleurs ou plus tôt sont relues par l'API, 12 au plus par passage ;
  - les déclics du carnet ;
  - les mots du dictionnaire dus.
- **Taille** : `min(10, 4 + ⌊leçons terminées / 3⌋)`, jamais plus que la matière disponible.
- **Tirage** :
  - les éléments ratés d'abord, puis les plus anciens ;
  - tour à tour par univers, jamais deux fois le même univers de suite quand c'est possible ;
  - rien du plan de la veille, sauf ce qui a été raté.
- **Plan** : tiré une fois par jour (graine `<compte>|<jour>`), retiré tant qu'il est vide et non terminé. `valtheria:revision:<compte>` contient toute la mémoire : écrans des leçons, historique, plans (3 jours), révisions du serveur.
- **Fin** : « n sur total », **sans XP**, rien n'est envoyé au serveur. L'historique est noté (clés `e:<leçon>:<index>`, `d:<texte>`, `w:<terme>`), les mots changent d'état, et la journée est marquée fêtée si la leçon du jour est faite (`valtheria:journee-fetee:<compte>`). Répliques de Val : « Sans faute. Tout est bien rangé. », « Bien révisé. Les autres reviendront demain. », « Ça arrive. On les revoit très vite. », « Journée terminée. À demain ! ».

### 4.4 Carnet de déclics
- **Origine** : la phrase `takeaway` d'une leçon. Aujourd'hui seules les six leçons découvertes en ont ; le site n'en envoie pas.
- **Rangement** : un déclic garde sa phrase avec crochets, son univers, sa leçon et sa date (`valtheria:carnet:<compte>`).
  - Pas de doublon (casse, accents et point final ignorés), le plus récent en tête.
  - Rien sur le serveur. Le carnet sans compte (`valtheria:carnet:invite`) est repris par le premier compte, puis vidé. Tout le carnet est **effacé à la déconnexion** (partie 4.13).
  - Deux entrées : la fin d'une leçon, et la fin d'une leçon découverte (avec l'univers conseillé de l'objectif).
- **« Me tester sur mes déclics »** : 5 questions au plus, une par déclic. Chacune masque un mot clé et propose 3 réponses : les mauvais choix viennent des mots clés des autres déclics, puis d'une liste de 15 mots proches. Sans rattrapage, sans XP, rien n'est enregistré.
- **En révision**, un déclic devient une question du même genre, et son résultat est gardé.

### 4.5 Dictionnaire
- **Données** : `GET /api/dictionary/terms` (connecté ; sans compte, un 401 affiche l'écran « réservé »).
  - Elle renvoie `[{term, definition, category}]`, sans enveloppe ni identifiant. Les définitions sont **résolues** : un repère `{{cle}}` y est déjà remplacé par le chiffre en vigueur.
  - Le site garde aussi `full_definition` et `related_lesson_id`, sans les exposer. L'app lirait `plain` et `lessons[{id, title}]` s'ils arrivaient un jour.
  - Liste triée de A à Z, sans doublon ; catégorie « Autre » par défaut. Une copie est gardée entre deux lancements (`valtheria:dictionnaire:cache`).
- **États des mots** (téléphone, `valtheria:mots-etats:<compte>`) :
  - **pas encore vu** : aucune trace ;
  - **vu** : fiche ouverte ;
  - **maîtrisé** : test réussi. Un test raté fait toujours redevenir « vu », depuis la fiche comme en révision.
  - La mémoire sans compte est reprise une seule fois par le premier compte ; l'ancienne liste `valtheria:mots-decouverts` est migrée en « vu ».
- **Retour en révision** (jours calendaires, seulement les mots encore au dictionnaire ; ratés d'abord, puis du plus ancien au plus récent) :
  - un mot vu revient 2 jours après la première ouverture de sa fiche ;
  - un mot raté au dernier test, le lendemain ;
  - un mot maîtrisé, 7 jours après le test qui l'a maîtrisé, puis 21 jours après chaque révision réussie ;
  - un mot pas encore vu ne revient jamais.
- **Index mots ↔ leçons** (téléphone) :
  - il est construit à partir des textes des leçons chargées : titre et toutes les chaînes de 3 caractères ou plus des écrans, sauf `id`, `type`, `mood`, `formula`… ;
  - accents et casse ignorés, mots entiers, pluriel en s ou x accepté ;
  - un sigle est cherché tel quel, casse et accents compris, sans pluriel ;
  - les mots seuls de moins de 5 lettres et 19 mots trop courants ne sont pas indexés (les expressions avec espace, apostrophe ou tiret le sont) ;
  - les textes manquants sont relus par lots de 20 leçons et renouvelés après 7 jours, **seulement avec un compte** ; index gardé avec une signature (`valtheria:index-mots`), textes dans `valtheria:lecons-textes`.
- **« Tu le croises dans »** affiche 2 leçons au plus, celles du serveur d'abord ; le lien ouvre la page du module, sinon Apprendre.
- Autres mémoires : mots récents (3 au plus, `valtheria:dictionnaire:recents:<compte>`) et « Mes mots » (`valtheria:dictionnaire:mesMots:<compte>`).

### 4.6 Test du dictionnaire
- **Questions** :
  - il faut au moins 3 mots au dictionnaire ;
  - 1 question pour un mot : sa définition parmi 3 (préférée), sinon le mot à retrouver d'après sa définition masquée ;
  - 2 pour un sigle : son développé parmi 3, puis le sigle à retrouver (1 seule si le développé n'est pas possible) ;
  - **en révision, une seule question** (pour un sigle, le développé) ;
  - la définition « terme : définition » n'est montrée qu'à la dernière question, pour ne pas donner la réponse.
- **Résultat** :
  - réussi seulement si tout est juste du premier coup ; le mot devient alors maîtrisé ;
  - raté : le mot redevient « vu » et revient en révision le lendemain.
  - Sans XP, sans rattrapage. Réussi : « Un autre mot ? » propose deux mots liés. Sans test possible : « Pas de test possible pour ce mot pour l'instant. ».

### 4.7 XP et niveaux
- **Leçon** : `xp_reward` × multiplicateur de niveau × boost de la boutique, réduit à 25 % si la leçon est ratée. Les XP sont **créditées à chaque partie, rejeu compris**. Après une leçon, le niveau du serveur ne fait que monter ; le bonus d'XP d'une carte de module est crédité après ce calcul, sans le refaire.
  - Multiplicateur de niveau : 1,1 dès le niveau 6, 1,25 dès 11, 1,5 dès 21, 2 dès 31.
- **Autres sources** :
  - révision : 10, 20 ou 30 ;
  - leçon découverte : 20, une seule fois ;
  - défi du jour, quêtes (web), cartes de module.
- **Niveau** : `⌊XP / 200⌋ + 1`, des deux côtés.
  - L'en-tête d'Apprendre affiche le niveau du serveur (`progress.level`), qui n'est pas mis à jour après une leçon avant le retour sur Apprendre ; le profil le recalcule depuis les XP.
  - Le défi du jour, les quêtes et l'évaluation de module ajoutent des XP sans recalculer le niveau du serveur : les deux chiffres peuvent alors différer.
- **Sans compte** : 20 XP par leçon découverte, une seule fois chacune (120 au plus), gardés dans `valtheria:premiere-ouverture` et le journal de la semaine. À l'inscription, l'app envoie un seul crédit (`POST /onboarding/discovery-complete`).
- **Gardé entre deux lancements** : XP, série, niveau, Vals, modules et univers dans `valtheria:apprendre:cache`, pour le même compte et 30 jours au plus.

### 4.8 Vals
- **Uniquement sur le serveur** (colonne `users.valth`, journal `valth_transactions`, jamais négatif).
- **Gains** :
  - coffres de leçon et coffre surprise ;
  - +10 à la première activité de chaque jour de Paris (leçon ou révision), y compris quand la série repart à 1 et lors de la toute première activité ;
  - défi du jour (+30), quêtes, défis « vraie vie », et quelques bonus du web.
- **Seule dépense** : la boutique, sur le web uniquement (gels de série, cœurs, boosts d'XP).
- **Côté app** : le total vient de `GET /api/progress` (au chargement d'Apprendre, après une révision, et depuis la copie du lancement). Après une leçon, `user.vals` n'est montré que comme total sur le dernier coffre. `vals_gained` n'est pas lu.

### 4.9 Coffres
- **Il n'existe pas de table de coffres** : un coffre est un tirage du serveur à la fin d'une leçon, qui ne contient que des Vals.
- **Rareté** selon le score :
  - à 100 % : légendaire 12 fois sur 100, épique 30, rare sinon ;
  - dès 90 % : épique 30 fois sur 100, rare sinon ;
  - dès 75 % : rare 35 fois sur 100, commun sinon ;
  - en dessous : commun.
- **Montant** selon la difficulté de la leçon :

| Difficulté de la leçon | commun | rare | épique | légendaire |
|---|---|---|---|---|
| `debutant` | 15 à 25 | 35 à 50 | 60 à 80 | 100 à 130 |
| `intermediaire` | 20 à 35 | 50 à 70 | 80 à 110 | 140 à 180 |
| `avance` | 30 à 50 | 70 à 90 | 100 à 140 | 180 à 250 |

- **Versement** (la rareté dépend du score de la partie en cours) :
  - première complétion, ou meilleur score précédent égal à 0 : montant plein ;
  - rejeu avec un meilleur score : `round(montant × (score − meilleur précédent) / 100)` ;
  - sinon : rien.
  - Une difficulté inconnue prend le barème `debutant` ; la difficulté du module n'est jamais lue.
  - Multiplié par 1,2 à partir de 3 leçons différentes le même jour, par 1,5 à partir de 5.
- **Coffre surprise** : 12 % de chances quand un coffre rapporte, avec la moitié du montant (5 au moins).
- **Côté app** : un coffre n'est montré que si son montant dépasse 0, coffre surprise compris. Le coffre surprise est toujours montré en légendaire ; une rareté inconnue est montrée en épique. Déroulé : le coffre monte d'une rareté à l'autre depuis commun (350 ms par palier, 700 ms au moins), puis « Touche le coffre pour l'ouvrir », ouverture en 1,5 s au plus, bouton « Passer ». Le total des Vals s'affiche sur le dernier coffre.

### 4.10 Série
- **Compte** (serveur, jour de Paris) :
  - même jour : rien ne change ;
  - veille : +1 ;
  - au-delà : la série repart à 1, et l'ancienne est gardée comme « perdue » si elle dépassait 1.
  - La tâche de 00 h 30 remet la série à 0 ou consomme un gel (bouclier) : l'API peut donc renvoyer 0. Le gel ne se consomme que sur le web ou par cette tâche.
  - Le record (`max_streak`) n'est mis à jour qu'au moment d'une perte, et n'est exposé que dans l'export `/api/user/export` : l'app garde le sien sur le téléphone (`valtheria:recompenses-serie:<compte>`, `{best, celebrated}`).
  - Le gel n'est pas proposé dans l'app (« Bientôt disponible avec ton compte »).
- **Sans compte** (téléphone) :
  - la série est rejouée jour par jour depuis le premier jour de leçon (400 jours gardés) : un jour avec une leçon, +1 ; aujourd'hui sans leçon ne casse pas encore la série ;
  - un gel se gagne quand la série atteint un multiple de 7, si la réserve est sous 2 ; il est consommé automatiquement pour un jour manqué si la série dépasse 0.
- **Médailles** (téléphone, dans les deux cas) : 3 Étincelle, 7 Feu de camp, 14 Brasier, 30 Flamme d'or, 60 Phénix, 100 Légende. Chacune est fêtée une fois, seul le plus haut palier franchi est montré ; si l'écran de série est déjà passé, la médaille est fêtée la fois suivante. Les médailles gagnées restent si la série casse.

### 4.11 Défis de précision et série d'affilée
- **Entièrement sur le téléphone** (`valtheria:precision:<compte>`). Le serveur n'en sait rien.
- **Mémoire** : meilleure série par leçon (clés `l<id>` et `decouverte-<objectif>`), meilleure de tous les temps, leçons parfaites (une même leçon ne compte qu'une fois), défis gagnés (`earned`). La mémoire sans compte est reprise une seule fois par le premier compte.
- **Défis** : 5, 10 et 20 bonnes réponses d'affilée ; 1 puis 10 leçons parfaites. Chacun se gagne une fois. Ni la révision ni les tests ne comptent.
- **Pendant la leçon** : pastille à partir de 3, paliers à 5 (« En feu ! ») et 10 (« Inarrêtable ! »).
- **Bilan de leçon** : « Meilleure série : n d'affilée » à partir de 2, et la pastille « LEÇON PARFAITE » (tout juste du premier coup, selon le décompte de l'app).
- Tout est effacé à la déconnexion.

### 4.12 Remarques de Val dans le patrimoine
- **Où** : sur Mon patrimoine, sous la barre de répartition et avant « TES POSITIONS » ; sur Analyse, s'il y a au moins une position. Un patrimoine vide (ni position ni position clôturée) montre le premier pas, sans remarque. Fichiers : `src/utils/patrimoine/valTips.ts` (choix), `lessonLink.ts` (lien), `src/components/patrimoine/ValRemark.tsx` (carte).
- **Données lues** : les positions (valeur en euros = `valueEur`, sinon `value`, les valeurs négatives comptent 0), la date du jour, et les dépenses mensuelles des préférences du patrimoine (`prefs.emergency.monthlyExpenses`, `null` si inconnues). « Sans risque » se lit avec `riskOf` : `risk_level` du serveur d'abord, sinon livret → sans risque, ETF → modéré, action et matière → élevé, crypto → très élevé, autre → non classé. **Si le total vaut 0 ou moins, aucune remarque.**
- **Choix** : une seule remarque, la première condition vraie dans l'ordre ci-dessous. Ni rotation ni fréquence : le choix est recalculé à chaque rendu (toutes les 30 s sur Mon patrimoine ; date figée à l'ouverture sur Analyse). Humeur toujours `complice`.

| Ordre | Remarque | Condition | Texte | Lien | Univers et mots cherchés |
|---|---|---|---|---|---|
| 1 | `no_emergency` | épargne sans risque ≤ 0 | « Tu n’as pas encore d’épargne sans risque. C’est elle qui évite de devoir vendre au mauvais moment. » | « Revoir « Ton coussin de sécurité » » | `avant-d-investir` : coussin, sécurité, precaution, précaution |
| 2 | `emergency_low` | dépenses connues et épargne sans risque < 1 mois de dépenses | « Ton épargne sans risque couvre moins d’un mois de dépenses. La règle courante, c’est 3 à 6 mois. » | « Revoir « Combien garder de côté ? » » | `avant-d-investir` : coussin, sécurité, combien |
| 3 | `concentration` | la plus grosse position hors sans risque pèse **plus de 30 %** du total, et il y a plus d'une position | « {nom} pèse {N %} de ton patrimoine. Quand un seul actif pèse autant, tout dépend de lui. » | « Revoir « Diversifier » » | `bourse` : diversif, répartir, repartir |
| 4 | `crypto_heavy` | les positions de type crypto pèsent **plus de 20 %** | « Ta crypto pèse {N %} de ton patrimoine. C’est beaucoup ? » | « Revoir « Diversifier » » | `crypto` : risque, volatil, diversif |
| 5 | `all_safe_long` | tout est sans risque (à 0,01 € près) **et** la plus ancienne ouverture (`opened_at`, sinon `buy_date`) a plus de 365 jours ; sans date, on passe à la suivante | « Tout ton patrimoine est sans risque depuis plus d’un an. C’est rassurant, mais l’inflation, elle, ne s’arrête pas. » | « Revoir « Choisir son horizon » » | `avant-d-investir` : inflation, horizon, premier plan |
| 6 | `regular` | toujours, en dernier recours | « Suivre ton patrimoine régulièrement, c’est déjà le piloter. » | « Revoir « Ton premier plan » » | `avant-d-investir` : plan, régul, regul |

Seuils dans `TIP_RULES`, univers, mots et libellés dans `TARGETS` (`valTips.ts:17-30`). Un garde-fou interdit tout conseil d'achat ou de vente dans les textes (`FORBIDDEN_ADVICE`). Aucun test ne couvre `valTips` ni `lessonLink`.

- **Comment la leçon est trouvée** (`lessonLink.ts:21-31`), à partir des modules et univers déjà chargés par Apprendre (rien n'est demandé au serveur) :
  1. on cherche l'univers dont le slug est celui de la remarque ; trouvé, on garde ses modules, sinon tous les modules connus ;
  2. pour chaque mot, dans l'ordre : le premier module dont le titre et le slug, sans accents ni casse, **contiennent** le mot (« plan » trouve aussi « planifier ») → `/apprendre/module/<id>` ;
  3. rien trouvé, univers connu → `/apprendre/univers/<id>` ;
  4. sinon → `/apprendre`, ce qui arrive aussi tant qu'Apprendre n'a rien chargé.
- **Limite** : le libellé du lien cite un titre fixe (« Ton coussin de sécurité », « Diversifier »…), qui n'est pas celui du module trouvé et peut ne pas exister.
- **Carte** : toute la carte se touche (petite vibration, puis le lien) ; texte de la remarque, puis le libellé en gras doré ; lecteur d'écran : rôle lien, « Val : {texte} {libellé} ».

### 4.13 Ce qui est effacé à la déconnexion, et ce qui reste entre deux lancements
- **Purge** (décision du 17 octobre 2026) : à la déconnexion **et** à la suppression du compte, `purgeAccountData` efface toutes les clés `valtheria:*` qui finissent par `:<compte>` ou `:invite`, et les clés personnelles (`premiere-ouverture`, `lastProfile`, `objectif:dernier`, `rappel`, `flamme-allumee`, `journal-erreurs`, `lecons-textes`, `index-mots`, `apprendre:cache`, `dictionnaire:cache`). Il vide aussi le patrimoine en mémoire et le parcours de première ouverture, et annule les rappels. Tout ce qui est noté « téléphone » dans cette partie (carnet, états des mots, révision de l'app, défis de précision, record de série) est donc perdu à la déconnexion.
- **Gardés** : `valtheria:sons` et `valtheria:chiffres-reglementaires`.
- **Entre deux lancements** : le contenu d'apprentissage (`valtheria:apprendre:cache`, même compte, 30 jours au plus) et les mots du dictionnaire (`valtheria:dictionnaire:cache`) ; jamais un montant du patrimoine.

---

## 5. Écarts entre l'app et le site, et modifications proposées

Le format de l'app fait foi. Chaque modification est reprise dans `docs/lot-serveur.md`, section 9.

### 5.0 Ce que change le lot serveur n° 9 (17 octobre 2026)

État : pull request n° 11 du site fusionnée (d7bdb11), CI verte, vérifiée sur le staging puis **déployée en production le 17 octobre 2026** (base sauvegardée avant).

| Écart | Ce que fait désormais le site |
|---|---|
| E1 | `number` et `live_month` refusés dans une leçon publiée. La révision du serveur ne sert que `choice`, `slider`, `document`, `dialogue`, `true_false`, `order`, `match`, `allocate` (le web gelé : `choice`, `slider`, `document`). |
| E2 | `dialogue` au format de l'app (`character`, `messages`, `replies[].reaction`) ; `speaker`, `line` et `cost` refusés. Même règle de réussite. |
| E3 | `allocate` à règles (2 à 5 pots, un seul réservoir, somme des départs = total, au moins une règle) ; juste si chaque règle est respectée et la somme égale au total. Rejoué en révision. Format à cibles refusé. |
| E4 | `true_false`, `order`, `match` et `simulator` acceptés et corrigés avec les règles de l'app (réponses brutes : `{id: booléen}`, liste d'ids, `{errors, found}`). Un id absent vaut la position, comme dans l'app. `simulator` jamais noté. |
| E5, E6 | `reveal` admet `start` et des lignes `dim` sans valeur ; `subtitle` admis sur tous les types. |
| E7 | `takeaway` admis à la racine (une phrase, 1 à 3 mots clés entre crochets), renvoyé par `GET /api/lessons/{id}` avec les repères `{{cle}}` remplacés. |
| E8 | Leçon publiée : ni bulletin de paie, ni cellule de récapitulatif juste. |
| E9 | Difficulté de la leçon déduite de celle du module (cinq niveaux) ; `difficulty` de `GET /api/lessons/{id}` vaut ce niveau ; coffres : `entree` comme `debutant`, `inter` comme `intermediaire`, `expert` comme `avance`. Le module des quatre leçons publiées est `debutant` : leurs coffres ne changent pas. |
| E13 | Un seul point de crédit des XP (`User::creditXp`) pour la leçon, la révision, la leçon découverte, le défi du jour, les quêtes, les cartes de module et l'évaluation : le niveau est toujours recalculé. |
| E14 | `API.md` et `docs/FORMAT_ECRANS.md` du site au format de l'app, avec les exemples de ce document (vérifiés par le contrôle de format). |
| E15 | Bornes : 2 à 6 cartes, 2 à 6 éléments, 2 à 5 paires, 1 à 4 sorties ; celles du site gardées. |
| E16 | Contrôle de format appelé à la publication et à l'approbation d'une leçon (refus 422). Document noté : au moins une ligne touchable par variante, aucune `section` juste. |
| E17 | Version `selon_chiffres` figée au service (par compte et par leçon, comme le tirage d'artefact) et reprise à `/complete` ; en révision, figée dans la session. |
| E18 | La révision ne sert que les leçons publiées. |
| Web | Une leçon au format de l'app affiche « À jouer dans l'app Valtheria » à la place de « Commencer ». Rien d'autre ne change. |

**Vérifications faites**
- Site : tests PHP et JavaScript verts (17 tests ajoutés, 32 cas de correction partagés ajoutés et 12 retirés, ceux de la répartition à cibles), CI verte.
- Les quatre leçons du module passent le contrôle d'une leçon publiée ; sur le staging, leurs écrans servis sont identiques avant et après le lot.
- Essai de bout en bout avec le code de l'app (normalisation, réponses brutes des écrans, correction locale, `buildResponses`) contre le staging : une leçon d'essai avec tous les types joués, un déclic et un écran `selon_chiffres`, jouée tout juste puis tout faux. Mêmes verdicts côté app et serveur (8 sur 8, puis 0 sur 8), aucun écran de secours, déclic lu, aucun repère ni `selon_chiffres` servi. Leçon et compte d'essai supprimés ensuite (`php artisan lessons:essai-format-app supprimer`).
- En local, les quatre leçons du module jouées de la même façon : mêmes verdicts.
- **En production** :
  - contrôle de format des quatre leçons publiées sans erreur, aussi avec les contrôles de publication ;
  - écrans servis identiques avant et après le déploiement ;
  - leçon d'essai jouée depuis le code de l'app, tout juste puis tout faux : 8 sur 8 puis 0 sur 8, mêmes verdicts côté app et serveur, 28 vérifications sur 28 ;
  - les quatre leçons publiées rejouées avec le compte d'essai : mêmes verdicts côté app et serveur (5, 5, 7 et 3 écrans notés), 80 vérifications sur 80 ;
  - leçon, module et compte d'essai supprimés ensuite, sans reste (progression, jetons).

**Côté app** : `src/utils/grade.ts` corrige depuis le 17/10/2026 tous les types, aux règles du serveur, vérifié sur les 74 cas du site (`tests/fixtures/reader-grading.json`, copie de celui du site) ; la mention « Taux en vigueur au … » est affichée.

**À noter pour le web, qui est gelé** : un écran au format de l'app ne pourra pas être joué par le lecteur web actuel. Proposition :
- le site accepte les formats de l'app dans son validateur et son correcteur ;
- une leçon qui en contient est signalée « à jouer dans l'app » sur le web, jusqu'à la refonte.

Ce petit affichage web demandera ton accord.

| N° | Écart | Gravité | Modification à faire sur le site |
|---|---|---|---|
| E1 | `number` et `live_month` ne sont pas joués par l'app. Un écran noté de ces types, en leçon ou en révision, est compté **raté** : il baisse le score, peut faire passer la leçon en « ratée » (XP à 25 %), et fait reculer la notion de 2 paliers. Aucune leçon réelle n'en contient aujourd'hui. | haute | Le validateur refuse ces deux types dans une leçon publiée. La révision ne sert que les types joués par l'app. `number` est remplacé par un `slider` noté. |
| E2 | `dialogue` : le site attend `speaker` et `line`, l'app `character`, `messages` et `replies[].reaction`. | haute | Le validateur accepte le format de l'app : `character{name obligatoire, role}`, `messages` (au moins 1), `replies` (2 à 5, avec `reaction`). Le correcteur ne change pas (même règle). L'ancien format est retiré, aucune leçon réelle ne l'utilise. |
| E3 | `allocate` : le site attend des cibles, l'app des règles. Le site interdit sa révision, l'app le révise. | haute | Le validateur accepte le format à règles (au moins 2 pots, un seul réservoir, somme des `start` = `total`, au moins une règle, clés existantes). Le correcteur juge chaque règle (`valeur ≥ min`) et la somme égale au total. `allocate` sort de la liste des types non révisables. L'ancien format est retiré. |
| E4 | `true_false`, `order`, `match` et `simulator` n'existent pas sur le site. | haute | Ajout au validateur et au correcteur, dans les formats de la partie 2 (déjà demandé en 4.2). `simulator` est toujours non noté, avec l'une des deux formules connues. |
| E5 | `reveal` : `start` est refusé, et une ligne `dim` doit avoir une valeur. | moyenne | Admettre `start{label, value}` et une valeur vide ou absente sur une ligne `dim`. |
| E6 | `subtitle` : l'app le lit sur tous les types, le site ne l'admet que sur certains (pas sur `reveal`, `dialogue` ni `live_month`). | basse | Admettre `subtitle` sur tous les types. |
| E7 | Phrase `takeaway` absente du site (refusée à la racine, jamais envoyée). | moyenne | Admettre `takeaway` à la racine : une phrase, 1 à 3 mots clés entre crochets non vides. La renvoyer dans `GET /api/lessons/{id}` (déjà demandé en 4.1). |
| E8 | `document` : le site peut produire un bulletin de paie et des cellules de récapitulatif justes, que l'app n'affiche pas. | moyenne | Le contrôle de cohérence refuse, dans une leçon publiée, une cellule de récapitulatif marquée juste et la vue bulletin, tant que l'app n'a pas de rendu pour eux. |
| E9 | Difficulté : 3 valeurs pour la leçon, 5 pour le module ; l'import recopie le niveau du module dans la leçon, ce qui échouerait pour `entree`, `inter` et `expert` (le module importé aujourd'hui est `debutant`). | moyenne | La difficulté de la leçon passe aux 5 valeurs du module, ou se déduit du module avec la correspondance qui existe déjà pour le prompt IA (`lessonDifficultyFromModule`) : montant des coffres `entree` comme `debutant`, `inter` comme `intermediaire`, `expert` comme `avance`. |
| E10 | `review: false` : l'app le respecte dans sa propre révision depuis le 17/10/2026. | — | Rien côté site. Corrigé dans l'app. |
| E11 | Étapes du chemin : `kind` absent (déjà demandé en 4.4). | basse | Inchangé. |
| E12 | Série d'affilée et défis de précision gardés sur le téléphone (déjà demandé en 4.9). | basse | Inchangé. |
| E13 | Le niveau du serveur n'est pas recalculé après les XP du défi du jour, des quêtes et des cartes de module. | basse | Un seul point de crédit des XP qui recalcule toujours le niveau. |
| E14 | Documentation du site périmée : exemple `true_false` d'une autre forme et « 3 tentatives au plus » dans `API.md` ; « échec → palier 0 » dans `config/valtheria.php` et `docs/FORMAT_ECRANS.md` (ligne 252). | basse | Mettre `API.md` et `docs/FORMAT_ECRANS.md` au format de l'app, avec les exemples de ce document. |
| E15 | Limites : le site borne `choice` à 2 à 8 options, `reveal` à 8 lignes, `dialogue` à 5 réponses, `allocate` à 5 pots ; l'app ne borne rien. | info | Garder ces bornes, et ajouter celles des nouveaux types : 2 à 6 cartes (`true_false`), 2 à 6 éléments (`order`), 2 à 5 paires (`match`), 1 à 4 sorties (`simulator`). |
| E16 | **Le contrôle de format n'est pas appelé à la publication** dans l'administration (seul le contrôle des chiffres en dur l'est). Une leçon publiée peut donc contenir un type que l'app ne joue pas, un `reveal` ou un `simulator` noté (compté juste par l'app, **raté** par le serveur), un `choice` noté sans option ou un `document` sans ligne touchable (leçon bloquée dans l'app). | haute | Appeler `LessonFormatValidator::validate($data, true)` à la publication d'une leçon (`AdminLessonController`) et à son approbation en revue, et refuser (422) avec ses messages, comme le fait déjà le contrôle des chiffres en dur. Ajouter au validateur : au moins une ligne touchable dans chaque variante d'un `document` noté, et aucune ligne `section` marquée juste. |
| E17 | `selon_chiffres` : la version est recalculée à la fin de la leçon avec les chiffres du moment. Si un chiffre change entre le service et `/complete`, le serveur corrige un autre écran que celui que l'app a affiché et noté. | basse | Figer la version choisie au service, comme le tirage d'artefact (`ArtefactResolver::draw`), et la reprendre à `/complete` et en révision. |
| E18 | Révision du serveur : les écrans viennent des leçons terminées, **publiées ou non**. Une leçon dépubliée continue d'être servie en révision. | basse | Ne servir en révision que les écrans des leçons publiées (`NotionProgressService`, `servableScreens`). |
| E19 | Humeur inconnue : l'app la remplace par `neutre`, le site la refuse au contrôle de format. | info | Aucune modification : le refus du site est plus strict et ne gêne pas l'app. |
| E20 | `has_volatile_note` et `volatile_verified_at` (« Taux en vigueur au … ») : affichés par l'app depuis le 17/10/2026. | — | Aucune modification côté site. |

### Points à surveiller côté app
Corrigés le 17 octobre 2026 : ligne en or d'une révélation jamais masquée ; « La bonne réponse » au singulier ; mention « Taux en vigueur au … » ; `review: false` respecté par la révision de l'app ; libellés des cinq niveaux partout (une seule table, `src/utils/levelNames.ts` : Entrée, Débutant, Intermédiaire, Avancé, Expert) ; option « plus haut que … » de la leçon Impôts lue dans le barème ; `grade.ts` seule source de correction.

Restent :
- Un `reveal` ou un `simulator` marqué `scored: true` est compté juste et envoyé.
- Une formule de simulateur inconnue affiche 0 au lieu de tirets (le commentaire de `src/lesson/formulas.ts:33` annonce à tort des tirets).
- `allocate` : `hint` est lu mais pas affiché.
- Une estimation égale à une ligne ordinaire d'une révélation la masque encore (2 260 € masquerait « = ton salaire brut ») : c'est la règle « chaque chiffre une seule fois », seule la ligne en or y échappe.
- Les leçons découvertes, construites dans l'app, n'ont pas la mention « Taux en vigueur au … » : elle vient du site, sur ses leçons.
- Un `choice` noté sans option, ou un `document` noté sans ligne touchable, bloque la leçon (« Valider » grisé).
