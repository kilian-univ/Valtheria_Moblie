# Chiffres réglementaires écrits en dur

> Annexe de [l'audit complet](audit-complet.md) du 17 octobre 2026, en lecture seule. Les mentions « dossier de travail », « scratchpad » ou `extraits/…` renvoient à des fichiers temporaires de l'audit, non conservés.


Relevé du 17/10/2026. Sources : app `~/Developer/Valtheria_Moblie` (commit e6c8860), copie en lecture seule du site (commit 23572bb), relevé de la base de production du 17/10/2026 à 10 h 55 (69 chiffres, 4 leçons, 203 définitions, 281 articles). Les valeurs « actuelles » ci-dessous sont celles de la table `regulatory_figures` de production ; « à vérifier » signale une valeur qui n'est pas dans la table et que je n'ai pas pu confirmer sur une source officielle (aucun appel réseau).

Ce qui n'est pas retenu : les chiffres d'exemple (« si tu places 1 000 € »), les hypothèses annoncées comme telles (5 % par an, crédit à 3,5 %), les dates et faits historiques, les statistiques d'actualité datées. Les articles « evergreen » qui donnent un taux présenté comme actuel sont retenus.

> **Mise au point du 17 octobre (chantier 1)** : l'API ne sert que 2 articles. Les « 38 articles publiés » de ce relevé comptent 36 articles supprimés sur le site (suppression douce : la colonne `deleted_at` manquait au relevé de la base). Les articles faux cités ici ne sont donc pas visibles dans l'app aujourd'hui.

---

## 1. Syntaxe de variable et ses limites

### Syntaxe

- Repère : `{{cle}}`, espaces tolérés (`{{ livret_a_taux }}`), clé `[a-zA-Z0-9_.]+`. Regex : `/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/` (`app/Services/LessonVariableService.php`).
- Valeur injectée : le champ `value` de `regulatory_figures`, tel quel, sans balises HTML, **unité comprise** : « 1,7 % », « 22 950 € », « 5 ans », ou une liste comme « 4 600 € / 9 200 € ».
- Source unique : la table `regulatory_figures`. L'ancienne table `lesson_variables` a été fusionnée le 19/09/2026. La table est mise en cache 5 min, vidée à chaque écriture dans l'admin (`flush()`).

### Où la variable est résolue

| Contenu | Résolu ? | Où | Remarques |
|---|---|---|---|
| Leçons, écrans (`questions_data.screens`) | Oui, côté serveur | `Api/LessonController.php:126` (`apply`), `RevisionSessionService.php:96`, web `LearnController.php:79` | Remplace dans tous les textes de l'écran, en profondeur (choix, items, val…). Ajoute `has_volatile_note` et `volatile_verified_at` (date de vérification la plus ancienne). |
| Leçons : titre, description, objectif, résumé, module | **Non** | `LessonController.php:135-137` (`objectif` = `$raw['objective']` brut) | Un repère dans ces champs s'afficherait tel quel. |
| Contrôle de format | Oui pour les leçons | `LessonFormatValidator.php:105-128` | Refuse une leçon qui cite une clé inconnue. |
| Dictionnaire (`definition`, `full_definition`) | Oui, à chaque lecture | Accesseurs `app/Models/DictionaryTerm.php:28-36` ; donc `/api/dictionary`, `/api/dictionary/terms`, web | **Aucun contrôle de format** : une clé mal tapée s'affiche « {{livret_a_tx}} » chez l'utilisateur (simple warning dans les logs). L'admin édite le texte brut. |
| Articles (`title`, `excerpt`, `content`) | **Non, nulle part** | `Api/ArticleController.php` renvoie le modèle brut, `Article.php` n'a aucun accesseur | Un `{{cle}}` dans un article s'afficherait tel quel dans l'app et sur le web. Il faudrait un lot API dédié (accesseur + validateur), alors que le site est gelé. |
| Défis du jour, parcours de vie, défi hebdo | Non | `LifePathController`, `DailyChallengeController`, `GenerateWeeklyChallenge` | Contenus générés par l'IA ou chargés par seeder, sans résolution. |
| Taux des livrets du patrimoine | Oui, autrement | `Services/Assets/LivretRates.php` | Lit la table à chaque affichage (Livret A, LDDS, LEP, Livret Jeune, PEL, CEL) et renvoie le taux, sa date d'effet et sa date de vérification. |

### Côté app

- L'app reçoit le texte **déjà résolu** pour les leçons et le dictionnaire. Elle ne résout rien.
- Elle n'a **aucun accès** aux chiffres réglementaires. Seule exception : le taux des livrets, via `/portfolio` (`interest_rate_pct`, `interest_rate_source: 'regulatory'`, `interest_rate_effective_at`, `interest_rate_verified_at`), lu par `src/utils/patrimoine/model.ts:159-162` et affiché par `rateDateLabel` (AnalyseScreen:174, ActifScreen:313, OperationScreen:372). L'endpoint `/api/internal/regulatory-figures` est réservé aux agents (jeton + filtrage nginx).
- L'app **ignore** `has_volatile_note` et `volatile_verified_at` (`src/lesson/normalize.ts:7-8`). La mention « Taux en vigueur au … » du web n'apparaît donc pas dans l'app.
- Les leçons découvertes (`src/lesson/discovery/*.ts`) sont **embarquées dans l'app** : elles ne peuvent pas utiliser `{{cle}}`. Il faudrait soit un endpoint public des chiffres et une résolution côté client, soit servir ces leçons depuis le site.

### Limites du mécanisme

1. Pas de calcul : « 31,4 % de 5 000 € = 1 570 € » reste en dur. Il faut réécrire les exemples sans résultat chiffré, ou accepter ce chiffre en dur.
2. Pas d'accès à une partie d'une liste : `{{assurance_vie_abattement}}` donne « 4 600 € / 9 200 € », `{{ir_bareme_taux}}` donne « 0 % / 11 % / 30 % / 41 % / 45 % ». Pour citer une seule valeur, il faut des clés séparées.
3. L'unité fait partie de la valeur : on ne peut pas écrire « {{cle}} € » ni accorder la phrase.
4. Une valeur conditionne parfois la **logique** d'une question (quel livret rapporte le plus, quel est le bon ordre de remplissage) : la variable change le chiffre, pas la bonne réponse (voir leçon 102, écran 7).
5. Les prompts de génération IA (leçons, défis, parcours, articles) **n'injectent pas** la table et n'autorisent pas `{{cle}}`. Ils demandent même « Chiffres réels et actuels (taux Livret A, plafonds, etc.) » (`AiPromptBuilder.php:513`), et pour les articles « la valeur en vigueur au présent : "les prélèvements sociaux sont actuellement de X %" » (`AiPromptBuilder.php:640`). C'est la cause directe des taux de mémoire (Livret A 3 %, flat tax 30 %) dans les articles et les parcours de vie. Seul le prompt du chat de Val (`AiSystemPrompt::figuresBlock`) injecte la table ; l'app n'appelle pas `/ai`.

---

## 2. Déjà faux aujourd'hui (priorité)

Tout ce qui suit est servi aujourd'hui à l'app (ou le sera au prochain seeder), et contredit la table de production ou la loi en vigueur.

| # | Endroit | Extrait | Écrit | Valeur actuelle (base) | Clé à utiliser / correction |
|---|---|---|---|---|---|
| 1 | Définition « Flat tax » (prod, et seeder `DictionaryTermSeeder.php:487-490`) | « PFU de 30% … 12.8% d'impôt sur le revenu + 17.2% de prélèvements sociaux » ; exemple « 30% = 1 500€ … reste 3 500€ » | 30 % ; 17,2 % ; 1 500 € / 3 500 € | 31,4 % ; 18,6 % ; 1 570 € / 3 430 € | `{{flat_tax_taux}}`, `{{prelevements_sociaux_capital}}`, clé à créer `pfu_ir_taux` (12,8 %). Exemple à réécrire sans résultat calculé. Coquille « si tu êtes ». |
| 2 | Définition « Prélèvements sociaux » (prod ; seeder :493-496) | « Cotisations de 17.2% … CSG (9.2%), CRDS (0.5%) » ; « PEA de +5 ans … 17.2% » | 17,2 % ; CSG 9,2 % | 18,6 % (cas général, dont PEA) ; CSG 10,6 % (9,2 + 1,4 pt) | `{{prelevements_sociaux_capital}}`, préciser `{{prelevements_sociaux_reduits}}` pour l'assurance-vie ; clés à créer `csg_capital_taux` et `crds_taux`. |
| 3 | Définition « PEA » (prod ; seeder :475-478) | « seulement 17.2% de prélèvements sociaux » ; « (30% économisés = 12 000€) » | 17,2 % ; 30 % | 18,6 % ; 31,4 %. Le calcul est aussi faux sur le fond : après 5 ans, seule la part IR est économisée, soit 12,8 % × 40 000 = 5 120 € | `{{prelevements_sociaux_capital}}`, `{{pea_plafond}}`, `{{pea_duree_exoneration}}`, `pfu_ir_taux` (à créer). |
| 4 | Définition « Plus-value » (prod ; seeder :211-214) | « imposable en France à 30% (flat tax) » ; « tu paies 15€ … gardes 35€ » | 30 % ; 15 € / 35 € | 31,4 % ; 15,70 € / 34,30 € | `{{flat_tax_taux}}`. |
| 5 | Définition « CTO » (prod ; seeder :44-47) | « Les gains sont soumis au PFU à 30 % » | 30 % | 31,4 % | `{{flat_tax_taux}}`. |
| 6 | Définition « Intéressement » (prod ; seeder :1039) | « tu évites les 30% de flat tax — tu gagnes 600€ » | 30 % ; 600 € | 31,4 %. Faux aussi sur le fond : l'intéressement perçu est imposé au barème de l'IR, pas à la flat tax | Réécrire sans taux, ou avec `{{ir_bareme_taux}}`. |
| 7 | Définition « Loi Pinel » (prod ; seeder :555) | « Réduction allant jusqu'à 21% » ; « 21% = 42 000€ » | 21 % | Dispositif **fermé aux nouveaux investissements depuis le 31/12/2024** | Réécrire au passé (« dispositif fermé »), sans clé. |
| 8 | Leçon 102 « Où mettre ce coussin », écran 7 (prod ; source `database/seeders/data/03-lecon-ou-mettre-ce-coussin.json:139`) | Bonne réponse : « {{livret_jeune_plafond}} sur le Livret jeune, le reste sur le LEP ». Explication : « On remplit d'abord le livret au plafond le plus bas et **au meilleur taux** » | logique | LEP 2,5 % > Livret Jeune 1,7 % (taux minimum) : pour 2 000 €, tout sur le LEP rapporte 50 €/an, contre 37,20 € avec la réponse attendue | Logique dépendante des chiffres : revoir la question, ou préciser « si ta banque paie plus que le LEP sur le Livret jeune ». |
| 9 | App `src/lesson/discovery/decouvrir.ts:41-45` (+ `takeaway` l. 12) | net 1 660 → +470 → brut 2 130 → +925 → coût 3 055 | 470 / 2 130 / 925 | Incohérent avec la fiche de paie de référence (`fiche_de_paie_variantes.json`, variante `novembre_standard`) : brut 2 260, cotisations salariales 508,26, net avant impôt 1 751,74, prélèvement à la source 90,81, **net payé 1 660,93**, cotisations patronales 795,11, coût 3 055,11 | Le « 1 660 € net » est un net **après** impôt : aligner les lignes sur la fiche (pas de clé, cotisations figées au millésime 2026). |
| 10 | Article publié `pea` (n° 8) | « prélèvements sociaux (17,2 % en 2026) » ; « PFU de 30 %, qui inclut 12,8 % … et 17,2 % » ; « Rappel fiscal (données 2026) … 30 % » ; « PFU (30 %) » ×3 | 17,2 % (×4) ; 30 % (×5) | 18,6 % ; 31,4 % | Les articles ne résolvent pas les variables : correction manuelle, ou lot API. |
| 11 | Article publié `bitcoin-pourquoi-tout-le-monde-en-parle-en-2026` (n° 18) | « 30% de flat tax sur tes gains » ; encart « 30% Taux d'imposition des gains en bitcoin » | 30 % (×2) | 31,4 % (`crypto_taux_imposition`) | Préciser aussi que le seuil de 305 € porte sur le total des cessions, pas sur le gain (`crypto_seuil_exoneration`). |
| 12 | Article publié `pea-le-compte-bourse-qui-te-fait-payer-presque-zero-impot` (n° 40) | « imposition de tes gains à 30 % (12,8 % … + 17,2 % de prélèvements sociaux) » ×2 ; « prélèvements sociaux à 17,2 % » ×4 ; « 7 000 € de gain — 30 % … soit 2 100 € » ; quiz « 30 % » / « 17,2 % » | 30 % ; 17,2 % ; 2 100 € | 31,4 % ; 18,6 % ; 2 198 € | Correction manuelle. |
| 13 | Article publié `pea-le-compte-bourse-qui-te-fait-payer-moins-d-impots` (n° 41) | « seulement les prélèvements sociaux de 17,2 % » ; « auraient été taxés à 30 % (… flat tax) » | 17,2 % ; 30 % | 18,6 % ; 31,4 %. L'article donne pourtant 31,4 % = 12,8 + 18,6 plus bas : il se contredit | Correction manuelle. |
| 14 | Article publié `epargner-avec-un-petit-salaire-la-methode-qui-marche-vraiment` (n° 47) | « Son taux est à 2,5 % net … contre 1,5 % pour le Livret A » (×4) ; « 250 € … contre 150 € … 100 € de plus » ; « un point de plus que le Livret A à 1,5 % » ; quiz « 1,5 % — identique au Livret A » | Livret A 1,5 % ; 150 € ; 100 € ; 1 point | Livret A 1,7 % depuis le 1/8/2026 ; 170 € ; 80 € ; 0,8 point | `livret_a_taux` ; le LEP à 2,5 %, le plafond de 10 000 € et le RFR de 23 028 € sont justes. |
| 15 | Article publié `la-regle-des-50-30-20-reprends-le-controle-de-ton-budget` (n° 42) | « Livret A ou LDDS. Taux modestes en 2026 (autour de 1,4 à 1,6 %) » (×2) | 1,4 à 1,6 % | 1,7 % (`livret_a_taux`, `ldds_taux`) | Correction manuelle. |
| 16 | Article publié `1929-comment-une-bulle-speculative-a-plonge-le-monde-dans-le-chaos` (n° 27) | « Marie, 26 ans, hésite entre … les laisser sur son livret A à 3 % » (au présent) | 3 % | 1,7 % | Correction manuelle. |
| 17 | Site `database/seeders/data/life_path_scenarios.json` (parcours de vie servi par `/life-path/today`) | l. 886-889 « livret A … taux de 3%, environ 375 euros en 5 ans » ; l. 947 « environ 3% par an » ; l. 1002-1005 « À 3% annuel, tu gagneras 75 euros par an sur 2500 euros » ; l. 1176-1179 « livret A à 3% … n'égale pas l'inflation » | 3 % (×4) ; 375 € ; 75 € | 1,7 % : environ 437 € en 5 ans sur 5 000 €, 42,50 €/an sur 2 500 €. À 3 %, le texte se contredisait déjà (375 € au lieu de ~796 €). L. 1179 : 3 % > `inflation_annuelle` (2 %) | Pas de résolution de variables pour les parcours : correction du JSON et des scénarios déjà en base (absents du relevé). |
| 18 | Site `app/Services/Assets/LivretRates.php:24-31,54-66` (patrimoine de l'app) | Ticker `PEL` → `pel_taux`, « taux d'un PEL ouvert **cette année** » | 2 % pour tous les PEL | Le taux d'un PEL est fixé à l'ouverture (2,25 % pour 2024, 1,75 % pour 2025, 2 % pour 2026) | Erreur fonctionnelle : un PEL ancien est estimé au taux de l'année. Il faudrait l'année d'ouverture, ou garder le taux saisi pour le PEL. |
| 19 | Site `database/seeders/DictionaryTermSeeder.php` | Mêmes textes faux que les n° 1 à 7 | — | — | Le seeder fait `updateOrCreate` par slug et `DatabaseSeeder` l'appelle : relancé, il **réécrirait** toute correction faite en base. Corriger aussi le seeder. |

À vérifier, peut-être faux :
- `AiSystemPrompt.php:336`, PER, déblocage pour accident de la vie : « gains soumis aux SEULS prélèvements sociaux de 17,2 % ». Il faut confirmer que l'épargne retraite garde le taux réduit après la LFSS 2026. Sinon, c'est 18,6 %.
- Article n° 29 (or) : « 37,6 % sur la plus-value » suppose que les 18,6 % s'appliquent aux métaux précieux (19 % + 18,6 %).
- Définition « Taux d'usure » : exemple « Si le taux d'usure … est de 4.5% » alors que `credit_taux_usure` vaut 5,29 %. C'est présenté comme une hypothèse, donc pas faux en soi, mais il vaut mieux utiliser `{{credit_taux_usure}}`.

---

## 3. Tableaux par source

### 3.1 App : leçons découvertes et textes (`src/`, `app/`)

Bilan : en dehors des leçons découvertes, **aucun chiffre réglementaire en dur** dans les écrans, remarques de Val (`valTips.ts`), rappels (`reminder.ts`), analyse, épargne, cash-flow, constantes ou `src/utils/patrimoine`. Les seuils de `valTips.ts:16-19` et `analysis.ts:79` (30 %, 20 %, profils) sont des règles maison. « 3 à 6 mois » (`valTips.ts:57`, `ObjectifScreen.tsx:95`) est une règle d'usage. Le taux des livrets vient du serveur (voir § 1).

| Endroit | Extrait | Chiffre écrit | Base | État | Clé |
|---|---|---|---|---|---|
| `src/lesson/discovery/impots.ts:4,22-23,46-48,118` (+ `lecons-decouvertes.md:158-185`) | « Barème simplifié : 0 % jusqu'à 11 000 €, 11 % jusqu'à 30 000 €, 30 % au-delà » | taux 0/11/30 %, seuils 11 000 / 30 000 € | `ir_bareme_taux` 0/11/30/41/45 % ; `ir_bareme_seuils` 11 600 / 29 579 € | Annoncé comme simplifié. Les taux sont justes, les seuils arrondis. Avec le vrai barème, la prime de 2 000 € coûte 490 € (et non 410 €) ; le taux moyen de Léa reste d'environ 12,8 %. Acceptable. À revoir seulement si les taux changent. | Impossible côté app (texte local). Sinon, servir la leçon depuis le site. |
| `src/lesson/discovery/decouvrir.ts:12,21,41-45` | « 1 660 € net … 3 055 € » ; lignes 470 / 2 130 / 925 | cotisations | Pas de clé (taux de cotisations) | **Incohérent avec la fiche de paie source** (voir § 2, n° 9) | — |
| `src/lesson/discovery/epargner.ts:22,43` | « Avec 2 % d'inflation par an » | 2 % | `inflation_annuelle` 2 % | Cohérent, présenté comme hypothèse | `inflation_annuelle` |
| `src/lesson/discovery/logement.ts:20,51` | « 200 000 € sur 25 ans à 3,5 % » | 25 ans ; 3,5 % | `credit_duree_max` 25 ans ; `credit_taux_usure` 5,29 % | Cohérent. Le taux est une hypothèse, sous l'usure. | — |
| `src/lesson/discovery/investir.ts:20,46,55` | « 5 % par an » | 5 % | `etf_world_rendement_moyen` 8 %/an | Hypothèse prudente, annoncée comme telle | — |
| `src/lesson/discovery/crypto.ts`, `epargner.ts` (Livret A garanti, disponible) | — | — | — | Rien de réglementaire chiffré | — |

### 3.2 Leçons de production (`questions_data`, module 182, leçons 100 à 103)

La leçon 102 est la seule à utiliser les variables : 7 clés, 20 repères (`livret_jeune_plafond` ×6, `lep_taux` ×4, `livret_a_taux` ×3, `lep_plafond` ×2, `livret_a_plafond` ×2, `lep_rfr_plafond_1part` ×2, `ldds_plafond` ×1). Toutes ces clés existent en base.

| Endroit | Extrait | Chiffre écrit | Base | État | Clé |
|---|---|---|---|---|---|
| Leçon 102, écran 6, explication (source `03-lecon-…json:118`) | « Le Livret jeune est ouvert de 12 à 25 ans » | 12 à 25 ans | absent | Juste (stable) | À créer : `livret_jeune_age` |
| Leçon 102, écran 7 (`…json:139`) | « au plafond le plus bas et au meilleur taux » | logique | LEP 2,5 % > Livret Jeune 1,7 % | **Faux aujourd'hui** (§ 2, n° 8) | — |
| Leçon 102, écran 3, intro Val (`…json:53`) | « Celui-ci paie bien » (le Livret jeune) | — | taux minimum = Livret A | Discutable (le Livret jeune paie au minimum comme le Livret A) | — |
| Leçon 102, écran 4 | « Le LEP est aujourd'hui le livret garanti le mieux rémunéré, à {{lep_taux}} » | variable | 2,5 % | Juste. L'affirmation dépend de l'écart LEP / Livret A. | déjà en variable |
| Leçons 100, 101, 103 | 900 €, −20 %, 1 000 €, « 3 à 6 mois » | exemples | — | Pédagogique, non retenu | — |

### 3.3 Définitions du dictionnaire (203 termes, prod)

Déjà en variable : Livret A, LDDS, LEP, PEL, CEL (9 champs, migration `2026_10_17_110000` appliquée en prod). 238 champs contiennent un chiffre, presque tous des exemples ou des statistiques.

#### Faux aujourd'hui
Voir § 2 : Flat tax, Prélèvements sociaux, PEA, Plus-value, CTO, Intéressement, Loi Pinel (7 termes, 12 champs).

#### Justes aujourd'hui, en dur, avec une clé existante

| Définition | Extrait | Chiffre | Base | Clé |
|---|---|---|---|---|
| « Assurance-vie » (def + full ; seeder :481-484) | « après 8 ans (abattement de 4 600€/an sur les gains) » | 8 ans ; 4 600 € | 8 ans ; 4 600 € / 9 200 € | `assurance_vie_duree_abattement` ; `assurance_vie_abattement` (liste : réécrire « {{assurance_vie_abattement}} selon que tu es seul ou en couple », ou créer `assurance_vie_abattement_seul` / `_couple`) |
| « Abattement fiscal » (def + full ; :499-502) | « abattement de 4 600€/an après 8 ans » | 4 600 € ; 8 ans | idem | idem |
| « PEA » (def) | « Après 5 ans … Plafonné à 150 000€ » | 5 ans ; 150 000 € | 5 ans ; 150 000 € | `pea_duree_exoneration`, `pea_plafond` |
| « PEL » (def) | « bloqué 4 ans minimum » | 4 ans | 4 ans | `pel_duree_minimale` |
| « PEE » (def ; :1033) | « Bloqué 5 ans » | 5 ans | 5 ans | `pee_duree_blocage` |
| « Tranche marginale » (def ; :1051) | « Tranches actuelles : 0%, 11%, 30%, 41%, 45% » | barème | identique | `{{ir_bareme_taux}}` (s'affiche exactement « 0 % / 11 % / 30 % / 41 % / 45 % ») |
| « Découvert autorisé » (def ; :657) | « Taux d'intérêt souvent élevé (15-20%/an) » | 15-20 % | usure découvert 19,05 % | Mentionner le plafond `{{decouvert_taux_usure}}` |
| « Taux d'usure » (full ; :681) | « Si le taux d'usure … est de 4.5% » | 4,5 % (hypothèse) | 5,29 % | `{{credit_taux_usure}}` |
| « Gestion passive » (full ; :827) | « performance historique de ~8%/an » | 8 % | `etf_world_rendement_moyen` 8 %/an | Optionnel |
| « Quotient familial » (def ; :1057) | « 1 part par adulte, 0.5 par enfant » | règle | — | Inexact dès le 3e enfant (1 part), et le plafonnement n'est pas cité : `{{ir_quotient_familial_plafond}}` |

#### Justes aujourd'hui (ou à vérifier), en dur, clé à créer

| Définition | Extrait | Chiffre | État | Clé à créer |
|---|---|---|---|---|
| « IFI » (def ; :505) | « patrimoines immobiliers nets supérieurs à 1.3 million d'euros » | 1 300 000 € | Juste, à vérifier après la LF 2026 | `ifi_seuil` |
| « IS » (def + full ; :1141) | « Taux normal … 25% … Taux réduit de 15% sur les premiers 42 500€ » | 25 % ; 15 % ; 42 500 € | Juste, à vérifier après la LF 2026 | `is_taux_normal`, `is_taux_reduit`, `is_taux_reduit_plafond` |
| « TVA » (def ; :1147) | « 20%. Taux réduits : 10%, 5.5%, 2.1% » | 20/10/5,5/2,1 % | Juste | `tva_taux` (liste) |
| « Prélèvement automatique » (full ; :669) | « frais d'incident (généralement 20€) » | 20 € | Juste : plafond légal des frais de rejet de prélèvement (montant du prélèvement, dans la limite de 20 €) | `frais_rejet_prelevement_plafond` |
| « Plus-value immobilière » (def + full ; :1105) | « Exonération totale après 22 ans (impôt) ou 30 ans (prélèvements sociaux) » ; « ~36% » | 22/30 ans ; ~36 % (19 + 17,2) | Juste, à vérifier pour le taux de PS sur les plus-values immobilières | `plus_value_immo_taux_ir`, `plus_value_immo_durees_exoneration` |
| « Moins-value » (full ; :217) | « déduire … pendant 10 ans » | 10 ans | Juste | `moins_values_report_duree` (optionnel) |
| « Participation » (def ; :1045) | « entreprises >50 salariés » | 50 | Juste | `participation_seuil_salaries` (optionnel) |
| « Crédit revolving » (def + full ; :967) | « Taux … très élevé (15-20%/an) » ; « 18%/an » | 15-20 % | Plage plausible, non rattachée à un taux légal | `credit_conso_taux_usure` (valeurs Banque de France, par tranche de montant) |
| « Frais de notaire » (def + full ; :543) | « 7-8% … dans l'ancien et 2-3% dans le neuf » | ordre de grandeur | Plausible (droits de mutation relevés en 2025) | Optionnel : `frais_notaire_ancien_taux` |
| « Retraite par répartition » (full ; :625) | « environ 28% de ton salaire brut » | ~28 % | Approximation | Non |

Statistiques présentées comme actuelles, sans clé, à actualiser : « Dette publique » (« ~110% du PIB, soit ~3 100 milliards€ », plus élevé aujourd'hui, à vérifier), « PIB » (« environ 2 800 milliards€ »). Les autres termes (Bitcoin 2024, BCE 2022-2023, LVMH 2023…) sont datés ou des exemples : non retenus.

### 3.4 Articles publiés (38 sur 281, selon le scope `Article::published()` : `is_published` + statut `approved`/`published` + `published_at`)

Faux aujourd'hui : voir § 2 (n° 8, 18, 27, 40, 41, 42, 47).

Justes aujourd'hui, en dur, evergreen :

| Article (n°, slug) | Extraits | Chiffres | Clés |
|---|---|---|---|
| 22 `pea-quel-type-choisir-selon-ta-situation-en-2026` | « taxée à 31,4 % (le PFU en vigueur depuis janvier 2026) » ; « passent de 17,2 % à 18,6 % » ; « 225 000 € (cumulé) » ; « PEA Jeune plafonné à 20 000 € » ; « 18-25 ans » ; « 5 ans » ; « l'assurance-vie … 17,2 % » | 31,4 ; 18,6 ; 17,2 (AV) ; 150 000 ; 225 000 ; 20 000 ; 5 ans | `flat_tax_taux`, `prelevements_sociaux_capital`, `prelevements_sociaux_reduits`, `pea_plafond`, `pea_pme_plafond`, `pea_jeune_plafond`, `pea_duree_exoneration` |
| 38 `pea-l-enveloppe-fiscale-qui-te-fait-economiser-des-milliers-d-euros-en-bourse` | « 12,8 % d'impôt en moins » ; « 18,6 % » ; « 31,4 % (12,8 % d'IR + 18,6 % de PS) » ; « économiser 6 400 € » ; « 150 000 € » ; « 20 000 € » | idem + 12,8 % | idem + `pfu_ir_taux` (à créer) |
| 39 `etf-pour-debutants-comment-investir-dans-1-500-entreprises-avec-50` | « taxées qu'à 18,6 % au lieu de 31,4 % » ; « plafond de 150 000 € » | 18,6 ; 31,4 ; 150 000 | `prelevements_sociaux_capital`, `flat_tax_taux`, `pea_plafond` |
| 44 `pea-ou-assurance-vie-le-match-fiscal-qui-change-tout` | « 18,6 % » ; « 1 884 € avec la flat tax à 31,4 % » ; « l'assurance-vie … 17,2 % » ; « 4 600 € (ou 9 200 € pour un couple) » ; « 152 500 € par bénéficiaire » ; « 8 ans » | idem | + `assurance_vie_abattement`, `assurance_vie_abattement_deces`, `assurance_vie_duree_abattement` |
| 48 `etf-le-placement-que-2-6-millions-de-francais-ont-adopte-et-pourquoi-tu-devrais` | « fiscalité réduite à 18,6 % sur les gains après 5 ans » | 18,6 ; 5 ans | `prelevements_sociaux_capital` |
| 41 (parties justes) | « 31,4 % (12,8 % … + 18,6 %) » ; « 150 000 € » ; « 20 000 € » ; « frais d'ouverture … plafonnés à 10 € » | | + `pea_frais_ouverture_plafond` (à créer, à vérifier) |
| 40 (parties justes) | « plafond réduit à 20 000 € » ; « 150 000 € » | | `pea_jeune_plafond`, `pea_plafond` |
| 47 (parties justes) | « LEP 2,5 % » ; « plafond (10 000 €) » ; « 23 028 € pour une personne seule » ; « SMIC à 1 443 € net » | | `lep_taux`, `lep_plafond`, `lep_rfr_plafond_1part`, `smic_net_mensuel` (à créer, à vérifier) ; « bonification … de 70 € à 160 € » de la prime d'activité : à vérifier, pas de clé |
| 18 (partie juste) | « seuil d'exonération de 305€ par an » | 305 € | `crypto_seuil_exoneration` (c'est un seuil de **cessions**) |
| 29 `l-or-ne-baisse-jamais-la-realite-est-plus-nuancee` | « taxe forfaitaire de 11,5 % » ; « 37,6 % … sur la plus-value » ; « abattement de 5 %/an dès la 3e année » ; « après 22 ans … exonéré » | 11,5 % ; 37,6 % ; 5 % ; 22 ans | À créer : `metaux_precieux_taxe_forfaitaire`, `metaux_precieux_pv_taux` (37,6 % à vérifier) |
| 49 `budget-etudiant-comment-ne-plus-finir-a-sec-avant-le-20` | « bourse (de 130 € à 700 € selon l'échelon) » ; « APL … de 50 à 380 € » | fourchettes | Approximations, à vérifier ; optionnel `bourse_crous_montants` |

Actualité datée, non retenue mais à signaler : n° 2 `ce-qui-change-pour-votre-portefeuille-en-avril-2026` (taux d'usure d'avril 2026 : 4 / 4,48 / 5,19 % ; aujourd'hui `credit_taux_usure` = 5,29 %). L'article dit « désormais fixé », mais il est daté par son titre. Historique ou daté, non retenu : n° 25 et 53 (Fed 2004-2006), 281 (Fed septembre 2026), 54, 55, 1, 5, 24, 28.

### 3.5 Code du site qui sert l'app (lecture seule)

| Fichier:ligne | Extrait | Chiffre | Base | État | Clé |
|---|---|---|---|---|---|
| `app/Services/Assets/LivretRates.php:24-31` | `'PEL' => 'pel_taux'` | 2 % pour tout PEL | taux fixé à l'ouverture | **Faux** pour un PEL ouvert avant 2026 (§ 2, n° 18) | — |
| `app/Http/Controllers/Api/PortfolioController.php:137,198` | taux non gardé pour un livret réglementé | — | — | Juste : source unique | — |
| `database/seeders/data/life_path_scenarios.json:886-889, 944-947, 1002-1005, 1176-1179` | Livret A à 3 % | 3 % | 1,7 % | **Faux** (§ 2, n° 17) | `livret_a_taux` (pas résolu dans les parcours) |
| `database/seeders/data/life_path_scenarios.json:955-958` | « fiscalité avantageuse (0% d'impôt après 5 ans) » | 0 % | IR 0, PS 18,6 % | Imprécis (oublie les prélèvements sociaux) | `prelevements_sociaux_capital` |
| `database/seeders/DictionaryTermSeeder.php` (44, 211-214, 475-478, 487-496, 555, 1039…) | voir § 2 | | | **Faux** et réécrit la base par `updateOrCreate` | |
| `app/Services/Ai/AiPromptBuilder.php:513` (défis), `:538, 557` (parcours), `:417` (leçons), `:640` (articles) | « Chiffres réels et actuels (taux Livret A, plafonds, etc.) » ; « Tu donnes la valeur en vigueur au présent » | — | — | **Cause racine** : aucune injection de la table, aucun `{{cle}}` | Injecter `figuresBlock()` (comme pour le chat) |
| `app/Services/Ai/AiPromptBuilder.php:365` | exemple `"correct_value":22950` | 22 950 € | 22 950 € | Juste, en dur (exemple de format repris par le modèle) | `livret_a_plafond` |
| `app/Services/Ai/AiPromptBuilder.php:383` | « Le PEA est plafonné à ___ € … après ___ ans » → « 150 000 », « 5 » | 150 000 ; 5 | idem | Juste, en dur | `pea_plafond`, `pea_duree_exoneration` |
| `app/Services/Ai/AiPromptBuilder.php:356` | `"highlight_value":"8%","highlight_label":"Rendement historique"` | 8 % | `etf_world_rendement_moyen` 8 %/an | Juste | optionnel |
| `app/Services/Ai/AiPromptBuilder.php:446, 449` | « taux moyen d'un crédit revolving … 20% » | ~20 % | pas de clé | Plausible, à rattacher à l'usure | `credit_conso_taux_usure` (à créer) |
| `app/Services/Ai/AiSystemPrompt.php:322` (chat de Val ; non appelé par l'app) | « 12,8 % + 18,6 % = 31,4 % … 12,8 % + 17,2 % = 30 % » | 12,8 ; 18,6 ; 31,4 ; 17,2 ; 30 | identiques | Juste, en double avec la table | `pfu_ir_taux`, `pfu_taux_reduit` (à créer) |
| `AiSystemPrompt.php:329, 331, 335` | « son PFU est de 30 % » (assurance-vie, décès, PEL) | 30 % | taux réduit | Juste, en dur | `pfu_taux_reduit` |
| `AiSystemPrompt.php:332` | « PER, déduction : 10 % des revenus professionnels » | 10 % | absent | Juste | `per_deduction_taux` (à créer) |
| `AiSystemPrompt.php:336` | « prélèvements sociaux de 17,2 % » (PER, déblocage pour accident de la vie) | 17,2 % | 17,2 ou 18,6 | **À vérifier** | `prelevements_sociaux_reduits` ou `_capital` |
| `AiSystemPrompt.php:346-347, 349` | « abattement forfaitaire de 10 % » ; « PEE : passé les 5 ans de blocage » | 10 % ; 5 ans | 10 % ; 5 ans | Juste, en dur | `ir_abattement_salaires_taux`, `pee_duree_blocage` |
| `app/Console/Commands/SeedDemoArticle.php:80, 106` (article de démo) | « Livret A est plafonné à 22 950 € » ; « La flat tax prélève 30 % » | 22 950 ; 30 % | 22 950 ; 31,4 % | 30 % **faux** (contenu de démo) | `livret_a_plafond`, `flat_tax_taux` |
| `resources/views/blocks/tool_calculator.blade.php:46-47, 120` (web uniquement, l'app n'affiche pas ce bloc) | « PFU 30% : 12,8% IR + 17,2% PS », `gain * 0.30` | 30 % ; 17,2 % | 31,4 % ; 18,6 % | **Faux**, mais page web gelée, hors périmètre app | — |
| `database/seeders/data/fiche_de_paie_variantes.json` (artefact de leçon, 8 variantes) | taux de cotisations (maladie 7 %, vieillesse 6,90 / 8,55 %, CSG 6,80 + 2,90 % sur 98,25 %…) | taux de cotisation 2026 | pas de clé | Cohérents à la relecture. Document daté (« Novembre 2026 »), à revoir à chaque 1er janvier. | Non (trop fin) |
| `ConseillerPhraseSeeder`, `DashboardConseillerPhraseSeeder`, `PushRulesSeeder`, `RecurringNotificationsSeeder`, `DailyQuestsSeeder`, contrôleurs API Savings / Cashflow / LifePath / DailyChallenge / WeeklyChallenge | — | — | — | Aucun chiffre réglementaire | — |
| `RegulatoryFigureSeeder.php` | `updateOrCreate` sans réécrire les valeurs | — | `etf_world_rendement_moyen`, `inflation_annuelle` absentes du seeder | Sans danger | — |

Non couvert par le relevé : les tables `life_path_scenarios` et `daily_challenges` de production, alimentées par les lots IA mensuels (`GenerateMonthlyScenarioBatch`, `GenerateMonthlyChallengeBatch`). Vu les prompts, elles contiennent très probablement aussi des taux de mémoire. Il faudrait un relevé en lecture seule.

---

## 4. Clés à créer

| Clé proposée | Libellé | Valeur actuelle | Catégorie | Utilisée par |
|---|---|---|---|---|
| `pfu_ir_taux` | Part impôt sur le revenu du PFU (flat tax) | 12,8 % | Fiscalité | Définitions Flat tax et PEA ; articles 8, 38, 40, 41 ; chat de Val |
| `pfu_taux_reduit` | PFU global au taux réduit (assurance-vie, PEL/CEL, revenus fonciers) | 30 % | Fiscalité | Chat de Val (l. 322, 329, 331, 335) ; définitions assurance-vie |
| `csg_capital_taux` | CSG sur les revenus du capital, cas général | 10,6 % (à vérifier) | Fiscalité | Définition Prélèvements sociaux |
| `crds_taux` | CRDS sur les revenus du capital | 0,5 % | Fiscalité | Définition Prélèvements sociaux |
| `smic_net_mensuel` | SMIC net mensuel, temps plein | 1 443 € (au 1/1/2026, à vérifier) | Salaire et travail | Article 47 |
| `smic_brut_mensuel` | SMIC brut mensuel, temps plein | 1 823,03 € (à vérifier) | Salaire et travail | Fiche de paie, leçons à venir |
| `livret_jeune_age` | Âges d'ouverture du Livret Jeune | 12 à 25 ans | Livrets réglementés | Leçon 102, écran 6 |
| `per_deduction_taux` | Plafond de déduction PER en % des revenus professionnels | 10 % | Épargne long terme | Chat de Val (l. 332) |
| `ifi_seuil` | Seuil de patrimoine immobilier net taxable à l'IFI | 1 300 000 € (à vérifier) | Fiscalité | Définition IFI |
| `is_taux_normal` | Taux normal de l'impôt sur les sociétés | 25 % | Entreprise | Définition IS |
| `is_taux_reduit` | Taux réduit de l'IS (PME) | 15 % | Entreprise | Définition IS |
| `is_taux_reduit_plafond` | Bénéfice imposé au taux réduit de l'IS | 42 500 € (à vérifier) | Entreprise | Définition IS |
| `tva_taux` | Taux de TVA (normal / intermédiaire / réduit / particulier) | 20 % / 10 % / 5,5 % / 2,1 % | Fiscalité | Définition TVA |
| `frais_rejet_prelevement_plafond` | Plafond des frais de rejet d'un prélèvement | 20 € | Banque au quotidien | Définition Prélèvement automatique |
| `credit_conso_taux_usure` | Taux d'usure des crédits à la consommation (par tranche de montant) | à relever (Banque de France, trimestriel) | Crédit | Définition Crédit revolving ; `AiPromptBuilder:446-449` |
| `plus_value_immo_taux_ir` | Taux d'IR sur les plus-values immobilières | 19 % | Immobilier | Définition Plus-value immobilière |
| `plus_value_immo_durees_exoneration` | Durées d'exonération des plus-values immobilières (IR / PS) | 22 ans / 30 ans | Immobilier | idem |
| `metaux_precieux_taxe_forfaitaire` | Taxe forfaitaire sur la vente de métaux précieux | 11,5 % | Fiscalité | Article 29 |
| `metaux_precieux_pv_taux` | Taux global sur la plus-value de métaux précieux (régime réel) | 37,6 % (à vérifier) | Fiscalité | Article 29 |
| `pea_frais_ouverture_plafond` | Plafond des frais d'ouverture d'un PEA | 10 € (à vérifier) | PEA | Article 41 |
| `moins_values_report_duree` (optionnel) | Durée de report des moins-values mobilières | 10 ans | Fiscalité | Définition Moins-value |
| `participation_seuil_salaries` (optionnel) | Effectif à partir duquel la participation est obligatoire | 50 salariés | Épargne salariale | Définition Participation |
| `assurance_vie_abattement_seul` / `assurance_vie_abattement_couple` (optionnel) | Les deux valeurs de la liste actuelle | 4 600 € / 9 200 € | Épargne long terme | Définitions Assurance-vie et Abattement fiscal, si l'on veut une seule valeur |

---

## 5. Décomptes

| Source | Volume | Chiffres réglementaires en dur | Dont faux aujourd'hui |
|---|---|---|---|
| App, leçons découvertes | 6 leçons | 2 leçons (impôts : barème simplifié ; vrai salaire : cotisations), plus 2 hypothèses cohérentes (inflation 2 %, durée 25 ans) | 1 (vrai salaire, incohérent avec la fiche source) |
| App, autres textes `src/` et `app/` | — | 0 | 0 |
| Leçons de production | 4 leçons | 1 chiffre (Livret Jeune 12-25 ans) + 20 repères déjà en variable (leçon 102) | 1 logique (leçon 102, écran 7) |
| Dictionnaire | 203 termes (9 champs déjà en variable) | 27 termes : 7 faux, 10 avec clé existante, 10 avec clé à créer | 7 termes / 12 champs |
| Articles publiés | 38 | 13 evergreen avec chiffres réglementaires (+1 actualité datée, +1 aides approximatives) | 7 articles (8, 18, 27, 40, 41, 42, 47) |
| Articles non publiés | 243 (226 brouillons marqués `is_published=1`, 17 brouillons) | ≈ 98 articles (détection automatique, non relue) | ≈ 84 articles contiennent au moins une valeur différente de la base : Livret A à 3 % (98 occurrences), à 2,4 % (38), PEL 2,25 % (16), flat tax 30 % (21), PS 17,2 % hors assurance-vie (21), LEP 3,5 % ou 5 % (7) |
| Code du site servant l'app | — | ~15 emplacements | 4 (parcours de vie Livret A ×4, seeder du dictionnaire, PEL dans LivretRates, article de démo) + 1 web gelé (calculateur) + 1 à vérifier (PER 17,2 %) |
| Clés à créer | — | 18 utiles + 5 optionnelles | — |

### Vérification de la détection précédente (`badd153f…/scripts`)

- `detect.py` et `patterns.py` comptent comme publiés les articles `is_published=1` **ou** `status=published`. Cela inclut les 226 brouillons marqués `is_published=1`, ce qui explique que `det_pub.json` liste 134 articles. Le scope réel de l'API (`Article::published()`) n'en sert que 38. `det_pub.json` mélange donc publiés et brouillons.
- Sur les 38 vrais publiés, la détection précédente avait bien trouvé les n° 8, 18, 27, 40, 41, 47. Elle classait le n° 42 en `ldds_taux 1,6` (juste). Elle ne relevait pas le PEL des livrets du patrimoine, les parcours de vie ni les définitions.
- Faux positifs écartés à la relecture : n° 44 (17,2 % s'y rapporte bien à l'assurance-vie, juste), n° 22 (17,2 % et 30 % y sont des comparaisons « avant 2026 », justes), n° 47 (10 000 € = plafond du LEP, pas du Livret A).
