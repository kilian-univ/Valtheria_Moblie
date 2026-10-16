# Lot serveur : ce que l'app attend du site

État au 16 octobre 2026. Relevé dans le code de l'app, dans l'historique de ses commits, et dans le site lu en lecture seule (branche `main` du dépôt Valtheraa/Valtheria).

Le site est gelé. Ces demandes ne se feront qu'en un seul lot, à ta demande : worktree depuis `origin/main`, branche dédiée, tests, pull request, staging, puis production avec ton accord. Rien n'a été modifié côté site.

Pour chaque point :
- **Manque** : ce qui n'existe pas, ou pas sous la bonne forme.
- **Souhaité** : la route ou le champ que l'app sait déjà lire, ou qu'elle lirait.
- **En attendant** : ce que fait l'app aujourd'hui.

« Sur main » veut dire que la route existe dans le code du site. Le déploiement en production reste à confirmer.

---

## Résumé, par priorité

| Priorité | Point | Effet pour la personne |
|---|---|---|
| 1 | Correction serveur des six nouveaux types d'écrans | Les leçons du serveur ne peuvent pas encore utiliser vrai ou faux, ordre, associer, répartir à règles, simulateur ni dialogue en messages |
| 1 | Changer de mot de passe depuis l'app | Le changement passe par le site |
| 1 | Mot de passe oublié en production | Bouton désactivé dans l'app |
| 1 | Inscription depuis l'app | Fermée côté serveur (403) |
| 2 | Dates d'activité par module et par leçon (4.6) | La leçon du jour et l'ordre des univers ne suivent que ce téléphone |
| 2 | Phrase « À retenir » (takeaway) des leçons | Pas de déclic au carnet pour les leçons du serveur |
| 2 | Objectifs crypto et impôts | Gardés sur le téléphone seulement |
| 2 | Gel de série et record pour les comptes | « Bientôt disponible avec ton compte » ; record gardé sur le téléphone |
| 2 | Photo de profil | Initiale à la place de la photo |
| 3 | Bonus de série de bonnes réponses (4.9) | Pas de bonus d'XP ni de Vals pour les bonnes réponses d'affilée ; défis de précision gardés sur le téléphone |
| 3 | Connexion Apple et Google | Boutons masqués |
| 3 | Dictionnaire enrichi, notifications poussées, date d'inscription, étapes du chemin | Champs prévus mais vides |

---

## 1. Compte et profil

### 1.1 Photo de profil
- **Manque** :
  - la colonne `avatar` existe en base, mais `GET /api/user` ne la renvoie pas ;
  - l'envoi `POST /profile/avatar` (jpg, jpeg, png, webp, 2 Mo au plus) est une route **web**, qui passe par la session du navigateur ; l'app ne peut pas l'appeler avec son jeton.
- **Souhaité** :
  - `avatar` (URL absolue, ou `null`) dans la réponse de `GET /api/user` ;
  - `POST /api/user/avatar`, en `multipart/form-data` avec le champ `avatar`, mêmes formats et même limite que la route web ;
  - réponse : le profil complet (même forme que `GET /api/user`) ;
  - recadrage carré déjà fait par l'app (expo-image-picker, à installer à ce moment-là).
- **En attendant** : le profil et les Réglages montrent l'initiale du pseudo dans l'anneau de niveau ; le lien « Changer ma photo » n'est pas affiché.

### 1.2 Changement de mot de passe
- **Manque** : aucune route de l'API. `PATCH /api/user` ignore les champs de mot de passe. L'ancien formulaire de l'app affichait un faux succès ; il a été retiré.
- **Souhaité** :
  - `POST /api/user/password` avec `{ current_password, password, password_confirmation }` (8 caractères au moins, comme à l'inscription) ;
  - 422 avec un `message` lisible si le mot de passe actuel est faux ;
  - éventuellement, la révocation des autres jetons.
- **En attendant** : la ligne « Mot de passe » des Réglages ouvre une feuille qui envoie vers la page du site (`/forgot-password`), d'où part le lien par e-mail.

### 1.3 Mot de passe oublié
- **Manque** : `POST /api/auth/forgot-password` `{ email }` est **sur main** (pull request « première ouverture »), mais son déploiement en production n'est pas confirmé.
- **Souhaité** : la route telle quelle, déployée. Elle répond la même chose, que l'adresse existe ou non.
- **En attendant** : `FORGOT_PASSWORD_ENABLED = false` (`src/screens/header/LoginScreen.tsx`). La connexion affiche « Bientôt disponible dans l'app », et les Réglages envoient vers le site. Il suffit de passer cette valeur à `true` une fois la route en ligne.

### 1.4 Objectifs
- **Manque** :
  - `PATCH /api/user` avec `objective` n'accepte que `comprendre, epargner, investir, projet, rouge, decouvrir` (`User::OBJECTIVES`) ;
  - les objectifs de l'app sont `epargner, investir, crypto, logement, impots, decouvrir`.
- **Souhaité** : accepter `crypto`, `logement` et `impots` (et garder les anciennes valeurs pour les comptes existants). Même liste pour `POST /api/onboarding/discovery-complete`.
- **En attendant** (`serverObjective`, `src/utils/profile.ts`) :
  - épargner, investir et découvrir sont envoyés tels quels ;
  - le logement est envoyé en « projet », et relu en logement ;
  - crypto et impôts restent sur le téléphone, avec le message « Objectif enregistré sur ce téléphone ».
  - L'app garde toujours le choix sur le téléphone, par compte.

### 1.5 Date d'inscription
- **Manque** : `GET /api/user` ne renvoie pas de date d'inscription.
- **Souhaité** : `created_at` (ISO 8601) dans le profil, par exemple pour « Membre depuis octobre 2026 ».
- **En attendant** : rien n'est affiché.

### 1.6 Données et suppression
- `GET /api/user/export` et `DELETE /api/user` existent et sont utilisés : **rien ne manque**. L'export s'ouvre dans la feuille de partage du téléphone.

---

## 2. Inscription et connexion

### 2.1 Inscription depuis l'app
- **Manque** : `POST /api/auth/register` répond 403 `{ code: "inscription_fermee" }` tant que le réglage `valtheria.api.register_enabled` est désactivé.
- **Souhaité** : ouvrir ce réglage en production quand tu le décides. Rien d'autre : le serveur accepte déjà le pseudo envoyé dans `name` (l'API de l'app est figée).
- **En attendant** : écran « Les inscriptions ouvrent très bientôt », avec « J'ai déjà un compte » et « Revenir plus tard ». Le pseudo et l'objectif restent mémorisés, et l'accueil sans compte s'en souvient pendant 3 jours.

### 2.2 Crédit de la leçon découverte
- **En production** (vérifié le 16 octobre 2026 : 401 sans jeton) : `POST /api/onboarding/discovery-complete` (20 XP et la série du jour, une seule fois, avec l'objectif facultatif).
- **Manque** : seulement la liste d'objectifs du point 1.4.
- **En attendant** : l'app l'appelle juste après l'inscription. Si l'objectif est refusé, elle réessaie sans objectif ; en cas d'échec, rien n'est montré et l'inscription réussit quand même.

### 2.3 Connexion avec Apple et Google
- **Manque** : aucune route.
- **Souhaité** :
  - `POST /api/auth/apple` avec `{ identity_token, authorization_code, first_name?, last_name? }` ;
  - `POST /api/auth/google` avec `{ id_token }` ;
  - les deux vérifient le jeton auprès d'Apple ou de Google, créent ou retrouvent le compte, et renvoient la même réponse que `/auth/login` (jeton et profil).
  - Apple impose la connexion Apple dès qu'une autre connexion tierce est proposée.
- **En attendant** : `SOCIAL_LOGIN_ENABLED = false` (`src/components/onboarding/SocialButtons.tsx`) ; aucun bouton n'est affiché. La connexion Google demandera aussi une version installée de l'app.

---

## 3. Série et récompenses (comptes)

### 3.1 Gel de série
- **Manque** :
  - le site a un gel pour les comptes (`has_streak_freeze`, `streak_freeze_used_at`, `streak_freeze_notice_pending`), mais `GET /api/user` ne l'expose pas ;
  - ses règles diffèrent de celles de l'app sans compte : un seul gel côté site ; côté app, un gel gagné tous les 7 jours, 2 au plus.
- **Souhaité** :
  - dans `GET /api/user` (ou `GET /api/progress`) : `freezes` (nombre en réserve), `frozen_days` (jours sauvés par un gel, AAAA-MM-JJ) et `streak_freeze_notice_pending` (pour le message « Ton gel a sauvé ta série hier ») ;
  - une seule règle commune, à choisir (celle de l'app : 1 gel tous les 7 jours, 2 au plus).
- **En attendant** : la feuille « Ta série » d'un compte affiche « Bientôt disponible avec ton compte » ; le son et le message du gel n'existent que sans compte.

### 3.2 Record et semaine de série
- **Manque** : ni meilleure série, ni jours de leçon de la semaine.
- **Souhaité** : `best_streak` et `lesson_days` (au moins les 7 derniers jours, AAAA-MM-JJ) dans le profil ou la progression.
- **En attendant** : le record est gardé sur le téléphone, par compte, et sert aux médailles. La semaine de la feuille « Ta série » n'est affichée que sans compte.

### 3.3 Médailles de série
- **Manque** : rien d'obligatoire. Les six médailles (3, 7, 14, 30, 60 et 100 jours) se déduisent du record. Un champ `best_streak` fiable (3.2) suffit pour qu'elles suivent la personne d'un téléphone à l'autre.
- **En attendant** : calculées sur le téléphone.

---

## 4. Leçons

### 4.1 Phrase « À retenir » (takeaway) et ses mots clés
- **Manque** :
  - `GET /api/lessons/{id}` ne renvoie pas de phrase clé ;
  - le validateur des leçons (`docs/FORMAT_ECRANS.md`) n'accepte que `objective` et `screens` à la racine : un `takeaway` y serait refusé aujourd'hui.
- **Souhaité** :
  - une clé racine `takeaway` (une phrase) dans le contenu des leçons, acceptée par le validateur et renvoyée par `GET /api/lessons/{id}` ;
  - ses mots clés entre crochets, comme dans les leçons découvertes : « Le [temps] fait plus que le [montant] ».
  - L'app retire les crochets à l'affichage et s'en sert pour le test du carnet.
- **En attendant** :
  - pas de carte « À RETENIR » ni de déclic au carnet pour les leçons du serveur ; seules les six leçons découvertes en ont ;
  - si une phrase arrive sans crochets, le test masque le mot le plus long, hors mots courants.

### 4.2 Correction serveur des six nouveaux types d'écrans
- **Manque** :
  - `ScreenGrader.php` (et `grade.js`) ne corrigent que `choice, document, number, slider, dialogue, allocate, live_month` ;
  - les six types des leçons découvertes v2 ne sont ni validés ni corrigés par le site ;
  - pour deux d'entre eux (allocate, dialogue), le format de l'app diffère de celui du site.
- **Souhaité** : ajouter au validateur et au correcteur, dans les formats que l'app lit déjà (`src/lesson/normalize.ts`). Ils sont résumés ci-dessous, avec la réponse brute envoyée à `/complete` :

| Type | Payload lu par l'app | Réponse envoyée | Juste si |
|---|---|---|---|
| `true_false` | `cards[{id, statement, answer: bool, explanation}]`, `pass` | `{ id de carte: bool }` | toutes les cartes jouées et au moins `pass` bonnes |
| `order` | `items[{id, text}]` dans l'ordre juste, `start[ids]` (ordre présenté), `axis{start, end, risk}` | liste d'ids dans l'ordre choisi | chaque id à sa place |
| `match` | `pairs[{id, left, right}]`, `right_order[ids]`, `max_errors` | `{ errors, found }` | toutes les paires trouvées et `errors <= max_errors` |
| `allocate` (à règles) | `total, step, unit, base, base_unit, buckets[{key, label, hint, start, reservoir, live}], rules[{bucket, min, val}]` | `{ clé: valeur }` | chaque règle respectée (`valeur >= min`) |
| `simulator` | `label, min, max, step, start, unit, formula, params, outputs[…], ranges[…]` | valeur du curseur | jamais noté |
| `dialogue` (en messages) | `character{name, role}, messages[texte], replies[{id, text, correct, reaction}]` | id de réplique | la réplique est `correct` (même règle que le site) |

  - Le correcteur de l'app doit rester le miroir exact de celui du site (`src/utils/grade.ts`) : chaque ajout côté site se reporte à l'identique dans l'app, avec ses cas dans `tests/fixtures/reader-grading.json`.
  - Les formules du simulateur que l'app connaît : `savings_from_age` (paramètres `monthly, rate, end_age`) et `loan_over_years` (paramètres `capital, rate`). Une leçon du serveur doit utiliser ces noms, ou l'app doit les apprendre.
- **En attendant** : ces types n'existent que dans les leçons découvertes, corrigées sur le téléphone et jamais envoyées. Dans une leçon du serveur, un type inconnu de l'app s'affiche en écran de secours, et la leçon continue.

### 4.3 Types du site que l'app ne lit pas encore
Ce n'est pas un manque du site, mais il faut choisir un seul format avant d'écrire de nouvelles leçons :
- `number`, `live_month`, `allocate` à cibles (`target, tolerance`) et `dialogue` à une réplique (`speaker, line`) arrivent dans l'app en écran de secours.
- À décider : le site adopte les formats du tableau 4.2, ou l'app apprend aussi ceux du site.

### 4.4 Étapes du chemin
- **Manque** : `GET /api/modules` ne renvoie pas le genre de chaque étape.
- **Souhaité** : `lessons[].kind` parmi `lesson`, `review`, `challenge` et `case`.
- **En attendant** : tout est une leçon (`stepKind`, `src/lesson/normalize.ts`).

### 4.5 Univers
- **En production** (vérifié le 16 octobre 2026 : 401 sans jeton) : `GET /api/universes`. `module.universe` dans `GET /api/modules` est sur main ; l'app sait s'en passer (elle retrouve l'univers par `module_ids`).
- **Si la route échoue** : sans univers, l'accueil liste les modules, et les couleurs suivent l'ordre des 15 univers du site.

---

### 4.6 Dernière activité par module et par leçon
- **Manque** :
  - `GET /api/modules` ne renvoie que `lessons[].completed` (booléen) et `lessons_completed` : aucune date ;
  - le site connaît pourtant `user_progress.completed_at` et `updated_at` (par leçon) et `module_user.updated_at` (par module), et le web s'en sert pour trier « en cours, du plus récent au plus ancien » (`ThemeController`, `last_activity`) ;
  - une leçon seulement commencée (`status = en_cours`) n'apparaît pas non plus.
- **Souhaité** : dans `GET /api/modules`,
  - par leçon : `completed_at` (ISO 8601 ou `null`) ;
  - par module : `last_activity_at` (la plus récente activité sur ses leçons, ou `null`).
- **En attendant** : l'app note sur le téléphone, par compte, la date de chaque leçon terminée sur ce téléphone, et le dernier module ouvert. La leçon du jour et l'ordre des univers « en cours » s'appuient sur cette mémoire ; sur un autre téléphone, ils retombent sur l'ordre du serveur.

### 4.7 Niveaux de difficulté des modules
- **Rien ne manque pour l'affichage** : `difficulty` est renvoyé par `GET /api/modules`, parmi `entree, debutant, inter, avance, expert` (et l'ancienne valeur `intermediaire`, lue comme `inter`). L'app suit l'ordre du site et la même règle de déblocage que la page web d'un thème (un niveau s'ouvre quand tous les modules des niveaux précédents sont terminés).
- **Souhaité, plus tard** : que l'API dise elle-même si un niveau est verrouillé, pour que la règle ne vive qu'à un endroit.
- **En attendant** : la règle est recopiée dans l'app (`src/utils/levels.ts`).

### 4.8 Révision quotidienne : rien ne manque
- **En production** (vérifié le 16 octobre 2026 : 401 sans jeton, alors qu'une route inconnue répond 404) : `GET /api/revision`, `GET /api/revision/count` et `POST /api/revision/{session}/complete`.
- **Utilisé par l'app** pour un compte connecté :
  - la session du serveur est demandée une fois, gardée sur le téléphone pour la journée, et redemandée si elle a plus de 5 h 30 (le serveur la garde 6 h) ;
  - jusqu'à 2 déclics du carnet sont joués après ses écrans ; `/complete` ne reçoit que les positions servies par le serveur ;
  - la fin envoie les tentatives à `/complete`, puis la fin de leçon habituelle montre les XP gagnés et la série ;
  - rien à réviser (`session: null` avec des notions) : « Rien à réviser aujourd'hui. Prochaine révision : … », et la révision du jour compte comme faite.
- **Repli** (sans compte, route en erreur, hors ligne) : la révision construite par l'app, sans XP.
- **À noter, sans urgence** : une erreur de l'API (`{ error: { code, message } }`) arrive dans l'app sans son code ; une session expirée et une panne du serveur y sont traitées de la même façon (« Réessayer » ou « Terminer sans l'enregistrer »).

### 4.9 Bonus de série de bonnes réponses
- **Manque** : le serveur ne récompense pas les bonnes réponses d'affilée. L'app les compte déjà (pastille ⚡ dès 3 bonnes réponses du premier coup, paliers à 5 et 10) et garde sur le téléphone la meilleure série de chaque leçon, la meilleure de tous les temps, les leçons parfaites et des défis de précision (`src/utils/accuracy.ts`).
- **Souhaité** :
  - `POST /api/lessons/{id}/complete` accepte en plus `best_run` (meilleure série de la leçon, premières tentatives) ; le serveur la recalcule à partir des réponses reçues (il a déjà les premières tentatives dans l'ordre) et ne fait confiance qu'à son calcul ;
  - un bonus d'XP et de Vals, par exemple +2 XP par palier de 3 (3, 6, 9…), et un bonus de leçon parfaite (toutes les questions notées justes du premier coup), une fois par leçon ou à chaque partie, à décider ;
  - dans la réponse : `run_bonus: { best_run, xp, vals, perfect }`, compté dans `xp_gained` et `vals_gained` ;
  - plus tard : la meilleure série, les leçons parfaites et les défis de précision gardés sur le compte, pour les retrouver sur un autre téléphone.
- **En attendant** : aucun bonus d'XP n'est affiché dans l'app. Le bilan montre « Meilleure série : n d'affilée » et la pastille « LEÇON PARFAITE » ; les défis sont gagnés et gardés sur le téléphone, par compte et sans compte.

## 5. Dictionnaire
- **Manque** :
  - `GET /api/dictionary/terms` (connecté) ne renvoie que `term`, `definition` et `category`, sans identifiant ;
  - le dictionnaire est fermé aux personnes sans compte (la route publique `GET /api/dictionary` existe, mais l'app ne s'en sert pas).
- **Souhaité** :
  - par mot : `plain` (la phrase « en clair ») et `lessons[{id, title}]` (les leçons où il apparaît), plus un `id` stable ;
  - plus tard, pour le lot Dictionnaire : mots découverts et mots maîtrisés gardés sur le serveur, et collections par catégorie.
- **En attendant** : la fiche n'affiche ni « en clair » ni « Dans tes leçons ». Les mots découverts et « Mes mots » sont gardés sur le téléphone, par compte. Sans compte, le dictionnaire est réservé.

### 5.1 Relier les mots aux notions et aux leçons
- **Manque** :
  - aucun lien entre un mot du dictionnaire et les notions des leçons (`notion` de chaque écran noté) ;
  - en base, `dictionary_terms` a déjà `full_definition` et `related_lesson_id`, mais `GET /api/dictionary/terms` ne les renvoie pas ;
  - les états des mots (vu, maîtrisé) ne sont gardés que sur le téléphone.
- **Souhaité** :
  - une table de liaison mots ↔ notions (`dictionary_term_notion`), remplie à l'écriture des leçons (ou depuis l'admin) ;
  - dans `GET /api/dictionary/terms`, par mot : `id`, `slug`, `notions[{slug, nom}]`, `lessons[{id, title}]` (leçons publiées qui travaillent ces notions), `full_definition`, et plus tard `plain` (« en clair ») et une phrase d'exemple (elle permettrait les questions « mot masqué dans un exemple ») ;
  - plus tard : les états des mots gardés sur le compte (`vu_le`, `maitrise_le`, dernier résultat), et leur place dans la révision du serveur (une notion maîtrisée fait avancer ses mots, un mot raté remet sa notion en révision).
- **En attendant** :
  - l'app relie les mots aux leçons elle-même : un index construit sur le téléphone à partir des textes des leçons (titre, questions, réponses, explications), accents et casse ignorés, sans les mots trop courts ou trop courants (`src/utils/wordLessonIndex.ts`) ;
  - « Tu le croises dans » sur la fiche, et « Un autre mot ? » après un test réussi, s'appuient sur cet index ;
  - les états des mots et leur espacement en révision sont gardés sur le téléphone, par compte et sans compte.

## 6. Carnet de déclics
- **Manque** : rien n'est gardé sur le serveur.
- **Souhaité** (plus tard) :
  - les déclics du compte (phrase, univers, leçon, date), pour les retrouver sur un autre téléphone ;
  - des XP pour le test « Me tester sur mes déclics », si tu le décides.
- **En attendant** : carnet sur le téléphone, par compte ; celui gardé sans compte est repris à la première ouverture d'un compte. Le test ne donne pas d'XP.

## 7. Notifications
- **Manque** :
  - le rappel quotidien est local : rien n'est envoyé au serveur ;
  - `POST` et `DELETE /api/device-token` existent sur main pour les notifications poussées (APNs, FCM), mais l'app n'enregistre aucun jeton.
- **Souhaité** :
  - garder `POST /api/device-token` `{ token, platform }` ;
  - `reminder_enabled` (déjà accepté par `PATCH /api/user`) et l'heure du rappel, pour éviter qu'un rappel local et une notification du serveur se doublent ;
  - un son personnalisé « notification », une fois le fichier livré.
- **En attendant** : rappels locaux, un par jour à l'heure choisie, avec un texte qui parle de l'objectif un jour sur deux, et le son système. Les notifications poussées et le son personnalisé demanderont aussi une version installée de l'app (voir `docs/a-faire-version-installee.md`).

## 8. Outils : cours des actions
- **Manque** : rien côté serveur. `GET /api/prices?tickers=…`, `GET /api/prices/history`, `POST /api/prices/refresh` et `GET /api/search?q=…&type=…` existent (connecté).
- **À faire dans l'app, plus tard** : le Portefeuille affiche les prix calculés par `GET /api/portfolio` (`current_price`, `current_price_eur`), et l'ajout d'une position se fait en saisissant le symbole à la main. Il pourra utiliser `/search` pour trouver un titre et `/prices` pour des cours à jour.
