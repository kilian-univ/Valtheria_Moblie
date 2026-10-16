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
| 1 | Cours des actions et taux EUR/USD (8.4) | Yahoo v7 en 401 : taux figé à 1,08 (écart d'environ 4 %), cours des actions plus lents, cryptos hors liste sans cours |
| 3 | Historique du portefeuille dans l'app (8.6) | Corrigé dans l'app ; une réponse non dépliée rendrait la correction inutile |
| 2 | Positions regroupées, PRU, opérations et ventes (8.1 à 8.3) | Chaque ajout crée une ligne de plus ; pas de prix de revient moyen, pas d'historique des achats, pas de vente ni de plus-value réalisée |
| 3 | Logos des actifs (8.5) | Une icône par type (la pièce 🪙 pour toutes les cryptos) |
| 1 | Écrans `number` et `live_month` non joués par l'app (9.1) | S'ils apparaissent dans une leçon ou une révision, l'écran compte comme raté : score plus bas, XP réduits, notion qui recule |
| 1 | Formats de l'app pour `dialogue` et `allocate` (9.2, 9.3) | Impossible d'écrire ces écrans pour l'app sur le site |
| 2 | Révélation, sous-titre, document, difficulté des leçons (9.4 à 9.7) | Écrans de l'app refusés par le validateur, coffres faussés pour certains niveaux |
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
- `number`, `live_month`, `allocate` à cibles (`target, tolerance`) et `dialogue` à une réplique (`speaker, line`) arrivent dans l'app en écran de secours.
- **Décidé le 16 octobre 2026 : le format de l'app fait foi.** Le site adopte les formats du tableau 4.2. Les modifications sont détaillées en section 9, et les formats dans `docs/reference-technique-lecons.md`.

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
  - jusqu'à 3 ajouts de l'app sont joués après ses écrans (2 déclics du carnet et 2 mots du dictionnaire au plus) ; `/complete` ne reçoit que les positions servies par le serveur ;
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

## 8. Outils : portefeuille

Relevé du 16 octobre 2026 (site, branche `main`, lu en lecture seule). Le détail est dans le compte rendu de l'état des lieux ; ici, ce qu'il faudrait changer côté site.

### 8.1 Une position par actif, avec un prix de revient moyen
- **Manque** :
  - la table `positions` mélange l'actif et l'achat : `ticker`, `name`, `type`, `quantity`, `buy_price`, `buy_currency`, `buy_date`, `current_price`, plus `is_livret`, `is_manual`, `current_value_override`, `rate` ;
  - `POST /api/portfolio/positions` crée **toujours une nouvelle ligne**. 2 SOL ajoutés à 3 SOL donnent deux lignes SOL, chacune avec son propre prix d'achat ;
  - aucun prix de revient moyen (PRU) n'est calculé ; le gain est calculé ligne par ligne ;
  - `PATCH /api/portfolio/positions/{id}` réécrit la quantité et le prix d'achat sans laisser de trace.
- **Souhaité** :
  - **une position par actif et par portefeuille** : unicité sur (`portfolio_id`, `ticker`) pour les actifs cotés. Les livrets et les actifs manuels gardent des lignes libres ;
  - sur la position :
    - `avg_cost` (PRU, dans la devise de la position, frais d'achat compris) ;
    - `quantity` (quantité détenue) ;
    - `realized_gain` (cumul des plus-values réalisées) ;
    - `opened_at` (premier achat) et `closed_at` (quantité revenue à 0) ;
  - méthode : **prix moyen pondéré**. À chaque achat, `avg_cost = (quantité détenue × avg_cost + quantité achetée × prix + frais) / nouvelle quantité`. Une vente ne change pas le PRU ;
  - les valeurs de la position (quantité, PRU, plus-value réalisée) sont **toujours recalculées** en rejouant ses opérations dans l'ordre chronologique (une seule fonction, par exemple `PositionLedger::rebuild`), après chaque ajout, modification ou suppression d'opération ;
  - **devise** : celle de la première opération. Une opération dans l'autre devise est convertie au taux du jour de l'opération, gardé sur l'opération ;
  - **reprise des données** : chaque ligne existante devient une opération d'achat (date : `buy_date`, sinon `created_at`). Les lignes d'un même ticker sont ensuite fusionnées en une position. Les doublons de devise différente sont signalés dans le journal de la migration ;
  - **compatibilité** :
    - `buy_price` reste renvoyé (égal au PRU), pour la page web et les versions actuelles de l'app ;
    - `POST /api/portfolio/positions` devient un achat qui rejoint la position existante.

### 8.2 Historique des opérations
- **Manque** : aucune table d'opérations. Seuls des instantanés de valeur totale (`portfolio_snapshots`) sont gardés.
- **Souhaité** :
  - **table `portfolio_operations`** :
    - `id`, `portfolio_id`, `position_id` ;
    - `side` (`buy` | `sell`) ;
    - `quantity`, `unit_price`, `currency`, `fees` (0 par défaut) ;
    - `fx_rate_eur` (taux du jour, pour convertir) ;
    - `executed_at` (date et heure de l'opération, par défaut maintenant) ;
    - `note` (500 caractères au plus, déjà accepté puis jeté par `store`) ;
    - pour une vente : `cost_basis` (PRU au moment de la vente) et `realized_gain` ;
    - `timestamps` ;
  - **routes (connecté)** :
    - `POST /api/portfolio/operations` `{ ticker, name, type, side, quantity, unit_price, currency, fees?, executed_at?, note? }` : trouve ou crée la position, enregistre l'opération, recalcule. Réponse 201 `{ operation, position }`, `position` ayant la même forme qu'un élément de `GET /api/portfolio` ;
    - `GET /api/portfolio/positions/{id}/operations` : les opérations de la position, de la plus récente à la plus ancienne ;
    - `GET /api/portfolio/operations?page=` : toutes les opérations, paginées ;
    - `PATCH /api/portfolio/operations/{id}` et `DELETE /api/portfolio/operations/{id}` : refusés (422, message en français) si le recalcul ferait vendre plus que la quantité détenue à une date donnée ;
  - `DELETE /api/portfolio/positions/{id}` supprime aussi ses opérations ;
  - `PATCH /api/portfolio/positions/{id}` ne garde que le nom, la valeur manuelle et le taux. La quantité et le prix ne changent plus que par les opérations ;
  - **courbe** : chaque instantané garde aussi `net_invested` (achats moins ventes, au prix payé). Ainsi, un achat n'apparaît plus comme un gain sur la courbe ;
  - **réponse de `GET /api/portfolio/history`** :
    - par point : `invested` ;
    - la réponse doit aussi arriver en entier à l'app (voir 8.6).

### 8.3 Ventes et plus-value réalisée
- **Manque** : aucune vente. Pour vendre, on supprime la ligne ou on baisse sa quantité, et le gain disparaît.
- **Souhaité** :
  - **une vente** est une opération `sell`. Sa quantité doit être positive et ne pas dépasser la quantité détenue à cette date ; sinon 422 « Tu ne peux pas vendre plus que ce que tu détiens. » ;
  - **plus-value réalisée** = `quantité × prix de vente − frais − quantité × PRU`, gardée sur l'opération et cumulée sur la position (`realized_gain`, et `realized_gain_eur` au taux de l'opération) ;
  - **position soldée** (quantité 0) : elle est gardée avec `closed_at`, hors de la liste active. Elle est renvoyée par `GET /api/portfolio?include_closed=1`, ou dans un champ séparé `closed_positions` ;
  - **dans `GET /api/portfolio`** :
    - `realized_gain_total_eur` ;
    - `unrealized_gain_eur` (le `gain_loss` actuel, calculé sur le PRU) ;
  - **mention dans la réponse** : la plus-value est **indicative**. Pour les cryptos, l'impôt français se calcule sur l'ensemble du portefeuille (article 150 VH bis), pas actif par actif.

### 8.4 Cours fiables
- **Manque** :
  - **Actions et ETF** (`StockPriceProvider`) : `query2.finance.yahoo.com/v7/finance/quote` répond **401** (vérifié le 16 octobre 2026). Chaque titre passe donc par le repli `v8/finance/chart`, qui répond : un appel par titre, l'un après l'autre (6 s de délai chacun) ;
  - **taux EUR/USD** (`PriceService`, `PortfolioController`, `SnapshotService`) : il vient de `v7/finance/quote?symbols=EURUSD=X`, donc **401**, et retombe sur **1,08 écrit en dur**. Le taux réel était de 1,1236 le 16 octobre 2026 :
    - toutes les conversions sont faussées d'environ 4 % ;
    - la valeur en euros des cryptos est gonflée (somme en USD de CoinGecko, divisée par 1,08) ;
    - le montant investi en euros d'un achat en dollars l'est aussi ;
  - **autres devises** : une devise autre que EUR (GBp, CHF, JPY…) est traitée comme du dollar dans `buildStockEntry` ;
  - **cryptos** : seules les 40 de `COINGECKO_MAP` sont reconnues. Une autre crypto (RENDER, FET…) est envoyée à Yahoo comme une action (symbole `RENDER` au lieu de `RENDER-USD`). Elle n'a donc pas de cours et reste « prix figé » au prix d'achat.
- **Ce qui marche déjà dans le code** (vérifié le 16 octobre 2026) :
  - CoinGecko `simple/price` (sans clé) ;
  - Binance `ticker/price` (repli, en USDT) ;
  - Yahoo `v8/finance/chart` (cours et historique) ;
  - Yahoo `v1/finance/search` ;
  - OpenFIGI (ISIN).
- **Souhaité** :
  - **actions et ETF** : retirer l'appel v7 et passer directement par `v8/finance/chart`, en parallèle (`Http::pool`), avec le cache de 5 minutes ;
  - **taux de change** : un seul service, utilisé par l'index, l'historique et les instantanés. Source : `v8/finance/chart/EURUSD=X`, ou la BCE (par exemple Frankfurter) en repli. Il gère toutes les devises (`{DEV}EUR=X`, GBp divisé par 100). Plus aucune valeur écrite en dur : si aucun taux n'est disponible, garder le dernier taux connu et sa date ;
  - **cryptos** : résoudre l'identifiant CoinGecko par sa recherche (`/api/v3/search`), une fois par actif, et le garder sur l'actif (voir 8.5). Clé CoinGecko « demo » gratuite, pour ne plus dépendre de la limite publique ;
  - **dans chaque position** : `price_source` (`coingecko`, `binance`, `yahoo-chart`, `manual`) et `price_updated_at`, pour que l'app dise « cours du … » quand il est ancien ;
  - **tests** : avec `Http::fake`, v7 en 401, taux absent, crypto inconnue de la liste.

### 8.5 Logos des actifs
- **Manque** :
  - le site ne garde **aucune image d'actif**. `public/data/assets.json` (522 actifs : 369 actions, 81 ETF, 40 cryptos, 15 autres, 12 matières, 5 livrets) n'a que `ticker`, `name`, `type`, `exchange`, et parfois `isin`, `currency`, `rate` ;
  - la page web et l'app affichent une icône par type, pas par actif.
- **Souhaité** :
  - **table `assets`**, qui remplace `assets.json` :
    - `ticker`, `name`, `type`, `exchange`, `isin`, `currency` ;
    - `coingecko_id`, `yahoo_symbol` ;
    - `logo_path`, `logo_updated_at` ;
    - la position la référence par `asset_id` ;
  - **cryptos** : le logo vient de CoinGecko (`/api/v3/coins/markets`, champ `image` ; vérifié pour Solana). Il est téléchargé une fois et servi par le site (stockage public), sans lien direct vers CoinGecko ;
  - **actions et ETF** : aucune source gratuite n'est déjà branchée. Au choix :
    - des logos choisis et déposés depuis l'admin pour les titres les plus suivis ;
    - un service de logos à partir du site de l'entreprise, à valider (conditions d'usage) ;
  - **API** : `logo_url` (URL absolue, ou `null`) dans chaque position de `GET /api/portfolio`, dans les résultats de `GET /api/search`, et dans `POST /api/portfolio/operations` ;
  - **côté app** : sans logo, une pastille avec les initiales du ticker, dans la couleur du type.

### 8.6 Historique du portefeuille dans l'app
- **Manque** :
  - `GET /api/portfolio/history` répond `{ data: [...], range, total_invested, current_value }` ;
  - dans l'app, `authRequest` passe toute réponse par `unwrap()` (`src/context/ApiContext.tsx`), qui ne garde que `data` quand cette clé existe ;
  - `range`, `total_invested` et `current_value` sont donc perdus, et l'app reçoit un simple tableau ;
  - `HistoryChart` lit ensuite `history.data`, qui n'existe pas sur un tableau : la courbe affiche **toujours « Pas encore de données. »**, et la ligne « investi » n'est jamais tracée.
- **Souhaité** :
  - côté site, une réponse que `unwrap()` ne déplie pas, sans casser la page web (qui lit `data`) : `GET /api/portfolio/history?shape=app` ou une route `GET /api/portfolio/chart`, avec `{ points: [...], range, total_invested, current_value }` ;
  - **autre voie, côté app** : corriger `getPortfolioHistory` dans `ApiContext.tsx`. Ce fichier est interdit sans ton accord explicite.
- **En attendant** (corrigé dans l'app le 16 octobre 2026, sans toucher à `ApiContext.tsx`) : `HistoryChart` accepte le tableau tel quel ou la réponse entière (`src/utils/portfolioHistory.ts`), et la ligne « investi » vient de `total_invested_eur` de `GET /api/portfolio`. Seul `current_value` reste perdu, sans effet : la carte du haut l'affiche déjà.

### 8.7 Petites corrections au passage
- **Journaux de débogage** : `PortfolioController::index` écrit à chaque appel un journal `Portfolio livePrices`, et un journal propre à SOL (`Prix SOL utilisé pour total`). `CryptoPriceProvider` écrit la réponse brute de CoinGecko à chaque appel. À retirer ;
- **instantané à la connexion** : `TakePortfolioSnapshot` écoute l'événement `Login`, que la connexion de l'app par jeton (`createToken`) ne déclenche pas. Les comptes de l'app n'ont que les instantanés planifiés (toutes les 4 h, 24 h d'écart pour un compte gratuit) ;
- **recherche** : `formatResult` interroge un cours pour chacun des 12 résultats ; un seul appel groupé suffirait.

## 9. Leçons : aligner le site sur le format de l'app

Décidé le 16 octobre 2026 : **le format de l'app fait foi.** Les formats exacts, avec un exemple complet par type, sont dans `docs/reference-technique-lecons.md` (partie 2). Les points 4.1 (`takeaway`), 4.2 (`true_false`, `order`, `match`, `simulator`), 4.4 (`kind`) et 4.9 (`best_run`) en font aussi partie.

**Le web est gelé.** Le lecteur web ne saura pas jouer les écrans au format de l'app. Proposition : le validateur et le correcteur acceptent ces formats, et une leçon qui en contient est signalée « à jouer dans l'app » sur le web, jusqu'à la refonte. Ce petit affichage web demandera ton accord.

### 9.1 Types que l'app ne joue pas : `number` et `live_month`
- **Manque** :
  - l'app n'a pas d'écran pour ces deux types : elle affiche l'écran de secours et n'envoie aucune réponse ;
  - le serveur compte alors l'écran comme raté. Le score baisse, la leçon peut passer en « ratée » (XP à 25 %), et la notion recule de 2 paliers ;
  - `number` est en plus rejouable en révision ;
  - aucune leçon réelle n'en contient aujourd'hui (vérifié sur les quatre leçons du module « Avant d'investir »).
- **Souhaité** :
  - le validateur refuse `number` et `live_month` dans une leçon publiée ;
  - `servableScreens` ne sert en révision que les types joués par l'app : `choice`, `slider`, `document`, `dialogue`, `true_false`, `order`, `match`, `allocate` ;
  - une estimation à saisir s'écrit en `slider` noté (`answer`, `tolerance`).
- **En attendant** : rien à faire tant qu'aucune leçon n'utilise ces types.

### 9.2 `dialogue` au format de l'app
- **Manque** : le site n'accepte que `speaker`, `line` et `replies[{id, text, cost, correct}]`. L'app lit `character`, `messages` et `replies[{id, text, correct, reaction}]`.
- **Souhaité** :
  - **validateur** :
    - `character{name (obligatoire), role}` ;
    - `messages` : liste de textes, au moins 1 ;
    - `replies` : 2 à 5 réponses `{id, text, correct, reaction}`, au moins une juste si l'écran est noté ;
  - **correcteur** : inchangé (la réponse choisie est `correct`) ;
  - l'ancien format est retiré : seule la leçon de démonstration des tests l'utilise.

### 9.3 `allocate` au format de l'app (règles)
- **Manque** :
  - le site attend des cibles (`target`, `tolerance`, `locked`, `max`) et corrige sur ces cibles. L'app attend des règles et met le format à cibles en écran de secours ;
  - le site impose `review: false`, alors que l'app révise ce type.
- **Souhaité** :
  - **validateur** :
    - `total` (nombre), `step` (> 0), `unit`, `base` et `base_unit` ;
    - `buckets` : 2 à 5 pots `{key, label, hint, start, reservoir, live}`, avec **exactement un réservoir** et une somme des `start` égale à `total` ;
    - `rules` : au moins une règle `{bucket (clé existante), min, val}` ;
  - **correcteur** : chaque règle respectée (`valeur ≥ min`) et somme égale à `total` ;
  - `allocate` sort de `NOT_REVIEWABLE` ;
  - l'ancien format est retiré : aucune leçon réelle ne l'utilise.

### 9.4 Révélation
- **Manque** :
  - `start{label, value}` est refusé (clé inconnue) ;
  - une ligne `dim` doit avoir une valeur non vide, alors que l'app admet `""` pour une ligne de commentaire.
- **Souhaité** : admettre `start`, et une valeur vide ou absente sur une ligne `dim`.

### 9.5 Sous-titre sur tous les écrans
- **Manque** : `subtitle` n'est admis que pour `choice`, `number`, `slider`, `document` et `allocate`. L'app le lit sur tous les types.
- **Souhaité** : admettre `subtitle` sur tous les types.

### 9.6 Document
- **Manque** : le site peut produire un bulletin de paie (`entete.vue: "bulletin"`, `conges`, `brut`…) et des cellules de récapitulatif marquées justes. L'app n'affiche ni l'un ni l'autre : une cellule juste rendrait l'écran impossible à réussir.
- **Souhaité** : le contrôle de cohérence refuse, dans une leçon publiée, la vue bulletin et une cellule de récapitulatif marquée juste, tant que l'app n'a pas de rendu pour eux.

### 9.7 Difficulté des leçons
- **Manque** :
  - `lessons.difficulty` n'a que 3 valeurs (`debutant`, `intermediaire`, `avance`), contre 5 pour les modules (`entree`, `debutant`, `inter`, `avance`, `expert`) ;
  - l'import recopie le niveau du module dans la leçon, ce qui échoue pour `entree`, `inter` et `expert` ;
  - cette difficulté fixe le montant des coffres.
- **Souhaité** :
  - la difficulté de la leçon prend les 5 valeurs du module, ou se déduit du module ;
  - montant des coffres : `entree` comme `debutant`, `inter` comme `intermediaire`, `expert` comme `avance`.

### 9.8 Bornes des nouveaux types
- **Souhaité** : garder les bornes actuelles du site (`choice` 2 à 8 options, `reveal` 8 lignes, `dialogue` 5 réponses, `allocate` 5 pots), et ajouter :
  - `true_false` : 2 à 6 cartes, `pass` entre 1 et le nombre de cartes ;
  - `order` : 2 à 6 éléments, `start` permutation des ids ;
  - `match` : 2 à 5 paires, `right_order` permutation, `max_errors ≥ 0` ;
  - `simulator` : toujours non noté, formule `savings_from_age` ou `loan_over_years`, 1 à 4 sorties.

### 9.9 Niveau et documentation
- **Niveau** : le défi du jour, les quêtes et les cartes de module ajoutent des XP sans recalculer le niveau du serveur. L'en-tête de l'app (niveau du serveur) et le profil (calculé depuis les XP) peuvent alors différer. Souhaité : un seul point de crédit des XP, qui recalcule toujours le niveau.
- **Documentation du site** : `API.md` donne un exemple `true_false` d'une autre forme et annonce « 3 tentatives au plus » (le serveur n'en garde qu'une). `config/valtheria.php` et `docs/FORMAT_ECRANS.md` disent « échec → palier 0 » (le code retire 2 paliers, avec un plancher à 1). Souhaité : les remettre au format de l'app, avec les exemples de `docs/reference-technique-lecons.md`.
