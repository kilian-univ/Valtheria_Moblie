# Référence technique des leçons

État au 16 octobre 2026. Relevé en lecture seule dans l'app (branche `design/ui`, identique à `main`) et dans le site (dépôt Valtheraa/Valtheria, branche `main`, commit a604a59). Aucun fichier du site n'a été modifié.

**Décision : le format de l'app fait foi.** Quand l'app et le site diffèrent, c'est le site qui s'aligne. Les modifications à faire sur le site sont listées en fin de document (partie 5) et reprises dans `docs/lot-serveur.md` (section 9).

Fichiers de référence :

| Rôle | App | Site |
|---|---|---|
| Lecture du format serveur | `src/lesson/normalize.ts` (seul point d'entrée) | — |
| Modèle interne | `src/lesson/model.ts` | — |
| Validation | gardes de `normalize.ts` (écran de secours si mal formé) | `app/Services/LessonFormatValidator.php` |
| Correction | `src/utils/grade.ts` (miroir du site), `src/lesson/interactive.ts` (nouveaux types) | `app/Services/Lesson/ScreenGrader.php`, `LessonGrader.php`, `resources/js/reader/grade.js` |
| Rendu | `src/components/apprendre/ScreenRenderer.tsx` et `screens/*.tsx` | `resources/views/pages/learn/reader.blade.php`, `resources/js/reader/*.js` |
| Lecteur | `src/screens/ApprendreDetailScreen.tsx`, `src/utils/lessonPlayer.ts` | `LearnController.php`, `Api/LessonController.php` |
| Leçons d'exemple | `src/lesson/discovery/*.ts` (six leçons découvertes, au format serveur) | `database/seeders/data/01…04-lecon-*.json`, `tests/Support/BuildsReaderDemoLesson.php` |
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

Les quatre leçons réelles du site (module « Avant d'investir ») n'utilisent que `choice` (noté), `reveal`, `document` (noté) et un `slider` non noté : l'app les joue toutes.

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
| autres (`has_volatile_note`, `volatile_verified_at`, `trap`, `trap_found`) | ignorés | ajoutés au service ou admis selon le type |

Aucun champ `image`, `illustration` ni `title` par écran, ni dans l'app ni sur le site.

### 1.2 Val et ses humeurs
- **Humeurs** (identiques des deux côtés) : `neutre`, `complice`, `preoccupe`, `determine`, `alerte`, `fier`, `celebrant`, `rassurant`. Absente ou inconnue : `neutre`.
- **Sans `val.intro`**, l'app prend une réplique par défaut selon le type (`defaultValLine`, `lessonPlayer.ts`). Un `slider` non noté d'une leçon découverte reçoit toujours « Petit pari, sans mauvaise réponse. À ton avis ? ».
- **Après Valider**, l'app montre `val.correct` ou `val.wrong`. Si une série de bonnes réponses démarre ou passe un palier, une réplique de série les remplace. Dans un `dialogue`, la réaction de Val est dans la feuille de réponse, pas en haut.

### 1.3 Textes
- **Seules les balises nues `<em>` et `<strong>` sont admises.** Le site les autorise dans `val.*.line`, `explanation` et toutes les chaînes du `payload`. L'app les retire, ou les transforme en gras dans la bulle de Val.
- **Longueurs** : aucune longueur maximale n'est imposée, ni par le site ni par l'app. Les limites sont visuelles ; elles sont données type par type.
- Le site remplace les jetons `{{cle}}` par les chiffres réglementaires (`regulatory_figures`) avant d'envoyer la leçon.

### 1.4 Réponse, note, série
- **Un seul essai compte.** Le site ne garde que la première tentative (`LessonGrader::MAX_ATTEMPTS = 1`). L'app n'envoie que la première, et ne joue le rattrapage qu'en local.
- **Corps envoyé à la fin** : `{ "responses": { "<index de l'écran>": [réponse brute] } }`, pour les seuls écrans `scored: true`.
- **Un écran noté sans réponse compte comme raté** côté serveur.
- **Écran « gradable » dans l'app** (`isGradable`) : `scored: true` et un type joué autre que `reveal` et `simulator`. Il décide :
  - du bouton « Valider » ;
  - du rattrapage ;
  - de la mémoire de révision de l'app.
- **Série de bonnes réponses du premier coup** : la pastille ⚡ apparaît à 3, avec des paliers à 5 « En feu ! » et 10 « Inarrêtable ! ». Elle est calculée et gardée par l'app seule.
- **Piège** : un `reveal` ou un `simulator` marqué `scored: true` est compté juste par l'app et part à `/complete`. Le site refuse déjà `scored: true` sur un `reveal`.

### 1.5 Écran de secours
Un type inconnu, ou un écran connu mais mal formé (voir les gardes de chaque type), devient `unsupported` dans l'app :
- la question s'affiche, avec « Type d'écran pas encore géré », puis « Continuer » ;
- aucune réponse n'est envoyée, ce qui fait **compter l'écran comme raté par le serveur** s'il est noté.

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
  "explanation": "À la fin du mois, il reste rarement quelque chose. Un virement le jour de la paie, c’est te payer en premier.",
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
- `trap` (booléen) et `trap_found` (texte affiché quand le piège est déjoué) ;
- `options` : de 2 à 8, `id` et `text` en textes non vides, ids uniques ;
- un écran noté en `single` a **exactement une** bonne réponse, en `multiple` **au moins une**.

**Différences** :
- `trap` et `trap_found` sont ignorés par l'app : le verdict « C'était un piège » n'existe que sur le web.
- Le site refuse un id numérique ; l'app l'accepte.

**Réussite** : l'ensemble des ids choisis est exactement l'ensemble des options `correct: true`. L'ordre ne compte pas. Sans aucune option correcte, c'est toujours faux.

**Réponse envoyée** : l'id (`"virement"`), ou la liste d'ids en mode `multiple`.

**Note et révision** : noté si `scored: true`. Entre dans la révision de l'app et dans celle du serveur.

**Limites** :
- site : 2 à 8 options ;
- app : aucune limite codée. Les options passent à la ligne sans troncature.
- Convention des leçons de l'app : 3 options, une seule juste (vérifié par `tests/discovery.test.ts`).

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

**Réussite** : `|réponse − answer| ≤ |tolerance|`. `answer` et `tolerance` acceptent aussi un texte comme « 1 234,5 ». Sans `answer`, c'est faux.

**Réponse envoyée** : le nombre choisi, si l'écran est noté. Un pari n'envoie rien : sa valeur sert au `reveal` qui suit.

**Note et révision** :
- **noté** : bouton « Valider », révision ;
- **non noté** : bouton « Je parie », toujours « juste », jamais révisé.

**Limites** : aucune borne imposée. Le grand chiffre (78 px, 60 au minimum) est dimensionné sur la plus longue des deux bornes ; de 0 à 2 décimales sont affichées.

### 2.3 `reveal` : révélation

**Format de l'app**

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `value` | nombre | **oui** | sinon écran de secours |
| `unit` | texte | non | |
| `decimals` | entier de 0 à 4 | non | 0 par défaut |
| `label` | texte | non | titre au-dessus du chiffre, « En vrai » par défaut |
| `start` | `{label, value}` | non | barre « Au départ » |
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
- « Tout près : tu étais à X » si l'écart est de 10 % au plus ;
- sinon « Un peu… » ou « Bien plus/moins… », selon que l'écart est sous ou au-dessus de 50 %.

Val passe en `fier` si la personne était proche, en `alerte` sinon. Les lignes qui répètent un chiffre déjà affiché sont masquées.

**Note et révision** : jamais noté, jamais révisé.

**Limites** :
- site : 8 lignes au plus ;
- app : aucune limite codée. Les valeurs des lignes sont affichées sans unité.

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

**Limites** : carte de hauteur fixe (236 px), énoncé en 27 px sans troncature, soit 5 à 6 lignes au plus. Explication de carte sur 3 lignes au plus. Convention : 4 cartes, `pass` à 3.

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
  "explanation": "Le Livret A est garanti par l’État. Une seule action peut perdre beaucoup.",
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

**Limites** : aucun nombre maximal codé. Les libellés de l'axe sont écrits à la verticale, en capitales sur une ligne : environ 7,4 px par caractère, qui doivent tenir dans la hauteur de la liste. Convention : 4 éléments, dont aucun à sa place au départ.

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

**Limites** : deux colonnes côte à côte (la moitié de la largeur chacune), cellules de 64 px de haut au minimum. Convention : 4 paires, aucune définition en face de sa paire.

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
- `buckets` : 2 à 5 postes `{key, label, target, tolerance, locked, max}` ;
- écran noté : au moins 2 postes libres, chacun avec une `tolerance` ; somme des cibles = `total` ; cibles multiples du pas ;
- `review: false` obligatoire.

**Différences** : les deux formats sont incompatibles.
- L'app joue le format à règles et met le format à cibles en écran de secours.
- Le site corrige le format à cibles et jugerait faux un écran à règles, qui n'a pas de cible.
- Le site interdit la révision de ce type ; l'app le révise.

**Réussite (app)** : chaque règle respectée (`valeur ≥ min`). La première règle violée donne sa réplique, et son pot clignote. L'explication n'est jamais affichée : Val parle à sa place.

**Réponse envoyée** : `{ "besoins": 60, "envies": 25, "epargne": 15 }`.

**Limites** :
- site : 2 à 5 postes ;
- app : 5 couleurs de pots, en boucle. Le texte d'un segment de la barre ne s'affiche que s'il fait au moins 40 px de large.
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

**Réussite** : aucune. Le simulateur n'est jamais noté ; « Continuer » s'active après un mouvement du curseur.

**Limites** :
- une formule inconnue affiche 0 partout, sans courbe ;
- les résultats sont arrondis à l'unité ;
- la courbe compte 24 points, avec des légendes propres à chaque formule ;
- une seule valeur `big`, les autres sorties s'affichent en petit.

### 2.9 `dialogue` : dialogue

**Format de l'app (en messages)**

| Champ (`payload`) | Type | Obligatoire | Comportement |
|---|---|---|---|
| `question` | texte | non | |
| `character` | `{name, role}` | `name` **obligatoire** | avatar à l'initiale du nom |
| `messages[]` | liste de textes | **au moins 1** | chaque message arrive après environ 600 ms de « il écrit » |
| `replies[]` | liste de `{id, text, correct, reaction}` | **au moins 2**, `id` et `text` obligatoires | `reaction` : réponse du personnage |

```json
{
  "type": "dialogue",
  "scored": true,
  "notion": "risque_crypto",
  "val": {
    "correct": { "line": "Exactement : jamais plus que ce que tu peux te permettre de perdre.", "mood": "fier" },
    "wrong": { "line": "Personne ne sait ce qu’une crypto fera. Mets-y seulement ce que tu peux perdre.", "mood": "rassurant" }
  },
  "payload": {
    "character": { "name": "Léo", "role": "ton pote, très enthousiaste" },
    "messages": ["J’ai trouvé une nouvelle crypto, elle va faire fois 10 cette année. Mets tout ton livret dessus !"],
    "replies": [
      { "id": "tout", "text": "Grave, je mets tout.", "reaction": "Euh… et si ça fait comme en 2022 ?" },
      { "id": "petite", "text": "Je veux bien tenter, mais seulement une petite somme que je peux perdre.", "correct": true, "reaction": "Pas bête. Comme ça, même si ça chute, tu dors tranquille." },
      { "id": "credit", "text": "Je vais faire un crédit pour en acheter encore plus.", "reaction": "Euh… et si ça fait comme en 2022 ?" }
    ]
  }
}
```

**Format du site (une réplique)** :
- clés `question`, `speaker` (obligatoire), `line` (obligatoire), `replies` ;
- `replies` : 2 à 5 réponses `{id, text, cost, correct}` ;
- écran noté : au moins une réponse juste.

**Différences** :
- `speaker` et `line` donnent l'écran de secours dans l'app ; `character` et `messages` sont refusés par le site.
- `cost` (par exemple « −8 € ») n'est pas lu par l'app ; `reaction` est inconnu du site.

**Réussite** : la réponse choisie a `correct: true`. La règle est la même des deux côtés.

**Réponse envoyée** : l'id de la réponse, envoyé de lui-même après la réaction du personnage.

**Note et révision** : noté si `scored: true`. Révisé par l'app et par le serveur.

**Limites** :
- site : 2 à 5 réponses ;
- app : aucune limite codée. Chaque message ajoute environ 600 ms d'attente ; 1 à 3 messages sont conseillés.

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

**Limites** : libellé sur 2 lignes au plus, montants en € avec 2 décimales et un signe, colonne de date de 44 px.

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

**`GET /api/lessons/{id}`** renvoie `{ id, slug, title, description, objectif, notions[{slug, nom}], xp_reward, estimated_duration, difficulty, order, module{id, slug, title, color}, screens[…], user_progress{completed, status, best_score} }`.

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
- l'app retire les crochets à l'affichage (`plainDeclic`) et les lit avec `/\[([^\]]+)\]/g` (`declicKeywords`) ;
- le test du carnet masque un mot clé et propose 3 réponses ;
- sans crochets, le mot le plus long (5 lettres au moins, hors mots courants) est masqué.

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

**La leçon a sa propre difficulté, à trois valeurs** (`debutant`, `intermediaire`, `avance`). Elle ne sert qu'au montant des coffres. L'import recopie le niveau du module dans la leçon : `inter`, `entree` et `expert` n'y entrent pas.

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
   - 1 à 3 notions par leçon, toutes existantes ;
   - jetons `{{cle}}` existants ;
   - cohérence des artefacts.

   Il est appelé par `php artisan lessons:check-format [--sync]`, par la route interne `POST /api/internal/check-format`, à l'import et par les tests. **Il n'est appelé ni à la sauvegarde ni à la publication dans l'administration.**
2. **Administration d'une leçon** :
   - `title` (obligatoire), `difficulty` (obligatoire, parmi les 3 valeurs) ;
   - `xp_reward` de 0 à 1000, `estimated_duration` de 1 à 60 ;
   - `questions_data` **sans aucun contrôle de contenu**. Par défaut l'éditeur écrit l'ancien format (`{"questions": []}`), lu comme une leçon vide.
3. **Administration d'un module** : `difficulty` obligatoire parmi les 5 valeurs, `theme_id` existant.
4. **Génération IA** : désactivée (réponse 423). Son prompt produit l'ancien format.
5. **Au service** :
   - incohérence d'artefact : 409 ;
   - jeton `{{cle}}` restant : 409 sur le web seulement ;
   - leçon non publiée : 404.

### 3.5 Ce que l'app attend en plus
- `takeaway` à la racine de la leçon, avec ses crochets (lot serveur 4.1).
- La validation et la correction des types `true_false`, `order`, `match`, `simulator`, et des formats de l'app pour `allocate` et `dialogue` (lot serveur 4.2 et section 9).
- `lessons[].kind` (4.4), les dates d'activité (4.6), et `best_run` à la fin d'une leçon (4.9).

---

## 4. Comment fonctionnent aujourd'hui les systèmes

### 4.1 Fin de leçon
- **Démarrage** : `POST /api/lessons/{id}/start` est appelé avant chaque partie. Sans démarrage préalable, `/complete` répond 403 `not_started`.
- **Corps de `POST /api/lessons/{id}/complete`** : `{ "responses": { "<index>": [première réponse] } }`. Rien d'autre : ni score ni série.
- **Score** : `round(justes / notés × 100)`.
  - Statut `parfait` à 100, `reussi` à partir de 75, sinon `rate`.
  - Le meilleur score et le meilleur statut sont gardés.
- **Notions** : une notion est réussie si tous ses écrans notés sont justes du premier coup.
- **Réponse lue par l'app** :
  - `xp_gained`, `first_try_correct`, `scored_total` ;
  - `chest{rarity, amount}`, `surprise_chest{amount}` ;
  - `module_just_completed` ;
  - `user{xp, streak, vals}`.
  - Envoyés mais non lus : `vals_gained`, `daily_streak_bonus`, `notions`, `status`, `score`, `diversity_multiplier`.
- **Après la réponse, sur le téléphone** :
  - déclic au carnet (si la leçon a un `takeaway`) ;
  - journal de la semaine et journal des leçons ;
  - mémoire de révision ;
  - défis de précision.

### 4.2 Révision du serveur (comptes connectés)
- **`GET /api/revision`** :
  - Le serveur sélectionne les notions dues (échéance passée, fuseau de Paris), les plus en retard d'abord, 10 au plus.
  - S'il y en a moins de 3, il complète avec les notions les plus proches, marquées `due: false`.
  - **Un écran tiré au hasard par notion**, parmi les écrans notés des leçons terminées, hors `review: false`, `allocate` et `live_month`.
  - Chaque appel crée une session, gardée 6 h.
- **Réponse** : `{ session: { id, screens, items[{notion, notion_nom, lesson_title, due}] } | null, empty: { has_notions, next{date, count, in_days, label} } | null }`.
- **Côté app** :
  - la session est gardée pour la journée et redemandée après 5 h 30 ;
  - l'app ajoute ensuite **jusqu'à 3 éléments à elle** : 2 déclics et 2 mots du dictionnaire au plus, en alternance ;
  - elle joue le tout dans le lecteur, avec la pastille « RÉVISION ».
- **`POST /api/revision/{id}/complete`** :
  - corps : `{ responses }`, avec seulement les positions servies par le serveur ;
  - une seule fin par session ; une session inconnue ou terminée répond 404 `session_inconnue`.
- **Paliers des notions** : intervalles de 1, 3, 7, 21 et 60 jours.
  - Une réussite à l'échéance fait monter d'un palier.
  - Un échec fait descendre de 2 paliers, sans passer sous le palier 1.
  - Une réussite avant l'échéance ne change rien.
- **Récompense** : à partir de 3 écrans répondus, **30 XP** si tout est juste, **20** à partir de 70 %, sinon **10**.
  - Sans multiplicateur. La série avance, +10 Vals si elle progresse. Pas de coffre.
  - L'app lit `xp_earned`, `new_streak` et `daily_streak_bonus`, puis relit `GET /api/progress`.

### 4.3 Révision de l'app (repli)
Elle sert si la route du serveur échoue ou si l'on est hors ligne. Sans compte, il n'y a pas de révision.

- **Matière** :
  - les écrans « gradables » des leçons terminées, gardés sur le téléphone à la fin de chaque leçon ;
  - les déclics du carnet ;
  - les mots du dictionnaire dus.
- **Taille** : `min(10, 4 + ⌊leçons terminées / 3⌋)`.
- **Tirage** :
  - les éléments ratés d'abord, puis les plus anciens ;
  - tour à tour par univers, jamais deux fois le même univers de suite ;
  - rien de la veille, sauf ce qui a été raté.
- **Plan** : tiré une fois par jour (`valtheria:revision:<compte>`).
- **Fin** : « n sur total », **sans XP**, rien n'est envoyé au serveur.

### 4.4 Carnet de déclics
- **Origine** : la phrase `takeaway` d'une leçon. Aujourd'hui seules les six leçons découvertes en ont ; le site n'en envoie pas.
- **Rangement** : un déclic garde sa phrase avec crochets, son univers, sa leçon et sa date (`valtheria:carnet:<compte>`).
  - Pas de doublon (casse, accents et point final ignorés), le plus récent en tête.
  - Rien sur le serveur.
- **« Me tester sur mes déclics »** : 5 questions au plus, une par déclic. Chacune masque un mot clé et propose 3 réponses. Sans XP ni enregistrement.
- **En révision**, un déclic devient une question du même genre, et son résultat est gardé.

### 4.5 Dictionnaire
- **Données** : `GET /api/dictionary/terms` (connecté).
  - Elle renvoie `[{term, definition, category}]`, sans enveloppe ni identifiant.
  - Le site garde aussi `full_definition` et `related_lesson_id`, sans les exposer.
- **États des mots** (téléphone, `valtheria:mots-etats:<compte>`) :
  - **pas encore vu** : aucune trace ;
  - **vu** : fiche ouverte ;
  - **maîtrisé** : test réussi. Un mot maîtrisé raté redevient vu.
- **Retour en révision** :
  - un mot vu revient 2 jours après ;
  - un mot raté, le lendemain ;
  - un mot maîtrisé, après 7 puis 21 jours.
- **Index mots ↔ leçons** (téléphone) :
  - il est construit à partir des textes des leçons chargées (titre, questions, réponses, explications, Val) ;
  - accents et casse ignorés, mots entiers, pluriel en s ou x accepté ;
  - un sigle n'est trouvé qu'en capitales ;
  - les mots de moins de 5 lettres et les mots trop courants ne sont pas indexés ;
  - les textes manquants sont relus par lots de 20 leçons et renouvelés après 7 jours.
- **« Tu le croises dans »** affiche 2 leçons au plus.

### 4.6 Test du dictionnaire
- **Questions** :
  - 1 question pour un mot : sa définition parmi 3, ou le mot à retrouver d'après sa définition masquée ;
  - 2 pour un sigle : son développé parmi 3, puis le sigle à retrouver.
  - La définition n'est montrée qu'après la dernière question, pour ne pas donner la réponse.
- **Résultat** :
  - réussi seulement si tout est juste du premier coup ; le mot devient alors maîtrisé ;
  - raté : le mot revient en révision le lendemain.
  - Sans XP.

### 4.7 XP et niveaux
- **Leçon** : `xp_reward` × multiplicateur de niveau × boost de la boutique, réduit à 25 % si la leçon est ratée. Les XP sont **créditées à chaque partie, rejeu compris**.
  - Multiplicateur de niveau : 1,1 dès le niveau 6, 1,25 dès 11, 1,5 dès 21, 2 dès 31.
- **Autres sources** :
  - révision : 10, 20 ou 30 ;
  - leçon découverte : 20, une seule fois ;
  - défi du jour, quêtes (web), cartes de module.
- **Niveau** : `⌊XP / 200⌋ + 1`, des deux côtés.
  - L'en-tête d'Apprendre affiche le niveau du serveur ; le profil le recalcule depuis les XP.
  - Le défi du jour et les quêtes ajoutent des XP sans recalculer le niveau du serveur : les deux chiffres peuvent alors différer.
- **Sans compte**, les XP restent sur le téléphone.

### 4.8 Vals
- **Uniquement sur le serveur** (colonne `users.valth`, journal `valth_transactions`, jamais négatif).
- **Gains** :
  - coffres de leçon et coffre surprise ;
  - +10 par jour quand la série avance ;
  - défi du jour (+30), quêtes, défis « vraie vie », et quelques bonus du web.
- **Seule dépense** : la boutique, sur le web uniquement (gels de série, cœurs, boosts d'XP).
- **Côté app** : le total vient de `user.vals` après une leçon, ou de `GET /api/progress`. `vals_gained` n'est pas lu.

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

- **Versement** :
  - première réussite : montant plein ;
  - rejeu avec un meilleur score : la part du progrès ;
  - sinon : rien.
  - Multiplié par 1,2 à partir de 3 leçons différentes le même jour, par 1,5 à partir de 5.
- **Coffre surprise** : 12 % de chances quand un coffre rapporte, avec la moitié du montant (5 au moins).
- **Côté app** : un coffre n'est montré que si son montant dépasse 0. Le coffre surprise est toujours montré en légendaire. L'app ne fait que l'animation (ouverture au toucher).

### 4.10 Série
- **Compte** (serveur, jour de Paris) :
  - même jour : rien ne change ;
  - veille : +1 ;
  - au-delà : la série repart à 1, et l'ancienne est gardée comme « perdue ».
  - Le gel ne se consomme que sur le web ou par la tâche de 00 h 30, et l'API renvoie la série brute.
  - Le record (`max_streak`) n'est pas exposé : l'app garde le sien sur le téléphone.
  - Le gel n'est pas proposé dans l'app (« Bientôt disponible avec ton compte »).
- **Sans compte** (téléphone) :
  - un jour avec une leçon : +1 ;
  - un gel gagné tous les 7 jours, 2 au plus, consommé automatiquement pour un jour manqué.
- **Médailles** (téléphone, dans les deux cas) : 3, 7, 14, 30, 60 et 100 jours.

### 4.11 Défis de précision et série d'affilée
- **Entièrement sur le téléphone** (`valtheria:precision:<compte>`). Le serveur n'en sait rien.
- **Mémoire** : meilleure série par leçon, meilleure de tous les temps, leçons parfaites.
- **Défis** : 5, 10 et 20 bonnes réponses d'affilée ; 1 puis 10 leçons parfaites. Chacun se gagne une fois.
- **Bilan de leçon** : « Meilleure série : n d'affilée » à partir de 2, et la pastille « LEÇON PARFAITE ».

---

## 5. Écarts entre l'app et le site, et modifications proposées

Le format de l'app fait foi. Chaque modification est reprise dans `docs/lot-serveur.md`, section 9.

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
| E6 | `subtitle` : l'app le lit sur tous les types, le site ne l'admet que sur certains (pas sur `reveal` ni `dialogue`). | basse | Admettre `subtitle` sur tous les types. |
| E7 | Phrase `takeaway` absente du site (refusée à la racine, jamais envoyée). | moyenne | Admettre `takeaway` à la racine : une phrase, 1 à 3 mots clés entre crochets non vides. La renvoyer dans `GET /api/lessons/{id}` (déjà demandé en 4.1). |
| E8 | `document` : le site peut produire un bulletin de paie et des cellules de récapitulatif justes, que l'app n'affiche pas. | moyenne | Le contrôle de cohérence refuse, dans une leçon publiée, une cellule de récapitulatif marquée juste et la vue bulletin, tant que l'app n'a pas de rendu pour eux. |
| E9 | Difficulté : 3 valeurs pour la leçon, 5 pour le module ; l'import recopie le niveau du module dans la leçon, ce qui échoue pour `entree`, `inter` et `expert`. | moyenne | La difficulté de la leçon passe aux 5 valeurs du module, ou se déduit du module. Montant des coffres : `entree` comme `debutant`, `inter` comme `intermediaire`, `expert` comme `avance`. |
| E10 | `review: false` : l'app ne le lit pas dans sa propre révision. | basse | Rien côté site. À corriger dans l'app (voir la note de fin). |
| E11 | Étapes du chemin : `kind` absent (déjà demandé en 4.4). | basse | Inchangé. |
| E12 | Série d'affilée et défis de précision gardés sur le téléphone (déjà demandé en 4.9). | basse | Inchangé. |
| E13 | Le niveau du serveur n'est pas recalculé après les XP du défi du jour, des quêtes et des cartes de module. | basse | Un seul point de crédit des XP qui recalcule toujours le niveau. |
| E14 | Documentation du site périmée : exemple `true_false` d'une autre forme et « 3 tentatives au plus » dans `API.md` ; « échec → palier 0 » dans `config/valtheria.php` et `FORMAT_ECRANS.md`. | basse | Mettre `API.md` et `docs/FORMAT_ECRANS.md` au format de l'app, avec les exemples de ce document. |
| E15 | Limites : le site borne `choice` à 2 à 8 options, `reveal` à 8 lignes, `dialogue` à 5 réponses, `allocate` à 5 pots ; l'app ne borne rien. | info | Garder ces bornes, et ajouter celles des nouveaux types : 2 à 6 cartes (`true_false`), 2 à 6 éléments (`order`), 2 à 5 paires (`match`), 1 à 4 sorties (`simulator`). |

### Points à surveiller côté app (non modifiés)
- `difficultyLabel` (`src/utils/learning.ts`) ne connaît ni `entree` ni `inter`, et range `expert` sous « Avancé ». `src/utils/levels.ts` connaît bien les cinq valeurs.
- La révision de l'app ne lit pas `review: false`.
- Un `reveal` ou un `simulator` marqué `scored: true` est compté juste et envoyé.
- Une formule de simulateur inconnue affiche 0 au lieu de tirets.
- `allocate` : `hint` est lu mais pas affiché.
