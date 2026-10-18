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
| — | Correction serveur des six nouveaux types d'écrans | **En production depuis le 17 octobre 2026** (lot n° 9, PR n° 11) |
| 1 | Changer de mot de passe depuis l'app | Le changement passe par le site |
| — | Mot de passe oublié | **En production** (essai d'envoi réel le 17 octobre 2026) ; activé dans l'app |
| 1 | Inscription depuis l'app | Fermée côté serveur (403) |
| 2 | Synchronisation de la progression gardée sur le téléphone (10) | Carnet, semaine, étapes du patrimoine, précision, mots et objectifs perdus sur un nouveau téléphone ; écrans qui contredisent le serveur |
| 2 | Dates d'activité par module et par leçon (4.6) | La leçon du jour et l'ordre des univers ne suivent que ce téléphone |
| — | Phrase « À retenir » (takeaway) des leçons | **En production depuis le 17 octobre 2026** (lot n° 9, E7) |
| 2 | Objectifs crypto et impôts | Gardés sur le téléphone seulement |
| 2 | Gel de série et record pour les comptes | « Bientôt disponible avec ton compte » ; record gardé sur le téléphone |
| 2 | Photo de profil | Initiale à la place de la photo |
| 3 | Bonus de série de bonnes réponses (4.9) | Pas de bonus d'XP ni de Vals pour les bonnes réponses d'affilée ; défis de précision gardés sur le téléphone |
| — | Portefeuille : positions, opérations, ventes, cours, logos, risque (8) | **En production depuis le 17 octobre 2026** ; l'app utilise les nouvelles routes |
| — | Écrans `number` et `live_month` non joués par l'app (9.1) | **En production** : refusés dans une leçon publiée, jamais servis en révision |
| — | Formats de l'app pour `dialogue` et `allocate` (9.2, 9.3) | **En production depuis le 17 octobre 2026** |
| — | Révélation, sous-titre, document, difficulté des leçons (9.4 à 9.7) | **En production depuis le 17 octobre 2026** |
| — | Budget de l'app (11) | **En production depuis le 18 octobre 2026** (PR n° 12 et n° 13) |
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
- **Fait** : `POST /api/auth/forgot-password` `{ email }` répond en production (422 sans adresse, 200 avec une adresse ; essai d'envoi réel vers le compte de test le 17 octobre 2026). `FORGOT_PASSWORD_ENABLED = true` dans l'app : la connexion et les Réglages envoient le lien.
- **À confirmer** : la réception du courriel (boîte du compte de test, spams compris).

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

**En production depuis le 17 octobre 2026** (PR #5 fusionnée, commit 93e4f83 du site) :
- les cinq migrations sont passées ;
- reprise des lignes : les deux lignes SOL du compte de test sont fusionnées, les livrets sont restés des lignes libres ;
- `public/storage` est en place ;
- les 40 logos des cryptos sont servis par le site ;
- la file d'attente et la tâche planifiée tournent (logos chaque mois, instantanés toutes les 4 h).
- Sauvegarde vérifiée juste avant : `/var/backups/valtheria/pre-deploy/db-avant-lot-portefeuille-20261016-222338.sql.gz`, restaurée à l'identique dans une base temporaire, supprimée ensuite.
- L'app bascule sur le nouveau suivi de patrimoine (8.5) : `GET /api/portfolio` répond au nouveau format.

### 8.1 Ce qui est fait

**Une position par actif**
- La position est recalculée à partir de ses opérations :
  - prix de revient moyen pondéré, frais compris ;
  - plus-value réalisée cumulée ;
  - dates d'ouverture et de clôture.
- Les livrets et les actifs manuels restent des lignes libres, sans opérations.
- **Reprise des données** : chaque ligne existante devient un achat, puis les lignes d'un même actif sont fusionnées (même ticker, même devise). Elle est réversible, et vérifiée sur MySQL comme sur SQLite.

**Les opérations** : achat ou vente, quantité, prix, devise, frais, date, note.
- Routes : ajouter, lister (en tout et par position), modifier, supprimer.
- Chaque changement rejoue l'historique de la position, sous verrou.

**Les ventes**
- Une vente au-delà de la quantité détenue à sa date est refusée (422), et rien n'est écrit.
- La plus-value réalisée est calculée en devise et en euros.
- Les positions soldées sont renvoyées à part, dans `closed_positions`.

**Les cours**
- **Actions et ETF** : fin de Yahoo v7 (401) ; Yahoo v8 est appelé en parallèle.
- **Taux de change** : un seul service pour toutes les devises, sans aucune valeur écrite en dur (le 1,08 a disparu).
  - Sources : Yahoo v8, puis la BCE, puis le dernier taux connu.
- **Cryptos** : celles hors des 40 connues sont reconnues par la recherche CoinGecko.
- **Source et heure du cours** dans chaque position (`price_source`, `price_updated_at`). Sans source disponible, le dernier cours gardé est servi.

**Les logos et la table des actifs**
- Une table `assets` remplace `public/data/assets.json`.
- Les logos des cryptos sont récupérés chez CoinGecko et servis par le site, le 1er de chaque mois.
- `logo_url`, ou `null`, est renvoyé dans le portefeuille et dans la recherche.

**Pour les écrans de l'app**
- **Type d'actif et niveau de risque par actif** (`risk_level`, `risk_label`) : sans risque, modéré, élevé, très élevé.
  - Par défaut selon le type : livrets sans risque, ETF modéré (à effet de levier : très élevé), actions et matières élevé, cryptos très élevé.
  - Réglable dans la nouvelle page d'admin « Actifs ».
- **Intérêts estimés des livrets sur l'année** (revenus passifs) : `annual_interest_estimate_eur` par livret, et `passive_income_estimate_eur` au total.
  - Le taux vient de la position, sinon du chiffre réglementaire vérifié, sinon du catalogue.

**Courbe**
- Les instantanés gardent l'argent réellement versé (`net_invested`).
- `GET /api/portfolio/chart` répond sans clé `data`. `/history` reste inchangée pour la page web.

**Petites corrections**
- Journaux de débogage retirés.
- Instantané pris aussi à la connexion depuis l'app.
- Un seul appel de cours par recherche.
- L'IA ignore les positions soldées.
- L'export des données personnelles contient les opérations.

**Tests** : 481 au vert dans le site, dont 59 nouveaux. Les tests du lot passent aussi sur MySQL. Vérifié en local, avec les vraies sources, sur la page web connectée.

### 8.2 Format des routes

**Règles communes.**
- **Format** : JSON plat, sans enveloppe `data`, à une exception près : `/history` garde la clé `data` pour la page web. L'app lit `/chart`.
- **Accès** :
  - authentification Sanctum : jeton Bearer pour l'app, session et cookie pour la page web ;
  - un utilisateur ne voit que son portefeuille : toute position ou opération d'un autre compte répond `404` ;
  - sans connexion, la réponse est `401`.
- **Erreurs** :
  - une erreur de validation répond `422 { message, errors: { champ: [message] } }` ;
  - une erreur métier (vente supérieure à la quantité détenue, taux de change indisponible, position à plusieurs opérations modifiée par l'ancienne route) répond `422`, sous la même forme.
- **Montants** :
  - par ligne (`buy_price`, `avg_cost`, `current_price`, `value`, `invested`, `gain_loss`, `realized_gain`) : dans la devise de la position (`buy_currency`) ;
  - suffixés `_eur` ou `_usd` : convertis. Ils valent `null` si aucun taux n'est connu.

**Sources des cours** :

| Actif | Source | Cache |
|---|---|---|
| Crypto | CoinGecko `simple/price` (EUR et USD natifs, heure du cours). Identifiant : `assets.coingecko_id`, sinon recherche CoinGecko une fois par ticker. Binance en secours | 60 s |
| Actions, ETF, matières, paires Yahoo (`SOL-USD`, `EURUSD=X`) | Yahoo **v8 chart**, un appel par ticker, en parallèle. L'API **v7 n'est plus appelée** (401) | 5 min |
| Taux de change (toutes devises, pence de Londres compris) | `FxService` : Yahoo v8 `{DEV}EUR=X`, puis BCE (Frankfurter), puis dernier taux connu. Aucune valeur écrite en dur | 5 min |
| Livrets | Pas de cours. Taux : celui saisi sur la position, sinon le chiffre réglementaire vérifié (`livret_a_taux`, `ldds_taux`, `lep_taux`, `livret_jeune_taux`), sinon le taux du catalogue | — |

Chaque position dit d'où vient son cours :
- **`price_source`** :
  - `coingecko`, `binance` ou `yahoo-chart` : cours en direct ;
  - `stored` : dernier cours gardé, quand aucune source ne répond ;
  - `buy_price` : jamais coté ;
  - `livret` ou `manual`.
- **`price_updated_at`** : la date ISO 8601 de ce cours.

#### `GET /api/portfolio`
Positions détenues, positions soldées à part, et totaux. Un portefeuille vide est créé au premier accès.

```json
{
  "id": 1, "name": "Mon portefeuille", "currency": "EUR",
  "eur_usd_rate": 1.124353,
  "total_invested": 6460, "total_current": 6371.04, "gain_loss": -88.96, "gain_loss_pct": -1.38,
  "daily_change": -6.28, "daily_change_pct": -0.1,
  "total_current_eur": 6371.04, "total_current_usd": 7163.3, "total_invested_eur": 6460, "total_invested_usd": 7263.32,
  "unrealized_gain_eur": -88.96,
  "realized_gain_total_eur": 88.5,
  "net_invested_eur": 6371.5,
  "passive_income_estimate_eur": 144,
  "fx": { "eur_usd": 1.124353, "source": "yahoo", "updated_at": "2026-10-16T21:16:27+00:00" },
  "gains_note": "Plus-values indicatives, calculées actif par actif au prix de revient moyen. Pour les cryptos, l’impôt se calcule sur l’ensemble du portefeuille.",
  "positions": [
    {
      "id": 1, "ticker": "SOL", "name": "Solana", "type": "crypto",
      "asset_id": 4, "logo_url": "https://valtheria.fr/storage/assets/logos/sol-1a2b3c4d.png",
      "risk_level": "tres_eleve", "risk_label": "Très élevé",
      "buy_date": "2026-08-01", "opened_at": "2026-08-01T00:00:00+00:00", "closed_at": null,
      "operations_count": 4, "is_livret": false, "is_manual": false,
      "quantity": 4, "buy_currency": "EUR", "buy_price": 115, "avg_cost": 115,
      "current_price": 92.76, "invested": 460, "value": 371.04, "gain_loss": -88.96, "gain_loss_pct": -19.34,
      "current_price_eur": 92.76, "current_price_usd": 104.295, "value_eur": 371.04, "value_usd": 417.18,
      "invested_eur": 460, "invested_usd": 517.2, "native_currency": "EUR",
      "daily_change_pct": -1.66, "daily_change_abs": -6.28,
      "is_live": true, "price_source": "coingecko", "price_updated_at": "2026-10-16T21:19:32+00:00",
      "realized_gain": 88.5, "realized_gain_eur": 88.5, "unrealized_gain": -88.96,
      "annual_interest_estimate_eur": null, "interest_rate_pct": null
    },
    {
      "id": 3, "ticker": "LIVRET_A", "name": "Livret A", "type": "livret",
      "asset_id": 284, "logo_url": null, "risk_level": "sans_risque", "risk_label": "Sans risque",
      "operations_count": 0, "is_livret": true, "is_manual": false, "rate": 2.4,
      "quantity": 1, "buy_currency": "EUR", "buy_price": 6000, "avg_cost": 6000, "value": 6000, "invested": 6000,
      "price_source": "livret",
      "annual_interest_estimate_eur": 144, "interest_rate_pct": 2.4, "interest_rate_source": "position"
    }
  ],
  "closed_positions": [
    {
      "id": 7, "ticker": "AAPL", "name": "Apple Inc.", "type": "action",
      "asset_id": 9, "logo_url": null, "risk_level": "eleve", "risk_label": "Élevé",
      "buy_date": "2026-03-02", "opened_at": "2026-03-02T00:00:00+00:00", "closed_at": "2026-09-30T00:00:00+00:00",
      "operations_count": 2, "is_livret": false, "is_manual": false,
      "buy_currency": "USD", "avg_cost": 180.5, "realized_gain": 41.2, "realized_gain_eur": 36.63
    }
  ]
}
```

**Signification des champs** :
- **Risque** : `risk_level` vaut `sans_risque`, `modere`, `eleve`, `tres_eleve`, ou `null` (non classé).
- **Montant investi** :
  - `invested` et `total_invested*` : coût des parts **détenues**, au prix de revient moyen ;
  - `net_invested_eur` : argent **réellement versé** (achats frais compris, moins le produit des ventes, plus les montants des livrets et actifs manuels).
- **Plus-values** :
  - `unrealized_gain_eur` : plus-value latente ;
  - `realized_gain_total_eur` : plus-values réalisées, positions soldées comprises.
- **Revenus passifs** : `passive_income_estimate_eur` est la somme des intérêts estimés des livrets sur un an.

#### `POST /api/portfolio/operations`
Achat ou vente. L'opération trouve ou crée la position de l'actif, puis tout est recalculé.

**Corps de la requête**

| Champ | Règle |
|---|---|
| `ticker` | obligatoire, 64 caractères au plus, `A-Z 0-9 . - = ^ _` |
| `name` | facultatif, 120 caractères au plus (sinon le nom de l'actif) |
| `type` | facultatif : `crypto`, `action`, `etf`, `matiere` ou `autre` (sinon le type de l'actif) |
| `side` | obligatoire : `buy` ou `sell` |
| `quantity` | obligatoire, > 0 |
| `unit_price` | obligatoire, ≥ 0 |
| `currency` | `EUR`, `USD`, `GBP` ou `CHF` ; par défaut, la devise de la position |
| `fees` | ≥ 0, 0 par défaut |
| `executed_at` | date, au plus demain ; par défaut maintenant |
| `note` | 500 caractères au plus |

**Calculs**
- **Prix de revient moyen** : moyenne pondérée, frais compris. Une vente ne le change pas.
- **Plus-value d'une vente** : `quantité × prix − frais − quantité × prix de revient moyen`.
- **Devise différente de la position** : le prix est converti au taux du jour, figé sur l'opération.

**Réponse `201`**
```json
{
  "operation": {
    "id": 4, "position_id": 1, "side": "sell", "quantity": 2, "unit_price": 160, "currency": "EUR", "fees": 1.5,
    "total": 318.5, "executed_at": "2026-10-14T00:00:00+00:00", "note": "Prise de bénéfices",
    "cost_basis": 115, "realized_gain": 88.5, "realized_gain_eur": 88.5, "created_at": "2026-10-16T21:19:42+00:00"
  },
  "position": { "…": "même forme qu'un élément de positions (ou de closed_positions si elle est soldée)" }
}
```

**Vente au-delà de la quantité détenue** : réponse `422`, et rien n'est écrit.
```json
{ "message": "Tu ne peux pas vendre plus que ce que tu détiens à cette date (4).",
  "errors": { "quantity": ["Tu ne peux pas vendre plus que ce que tu détiens à cette date (4)."] } }
```
Une vente d'un actif jamais acheté répond aussi `422` : « Tu ne détiens pas encore SOL : commence par un achat. ».

#### `GET /api/portfolio/operations?page=&per_page=&ticker=&side=`
Toutes les opérations, de la plus récente à la plus ancienne. `per_page` vaut 30 par défaut, 100 au plus.
```json
{
  "operations": [
    { "id": 4, "position_id": 1, "side": "sell", "quantity": 2, "unit_price": 160, "currency": "EUR", "fees": 1.5,
      "total": 318.5, "executed_at": "2026-10-14T00:00:00+00:00", "note": "Prise de bénéfices",
      "cost_basis": 115, "realized_gain": 88.5, "realized_gain_eur": 88.5, "created_at": "2026-10-16T21:19:42+00:00",
      "ticker": "SOL", "name": "Solana", "type": "crypto" }
  ],
  "pagination": { "current_page": 1, "per_page": 30, "total": 4, "last_page": 1 }
}
```

#### `GET /api/portfolio/positions/{id}/operations`
`{ "position": { … même forme qu'un élément de positions … }, "operations": [ … de la plus récente à la plus ancienne … ] }`

#### `PATCH /api/portfolio/operations/{id}`
- **Corps (partiel)** : `side`, `quantity`, `unit_price`, `currency`, `fees`, `executed_at`, `note`.
- **Effet** : toute la position est rejouée.
- **Réponse** : `{ "operation", "position" }`.
- **Refus `422`** : si la modification rend une vente impossible à une date donnée.

#### `DELETE /api/portfolio/operations/{id}`
- **Réponse** : `{ "ok": true, "position": { … } | null }`.
- **Dernière opération** : sa suppression supprime aussi la position, et `position` vaut `null`.
- **Refus `422`** : si la suppression rend une vente impossible (par exemple, supprimer l'achat qui la couvrait).

#### `POST /api/portfolio/positions` (route d'origine, gardée)
- **Corps inchangé** : `ticker`, `name`, `type`, `quantity`, `buy_price`, `buy_currency` (`EUR` ou `USD`), `buy_date?`, `is_livret?`, `is_manual?`, `current_value_override?`, `rate?` (en %), `note?`.
- **Actif coté** : l'ajout devient un **achat qui rejoint la position existante** du même ticker.
- **Livret ou actif manuel** : ligne libre, comme avant.
- **Réponse** : `201 { "id": 1, "ticker": "SOL", "operation_id": 3, "merged": true }`. `operation_id` est absent pour un livret.

#### `PATCH /api/portfolio/positions/{id}` (route d'origine, gardée)
- **Livret et actif manuel** : tous les champs, comme avant, plus `rate` et `current_value_override`.
- **Actif coté** :
  - `name` est toujours accepté ;
  - `quantity`, `buy_price`, `buy_currency` et `buy_date` : si la position n'a qu'une opération, cet achat est réécrit. Si elle en a plusieurs, une valeur **différente** de l'actuelle répond `422` : « Cette position regroupe plusieurs opérations : modifie-les une par une dans son historique. ». Les mêmes valeurs renvoyées telles quelles, comme le fait la page web, sont acceptées.
- **Réponse** : `{ "ok": true }`.

#### `DELETE /api/portfolio/positions/{id}`
Supprime la position **et ses opérations**. Réponse : `{ "ok": true }`.

#### `GET /api/portfolio/chart?range=1d|1w|1m|3m|6m|1y|max` (pour l'app)
```json
{
  "points": [
    { "date": "2026-10-16T21:17:24+00:00", "value": 5463.55, "invested": 5600, "is_snapshot": true },
    { "date": "2026-10-16T21:19:42+00:00", "value": 6371.04, "invested": 6371.5, "is_snapshot": false }
  ],
  "range": "1m", "total_invested": 6460, "current_value": 6371.04, "net_invested": 6371.5
}
```
- **Points** : les instantanés de la période.
- **`invested`** : l'argent réellement versé à la date du point, ou `total_invested` pour les instantanés antérieurs au lot.
- **Moins de deux instantanés** : un point de plus à la valeur actuelle, ou une ligne plate.

#### `GET /api/portfolio/history?range=…` (page web)
Même contenu que `/chart`, sous la clé `data` (forme d'origine, avec `invested` en plus dans chaque point).

#### `GET /api/portfolio/snapshots`
`[ { "id", "total_value", "total_invested", "net_invested", "gain_loss", "gain_loss_pct", "snapshot_at" } ]`. Suppression inchangée.

#### `GET /api/search?q=&type=`
Recherche dans la **table des actifs**, puis OpenFIGI pour un ISIN, puis Yahoo. 12 résultats au plus, avec **un seul appel de cours** pour tous.
```json
{ "results": [
  { "ticker": "SOL", "name": "Solana", "type": "crypto", "isin": null, "exchange": "Crypto", "currency": "USD",
    "price": 92.76, "price_eur": 92.76, "price_usd": 104.25, "change_24h": -1.66,
    "logo_url": null, "risk_level": "tres_eleve", "risk_label": "Très élevé" }
] }
```

#### `GET /api/prices?tickers=…`
Forme inchangée.
- `source` vaut `coingecko`, `binance`, `yahoo-chart` ou `livret`.
- `updated_at` est l'heure du cours (horodatage Unix).
- `price_eur` et `price_usd` valent `null` si aucun taux n'est connu.
- Un livret renvoie son `rate` en fraction (0,017 pour 1,7 %), ou `null`.

### 8.3 Pendant la transition, et ce qui restera à faire dans l'app
**Les anciennes routes fonctionnent toujours.**
- **Ajout (`POST /api/portfolio/positions`)** : il rejoint désormais la position existante du même actif. 2 SOL ajoutés à 3 SOL donnent une position de 5 SOL, au prix de revient moyen.
- **Modification (`PATCH /api/portfolio/positions/{id}`)** : sur une position qui regroupe plusieurs opérations, un changement de quantité ou de prix répond 422, avec un message en français.

**Une fois le lot en production, l'app pourra**
- passer l'ajout par `POST /api/portfolio/operations` (achat ou vente, frais, date) ;
- afficher l'historique d'une position, ses ventes et sa plus-value réalisée ;
- afficher les positions soldées, le logo (avec une pastille d'initiales sans logo), le risque, et les intérêts estimés des livrets ;
- lire `GET /api/portfolio/chart` : la correction de `HistoryChart` (`src/utils/portfolioHistory.ts`) accepte déjà cette forme ;
- utiliser `GET /api/search` pour trouver un actif, au lieu de saisir son symbole.

**Bug du formulaire d'ajout actuel (livret), corrigé le 17 octobre 2026** : il envoyait le montant dans `quantity` et le taux dans `buy_price`. Il envoie désormais, comme la page web, `quantity: 1`, le montant dans `buy_price` et le taux dans `rate` (`src/utils/patrimoine/legacyPayload.ts`).

### 8.4 Points ouverts
- **Page web, gelée** : une position entièrement vendue disparaît de sa liste, et il n'y a pas d'écran d'opérations. À faire à la refonte du site.
- **Logos des actions et ETF** : aucune source gratuite n'est branchée. On peut en téléverser à la main dans l'admin « Actifs ».
- **Plus-values** : elles sont indicatives (`gains_note`). Pour les cryptos, l'impôt se calcule sur l'ensemble du portefeuille, pas actif par actif.

### 8.5 Suivi de patrimoine dans l'app : à garder sur le compte

**L'app (17 octobre 2026)** :
- Le nouveau suivi de patrimoine (Mon patrimoine, Un actif, Noter une opération, Analyse) est construit sur le format des routes 8.2.
- Il ne s'affiche que si `GET /api/portfolio` répond à ce format (`closed_positions` et `avg_cost` présents). Sinon, l'écran actuel du portefeuille reste en place, sans erreur.
- La question est reposée à chaque ouverture : rien n'est basculé pour de bon.

**Ce que l'app garde aujourd'hui sur le téléphone**, par compte (`valtheria:patrimoine:<compte>`, `src/utils/patrimoine/prefs.ts`) :
- **Épargne de précaution** : les dépenses mensuelles indiquées, et le nombre de mois visés (3 à 6). L'épargne est comptée sur les actifs sans risque.
- **Objectifs personnels** : nom, montant, échéance facultative, date d'atteinte (fêtée une seule fois). Un objectif se mesure sur la valeur totale du patrimoine.
- **Étapes gagnées** : premier actif suivi, trois types d'actifs, six mois de régularité, épargne de précaution atteinte, premier objectif atteint. Aucune n'est liée aux gains, à la performance ou au nombre d'opérations.
- **Régularité** : les mois où la personne a fait au moins un versement.
  - Les achats sont relus chez le serveur (`GET /api/portfolio/operations?side=buy`).
  - Les dépôts sur un livret sont notés par l'app quand le montant du livret augmente, car le serveur ne garde pas l'historique d'un livret.
  - Les ventes ne comptent jamais.
- **Mode discret** : il reste sur le téléphone, c'est un choix d'affichage.

**Souhaité côté site, pour retrouver tout cela sur un autre téléphone** :
- **Mouvements des livrets** : des versements et des retraits datés, au lieu d'un seul montant modifiable.
  - Par exemple, une table `savings_movements` (`position_id`, `amount` ±, `executed_at`) et `POST /api/portfolio/positions/{id}/movements`.
  - Le montant du livret devient leur somme.
  - Sans cela, la régularité ne voit pas les dépôts faits ailleurs que sur ce téléphone.
- **Objectifs** :
  - une table `portfolio_goals` (`user_id`, `kind` : `precaution` | `custom`, `name`, `amount`, `monthly_expenses`, `months`, `due_on`, `reached_at`) ;
  - les routes `GET`, `POST`, `PATCH` et `DELETE /api/portfolio/goals` ;
  - réponses en JSON plat (`{ goals: [...] }`, `{ goal }`), sans clé `data`.
- **Régularité et étapes calculées par le serveur** : `GET /api/portfolio/progress` → `{ regularity: { current_months, best_months, months: ["2026-07", …] }, milestones: [{ key, earned_at }] }`.
  - Mêmes règles que l'app : un mois compte s'il contient un achat ou un versement sur un livret ; les ventes ne comptent pas ; une étape gagnée le reste.
  - Les règles sont dans `src/utils/patrimoine/regularity.ts` et `milestones.ts`, testées dans `tests/patrimoine.test.ts`.
- **Répartition par zone** : une zone par actif (par exemple `assets.zone` : `europe`, `amerique_nord`, `monde`, `emergents`…, ou une répartition en % pour un ETF), renvoyée dans `GET /api/portfolio`. L'onglet « Par zone » de l'Analyse affiche « Bientôt disponible » en attendant.
- **Reprise** : à la première lecture de ces routes, l'app enverrait une fois ce qu'elle a gardé sur le téléphone (objectifs, étapes), comme pour les autres mémoires reprises d'un téléphone vers le compte.

## 9. Leçons : aligner le site sur le format de l'app

> **État au 17 octobre 2026** : 9.1 à 9.12 faits sur le site (pull request n° 11, fusion d7bdb11), CI verte, vérifiés sur le staging puis **en production** (base sauvegardée avant, vérifications de bout en bout depuis l'app). Détail et vérifications : `docs/reference-technique-lecons.md`, partie 5.0. Choix retenu pour 9.7 : la difficulté se déduit du module (cinq niveaux), la colonne de la leçon garde trois valeurs.

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
- **Manque** : `subtitle` n'est admis que pour `choice`, `number`, `slider`, `document` et `allocate` (refusé notamment sur `reveal`, `dialogue` et `live_month`). L'app le lit sur tous les types.
- **Souhaité** : admettre `subtitle` sur tous les types.

### 9.6 Document
- **Manque** : le site peut produire un bulletin de paie (`entete.vue: "bulletin"`, `conges`, `brut`…) et des cellules de récapitulatif marquées justes. L'app n'affiche ni l'un ni l'autre : une cellule juste rendrait l'écran impossible à réussir.
- **Souhaité** : le contrôle de cohérence refuse, dans une leçon publiée, la vue bulletin et une cellule de récapitulatif marquée juste, tant que l'app n'a pas de rendu pour eux.

### 9.7 Difficulté des leçons
- **Manque** :
  - `lessons.difficulty` n'a que 3 valeurs (`debutant`, `intermediaire`, `avance`), contre 5 pour les modules (`entree`, `debutant`, `inter`, `avance`, `expert`) ;
  - l'import recopie le niveau du module dans la leçon, ce qui échouerait pour `entree`, `inter` et `expert` (le module importé aujourd'hui est `debutant`) ;
  - cette difficulté fixe le montant des coffres.
- **Souhaité** :
  - la difficulté de la leçon prend les 5 valeurs du module, ou se déduit du module ;
  - réutiliser la correspondance qui existe déjà pour le prompt IA (`lessonDifficultyFromModule`) à l'import et pour les coffres : `entree` comme `debutant`, `inter` comme `intermediaire`, `expert` comme `avance`.

### 9.8 Bornes des nouveaux types
- **Souhaité** : garder les bornes actuelles du site (`choice` 2 à 8 options, `reveal` 8 lignes, `dialogue` 5 réponses, `allocate` 5 pots), et ajouter :
  - `true_false` : 2 à 6 cartes, `pass` entre 1 et le nombre de cartes ;
  - `order` : 2 à 6 éléments, `start` permutation des ids ;
  - `match` : 2 à 5 paires, `right_order` permutation, `max_errors ≥ 0` ;
  - `simulator` : toujours non noté, formule `savings_from_age` ou `loan_over_years`, 1 à 4 sorties.

### 9.9 Niveau et documentation
- **Niveau** : le défi du jour, les quêtes et les cartes de module ajoutent des XP sans recalculer le niveau du serveur. L'en-tête de l'app (niveau du serveur) et le profil (calculé depuis les XP) peuvent alors différer. Souhaité : un seul point de crédit des XP, qui recalcule toujours le niveau.
- **Documentation du site** : `API.md` donne un exemple `true_false` d'une autre forme et annonce « 3 tentatives au plus » (le serveur n'en garde qu'une). `config/valtheria.php` et `docs/FORMAT_ECRANS.md` (ligne 252) disent « échec → palier 0 » (le code retire 2 paliers, avec un plancher à 1). Souhaité : les remettre au format de l'app, avec les exemples de `docs/reference-technique-lecons.md`.

### 9.10 Contrôle de format à la publication (ajouté le 17 octobre 2026)
- **Manque** : à la publication d'une leçon dans l'administration, et à l'approbation d'une revue, seul le contrôle des chiffres en dur est appelé (`PublicationFigureGuard`), pas `LessonFormatValidator`. Une leçon publiée peut donc contenir :
  - un type que l'app ne joue pas (voir 9.1) ;
  - un `reveal` ou un `simulator` marqué `scored: true` : l'app le compte juste, le serveur le compte **raté** ;
  - un `choice` noté sans option, ou un `document` noté sans ligne touchable : la leçon est bloquée dans l'app (« Valider » reste grisé).
- **Souhaité** :
  - appeler `LessonFormatValidator::validate($data, true)` à la publication (`AdminLessonController`) et à l'approbation en revue, et refuser (422) avec ses messages, comme le contrôle des chiffres en dur ;
  - ajouter au validateur : au moins une ligne touchable dans chaque variante d'un `document` noté, et aucune ligne `section` marquée juste.

### 9.11 `selon_chiffres` figé au service (ajouté le 17 octobre 2026)
- **Manque** : la version d'un écran `selon_chiffres` est choisie au service avec les chiffres du moment, puis recalculée à `/complete`. Si un chiffre change entre les deux, le serveur corrige un autre écran que celui que l'app a affiché et noté.
- **Souhaité** : figer la version choisie au service, comme le tirage d'artefact (`ArtefactResolver::draw`), et la reprendre à `/complete` et en révision.

### 9.12 Révision : leçons dépubliées (ajouté le 17 octobre 2026)
- **Manque** : `servableScreens` prend les écrans de toutes les leçons terminées, publiées ou non. Une leçon dépubliée continue d'être servie en révision.
- **Souhaité** : ne servir en révision que les écrans des leçons publiées (`is_published`).

## 10. Synchronisation de la progression (décision du 17 octobre 2026)

Une partie de la progression ne vit que sur le téléphone (AsyncStorage, par compte). Sur un nouveau téléphone, après une réinstallation ou une déconnexion (qui purge désormais le téléphone), elle est perdue, et certains écrans contredisent le serveur (audit, I36 : « série 1 j » à côté de « Ta première leçon de la semaine t'attend », carnet vide après 4 leçons, « étapes 0 sur 5 » à côté de deux étapes fêtées).

- **Manque** : aucune route pour ces données.
- **Souhaité** : pour chaque bloc, une lecture et une écriture par compte, dernier écrit gagnant (horodatage), sans montant financier nouveau :

| Bloc | Clé du téléphone aujourd'hui | Contenu | Route proposée |
|---|---|---|---|
| Carnet de déclics | `valtheria:carnet:<id>` | phrase, univers, leçon, date (voir 6) | `GET` et `POST /api/notebook` (ajout), `DELETE /api/notebook/{id}` |
| Journal de la semaine | `valtheria:journal:<id>` | jour, XP, leçons, révisions | à déduire côté serveur des leçons et révisions terminées : `GET /api/progress/week` |
| Leçons faites, univers vus | `valtheria:apprendre:lecons:<id>`, `valtheria:univers-vus:<id>` | identifiants et dates | `GET /api/progress/lessons` (rejoint 4.6) |
| Précision (défis, record d'affilée) | `valtheria:precision:<id>` | record, défis gagnés | `GET` et `PUT /api/progress/accuracy` (rejoint 4.9) |
| Mots du Dictionnaire | `valtheria:mots-etats:<id>`, favoris, récents | état de chaque mot, dates | `GET` et `PUT /api/dictionary/progress` |
| Étapes et objectifs du patrimoine | `valtheria:patrimoine:<id>` | étapes gagnées (dates), objectifs (nom, montant visé, échéance), dépenses mensuelles du coussin | `GET` et `PUT /api/portfolio/goals` et `/api/portfolio/milestones` |
| Révision (historique) | `valtheria:revision:<id>` | notions revues et résultats | déjà en partie côté serveur (`/api/revision`) ; à compléter pour les déclics et les mots |

- **Côté app** : une fois les routes en ligne, chaque magasin de `src/state/` lit le serveur à l'ouverture, fusionne avec le téléphone (le plus récent gagne), puis écrit au serveur après chaque changement, avec la même file d'attente que sur le téléphone.
- **En attendant** : tout reste sur le téléphone, purgé à la déconnexion et à la suppression du compte.


## 11. Budget de l'app : « Mon budget » (18 octobre 2026)

> **État** : fait et en production (pull request n° 12 du site, fusion fc4b708 ; base sauvegardée avant, `db-20261018-022500.sql.gz`). Le serveur garde les données, l'app calcule tout.

Principe : tout est manuel, donc rien ne doit être une corvée. On saisit une fois les charges fixes, puis un seul chiffre à tenir à jour (le solde du compte). Aucune série quotidienne, aucune pénalité pour un oubli.

### 11.1 Ce qui existait (ancien Cash-flow)
- `cashflow_entries` : `type` (revenu, dépense, épargne), `nature` (récurrent, ponctuel), `category`, `label`, `amount`, `period_month` (ponctuels : 1er du mois), `is_active`.
- `cashflow_categories` : catégories du compte avec couleur (14 par défaut, « Autres » protégée).
- `users.cashflow_guide_done_at` (guide de prise en main), `cashflow_first_reward_at` (coffre de la première saisie).
- Routes `GET /api/cashflow`, `/api/cashflow/entries` (CRUD), `/api/cashflow/categories` (CRUD), `guide-done`, `claim-first-reward`.
- En production au 18/10/2026 : 3 comptes, 18 entrées (17 récurrentes).

### 11.2 Ce qui a été ajouté (migration `2026_10_18_100000_budget_tables`)
| Besoin du budget | Où |
|---|---|
| Rentrées et jour de paie, charges fixes avec leur jour, épargne prévue | récurrents de `cashflow_entries` + `day_of_month` (1 à 31) |
| Dépenses et rentrées du mode Détaillé, datées | ponctuels de `cashflow_entries` + `occurred_on` (aujourd'hui par défaut ; `period_month` suit) |
| Besoins / envies (répartition 50/30/20, flux) | `cashflow_categories.family` (posée sur les catégories existantes) |
| Enveloppes | `cashflow_categories.envelope_cap` (plafond mensuel ; null = pas d'enveloppe) |
| Relevés de solde datés | table `cashflow_balances` (un par jour, le dernier remplace) |
| Mode choisi, mise en route faite, seuil d'alerte des enveloppes | table `cashflow_settings` |
| Réponse au bilan mensuel | table `cashflow_reviews` (une par mois) |

Routes ajoutées : `GET /api/budget` (tout, 400 jours d'historique), `POST /api/budget/setup`, `POST /api/budget/balances`, `PATCH /api/budget/settings`, `POST /api/budget/reviews`. Les routes `/api/cashflow/entries` et `/api/cashflow/categories` acceptent le jour, la date, la famille et le plafond. Détail : `API.md` du site.

### 11.3 Reprise de l'ancien Cash-flow
Tant que la mise en route n'est pas faite, `GET /api/budget` renvoie les récurrents de l'ancien Cash-flow (`legacy`) : l'app les propose comme valeurs de départ (rentrées additionnées, charges rangées dans les cases, épargne). À la mise en route, ils sont mis en pause, jamais supprimés.

### 11.4 Fiches du Dictionnaire
Existent : « Taux d'épargne », « Reste à vivre », « Charges fixes », « Cash flow » (sans trait d'union). **Manquent** : « Budget », « Enveloppe », « Règle 50/30/20 ».

### 11.5 Côté app seulement (lots 3 et 4, 18/10/2026)
Aucune nouvelle route : le cash-flow, le bilan du mois, les mois dans le vert, les étapes et le lien avec le patrimoine se calculent sur le téléphone à partir de `GET /api/budget`.
- Dépenses courantes du mode Essentiel : déduites de deux soldes successifs (solde + rentrées − charges fixes − épargne − solde suivant), réparties jour par jour sur les mois (`src/utils/budget/flows.ts`).
- Bilan proposé une fois, mémoire du téléphone (`valtheria:budget:<compte>`) ; la réponse va dans `cashflow_reviews`.
- Étapes du budget gardées sur le téléphone, comme celles du patrimoine.
- L'ancien écran Cash-flow de l'app est supprimé ; ses routes serveur restent (le site s'en sert).
