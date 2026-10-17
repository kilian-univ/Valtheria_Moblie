# Audit complet de l'app Valtheria

17 octobre 2026 · branche `design/ui`, commit `e6c8860` · lecture seule : aucune correction n'a été faite dans le cadre de l'audit.

Cet audit reprend celui commencé le matin même et interrompu. Les constats du matin ont été revérifiés un par un dans le code actuel (numéros de ligne mis à jour). Les captures ont été refaites, et les parties manquantes ont été ajoutées :
- iPhone SE ;
- réduction des animations ;
- parcours complets des leçons ;
- états hors ligne et en erreur ;
- chiffres écrits en dur ;
- relevé complet du contenu.

Les problèmes trouvés pendant cette reprise commencent par **Nouveau.**

Annexes :
- [chiffres écrits en dur](audit-annexe-chiffres.md) ;
- [espaces insécables, liste exhaustive](audit-annexe-espaces.md) ;
- [contenu et textes, phrases de remplacement](audit-annexe-contenu.md) ;
- [iPhone, Hermes et code](audit-annexe-iphone-code.md).

## Résumé

Ce qui a été refait tient ses maquettes : première ouverture, Apprendre, lecteur de leçon, Dictionnaire, Profil, Réglages et patrimoine. Ces écrans sont pour l'essentiel accessibles (libellés, rôles, réduction des animations respectée) et bien testés : 372 tests sur 372 réussis, `tsc` sans erreur. L'analyse du code n'a trouvé aucune cause certaine de plantage propre à l'iPhone : les 79 styles animés et les 21 rappels de gestes n'appellent que des worklets, et aucun texte n'est hors d'un composant `Text`.

Cinq familles de problèmes empêchent pourtant une sortie en l'état :

1. **App Store** :
   - pages légales inaccessibles (elles redirigent vers la page d'accès du site) ;
   - un seul module publié pour 15 univers annoncés ;
   - identifiant de l'app provisoire ;
   - iPad déclaré compatible (avec un passage en paysage forcé) ;
   - icône iOS qui sera posée sur un fond blanc.
2. **Fiabilité** :
   - aucune erreur d'affichage n'est rattrapée, et une erreur du patrimoine ramène l'ancien écran Portefeuille, qui peut fermer l'app ;
   - aucune requête n'a de délai maximal ;
   - une erreur 500 déconnecte l'utilisateur (vérifié en vrai lancement) ;
   - hors ligne, le Profil et le Patrimoine restent en chargement sans fin, et trois écrans affichent une information fausse (« Cet actif n'est plus dans ton patrimoine », « Ajoute un premier actif », « Ta première révision arrive après ta première leçon »).
3. **Contenu juste** :
   - 19 chiffres réglementaires faux sont servis aujourd'hui : flat tax à 30 % et prélèvements sociaux à 17,2 % dans 7 définitions et 7 articles, Livret A à 3 % ou 1,5 %, loi Pinel présentée comme ouverte ;
   - une bonne réponse de la leçon n° 102 est fausse avec les taux actuels ;
   - la leçon découverte Crypto valorise l'achat d'une crypto inconnue vantée par un ami ;
   - la leçon découverte Salaire se contredit.
4. **Espaces insécables** : le formateur du patrimoine utilise des espaces ordinaires, et ni les 377 textes de l'app concernés ni le contenu du site ne sont protégés. Les montants se coupent (« 900 / €. », « 20 / % », « montant / ; placés »).
5. **Ancien design** : six écrans encore actifs (Outils, Cash-flow, Épargne, Articles, Article, Portefeuille de repli) concentrent les plantages possibles, les erreurs brutes en anglais et les défauts d'accessibilité. Les Articles n'affichent par ailleurs que 12 des 38 articles publiés.

Décompte de l'audit : **6 bloquants, 39 importants, 51 gênants, 27 cosmétiques**, soit 123 problèmes. Après le chantier 1 (fiabilité), les décisions du 17 octobre et le chantier 2 (contenu faux), il en reste **3 bloquants, 11 importants (dont 2 corrigés en partie), 35 gênants (dont 4 corrigés en partie) et 24 cosmétiques**. Les lignes corrigées commencent par **Corrigé**.

## Chantier 1 : la fiabilité (17 octobre 2026)

Quatre lots, chacun vérifié (tsc, ESLint sans aucun problème, tests, captures en vrai lancement sur iPhone SE avec le serveur web relancé) et sauvegardé sur `design/ui` puis `main` :

| Lot | Commit | Contenu |
|---|---|---|
| 1 | `226733d` | Filets d'erreur (global et par écran) ; profil repris quand il manque ; états hors ligne et en erreur de Mon patrimoine, Un actif, Analyse, Profil, Révision, Articles, Article, Cash-flow, Épargne ; ancien Portefeuille supprimé ; articles paginés ; iPad retiré ; ESLint propre |
| 2 | `55f5c1c` | Espaces insécables : source unique, `frenchSpaces()` à l'affichage pour les 377 textes de l'app et le contenu du site, garde-fou de test |
| 3 | `ed3afe1` | Contrôle des worklets par l'arbre syntaxique, cas d'essai T1 à T9, zéro faux signalement |
| 4 | `8ac535f` | Déconnexion hors ligne, purge à la suppression du compte, mémoire sans compte vidée après reprise, écritures en file, connexion en une requête, journaux, liens directs, écrans figés, capteur, rappels, clavier numérique, icône iOS, favicon |

Vérifié en vrai lancement : les 20 écrans relevés hors ligne et en erreur 500 affichent une erreur claire avec « Réessayer », sans chargement sans fin ni message faux. Cash-flow, qui plantait, affiche l'écran de secours de Val. Les coupures « 900 / € » et « montant / ; » ont disparu. Les 38 articles d'un jeu d'essai se chargent en 4 pages.

**ApiContext (autorisation exceptionnelle, commit `c79f697`)** : seule une réponse 401 déconnecte (I2), délai de 15 s (I1), succès non JSON traité comme une erreur (I8), lecture du jeton protégée (G48), jeton dans le trousseau avec reprise de l'ancien (I7). Vérifié en vrai lancement : une 500 sur `/user` garde la session, un portail Wi-Fi affiche « le serveur ne répond pas », un serveur muet donne l'erreur au bout de 16 s.

### Décisions du 17 octobre et leur application

| Décision | Application |
|---|---|
| (2) Garder entre deux lancements le contenu d'apprentissage, jamais les montants | Modules, univers, série, XP et Vals (liés au compte, 30 jours au plus) et mots du Dictionnaire relus au lancement ; aucun montant du patrimoine ; effacés par la purge |
| (3) Purger le téléphone à la déconnexion | Même purge qu'à la suppression du compte (données, prénom, rappels) |
| (4) Mot de passe oublié après un vrai essai | Route en production, demande envoyée au compte de test (200) ; activé dans la connexion et les Réglages ; réception du courriel à confirmer |
| (5) Retirer le thème clair | Thème sombre seul, ligne « Thème » retirée, barre d'état claire |
| (6) Adresse du staging | `https://staging.valtheria.fr` (configuration du site) ; `eas.json` : staging pour development, preview et simulator |
| (7) Synchroniser la progression | Ajoutée au lot serveur, section 10 (`docs/lot-serveur.md`) |
| (8) Toucher une notification | Ouvre l'accueil d'Apprendre, app ouverte ou fermée |
| (9) Export | Fichier `valtheria-mes-donnees-AAAA-MM-JJ.json` par la feuille de partage, copie temporaire effacée ; téléchargé sur le web |
| (10) Outils à l'ancien design | Épargne retirée, ses objectifs repris dans ceux du patrimoine (détail ci-dessous) ; Cash-flow gardé tel quel, à refaire dans un prochain chantier |
| (11) Articles supprimés | Laissés tels quels |

**Outils encore à l'ancien design (décision 10)**

| Outil | Ce qu'il fait aujourd'hui dans l'app | Ce que le site sait faire en plus |
|---|---|---|
| **Cash-flow** (`/outils/cashflow`) | Budget du mois : entrées de revenus, de dépenses (par catégorie) et d'épargne, récurrentes ou ponctuelles ; « Reste à vivre » ; répartition des dépenses par catégorie ; ajout et suppression d'une entrée | Catégories personnalisées, modification d'une entrée, guide de première prise en main et sa récompense (routes présentes dans l'API, non utilisées par l'app) |
| **Épargne** (`/outils/epargne`) | **Retiré (décision 10).** Objectifs d'épargne du site : progression vers le montant visé, rapprochement avec l'épargne du cash-flow (dépassement ou surplus), nombre de rappels ; **ni création d'objectif ni versement** depuis l'app, seulement la suppression | Création et modification d'un objectif, versements, rappels de versement (confirmer, passer, ajuster) ; double emploi avec les objectifs du patrimoine |
| Onglet **Outils** lui-même | Liste des deux outils (Portefeuille, Cash-flow), en ancien design ; Épargne retirée | — |

**Épargne retirée (décision 10)** : l'écran (`EpargneScreen`), sa route (`/outils/epargne`, qui mène désormais à « Cette page n’existe pas »), sa place dans l'onglet Outils, son squelette de chargement, ses styles (`getEpargneStyles`) et sa lecture de réponse (`utils/savings.ts`) sont supprimés. Il n'y a plus qu'un seul système d'objectifs : ceux du patrimoine.

Les objectifs d'épargne du site sont repris dans les objectifs du patrimoine, une seule fois par compte (`utils/patrimoine/savingsImport.ts`, `hooks/useSavingsImport.ts`) :
- à l'ouverture de Mon patrimoine, l'app lit `GET /savings` et ajoute chaque objectif avec le même nom, le même montant (`target_amount`) et la même échéance (`target_date`, ou aucune) ;
- un repère `savingsImported` est alors noté dans les préférences du patrimoine : les ouvertures suivantes ne rappellent plus `/savings`, et un objectif repris puis supprimé ne revient pas ;
- pas de doublon (même nom, montant et échéance qu'un objectif existant), dans la limite de 20 objectifs ;
- en cas d'échec (réseau, erreur 500, réponse sans liste), rien n'est noté : nouvel essai à la prochaine ouverture, sans rien afficher ;
- rien n'est écrit sur le site : les objectifs restent dans son outil Épargne, et `ApiContext` n'a pas été modifié.

Vérifié en vrai lancement (web, iPhone SE, compte simulé avec deux objectifs sur le site) : l'onglet Outils ne montre plus que Portefeuille et Cash-flow ; « Voyage au Japon » (12 000 €, 30 juin 2027) et « Vélo » (800 €, sans échéance) apparaissent dans « Tes objectifs » ; un seul appel à `/savings`, aucun après relance de la page ; après une erreur 500, la reprise se fait à l'ouverture suivante ; aucune erreur JavaScript. Capture : [objectifs-epargne-repris](audit-captures/objectifs-epargne-repris.jpg).

**Objectifs reliés aux placements (17 octobre, suite)** : un objectif du patrimoine ne se mesure plus sur la valeur totale du patrimoine, mais sur les placements qui lui sont reliés (un ou plusieurs, choisis avec leurs icônes à la création et à la modification). Par défaut, un nouvel objectif est relié aux placements sans risque ; les objectifs créés avant ce changement suivent automatiquement les placements sans risque jusqu'à leur prochaine modification. La jauge indique sur quoi l'objectif est mesuré (« Mesuré sur ton Livret A et ton LDDS ») ; sans placement relié, la carte affiche « Relie un placement pour suivre cet objectif ». La reprise attend désormais le chargement du portefeuille : les objectifs repris sont reliés aux placements sans risque, et ceux déjà dépassés arrivent notés atteints, sans célébration (l'étape « Premier objectif atteint » est gagnée sans être fêtée). Vérifié en vrai lancement : 17 contrôles sur 17.

Hors de l'app, le site a aussi un défi quotidien, un défi de la semaine et des parcours de vie. Des routes existent dans ApiContext, mais aucun écran ne les affiche.


## Chantier 2 : le contenu faux (17 octobre 2026)

**État** : app corrigée et sauvegardée. Site : [PR n° 9](https://github.com/Valtheraa/Valtheria/pull/9) fusionnée (commit `3dec948`), vérifiée sur staging, puis **déployée en production le 17 octobre** avec l'accord explicite de l'utilisateur. Les trois migrations sont passées. La sauvegarde prise juste avant est `/var/backups/valtheria/pre-deploy/db-20261017-183838.sql.gz` ; l'archive est lisible et les données y sont.

**Vérifié en production, sur la base** :
- les 20 chiffres sont créés, avec leur source et leurs dates ;
- l'usure immobilière vaut 5,40 % ;
- les définitions sont résolues (flat tax à 31,4 % = 12,8 % + 18,6 % ; loi Pinel fermée) ;
- l'écran 7 de la leçon n° 102 est servi avec « Tout sur le LEP » (2,5 % contre 1,7 %), et la leçon est valide au contrôle de format ;
- les 2 seuls articles servis ne contiennent aucun chiffre en dur.

**Relevé `content:hardcoded-figures` en production** :
- examinés : 4 leçons, 203 définitions, 3 articles non supprimés, 31 parcours de vie ;
- 0 chiffre en dur dans les leçons et les définitions ;
- 1 article en brouillon, n° 282 « livrets-en-2026-seul-le-lep-suit-encore-l-inflation-de-justesse », jamais publié : Livret A et LDDS à 1,7 %, LEP à 2,5 %, flat tax à 31,4 %, Livret jeune à 1 600 € ;
- 1 parcours de vie, n° 20 : Livret A à 3 %.

La commande sort en échec (code 1) à cause du brouillon n° 282. Deux de ses signalements visent la mauvaise clé : l'inflation à 2,4 % est prise pour le taux du Livret A, et le plafond du Livret jeune (1 600 €) pour celui du Livret A.

### Chiffres réglementaires créés

Vingt clés (l'annexe en annonçait « 18 utiles », mais sa propre liste en compte 20). Chacune a été lue le 17/10/2026 sur la page officielle citée, qui devient sa `source`. La date de vérification est donc réelle. Une date d'effet n'est posée que si elle a été lue dans le texte. Migration `2026_10_17_200000`, seeder du catalogue aligné.

| Clé | Valeur | Date d'effet | Source |
|---|---|---|---|
| `pfu_ir_taux` | 12,8 % | 01/01/2018 | Légifrance, CGI art. 200 A |
| `pfu_taux_reduit` | 30 % | 01/01/2026 | LFSS 2026 art. 12 (CSS L136-8 IV) ; service-public F2329 |
| `csg_capital_taux` | 10,6 % | 01/01/2026 | Légifrance, CSS L136-8 I 2° |
| `crds_taux` | 0,5 % | — | service-public F2329 |
| `ifi_seuil` | 1 300 000 € | 01/01/2018 | Légifrance, CGI art. 964 ; service-public F563 |
| `tva_taux` | 20 % / 10 % / 5,5 % / 2,1 % | 01/01/2014 | Légifrance, CGI art. 278 à 281 octies |
| `metaux_precieux_taxe_forfaitaire` | 11,5 % | 01/01/2018 | Légifrance, CGI art. 150 VK ; douane.gouv.fr |
| `metaux_precieux_pv_taux` | 36,2 % (et non 37,6 % : les métaux précieux restent à 17,2 % de prélèvements sociaux) | — | LFSS 2026 art. 12 ; CGI art. 150 VL, 150 UA, 200 B |
| `smic_brut_mensuel` | 1 867,02 € | 01/06/2026 (revalorisation automatique) | Légifrance, arrêté du 22/05/2026 ; service-public F2300 |
| `smic_net_mensuel` | 1 477,93 € (indicatif) | 01/06/2026 | service-public F2300 |
| `livret_jeune_age` | 12 à 25 ans | — | service-public F2904 |
| `pea_frais_ouverture_plafond` | 10 € | — | Légifrance, CMF art. D221-111-1 |
| `per_deduction_taux` | 10 % (avec plancher et plafond) | — | BOFiP BOI-IR-BASE-20-50-20 ; service-public F36526 |
| `is_taux_normal` | 25 % | 01/01/2022 | Légifrance, CGI art. 219 I |
| `is_taux_reduit` | 15 % | — | Légifrance, CGI art. 219 I-b |
| `is_taux_reduit_plafond` | 42 500 € | — | Légifrance, CGI art. 219 I-b |
| `frais_rejet_prelevement_plafond` | 20 € (sans dépasser le montant rejeté) | 01/11/2009 | Légifrance, CMF art. D133-5 et D133-6 |
| `credit_conso_taux_usure` | 23,60 % / 15,76 % / 8,56 % | 01/10/2026 | Légifrance, avis du 25/09/2026 ; Banque de France, usure T4 2026 |
| `plus_value_immo_taux_ir` | 19 % | — | service-public F10864 |
| `plus_value_immo_durees_exoneration` | 22 ans pour l'impôt, 30 ans pour les prélèvements sociaux | 01/09/2013 | service-public F10864 ; CGI art. 150 VC |

Aussi :
- `credit_taux_usure` passe à 5,40 % : c'est le seuil du 4e trimestre pour les prêts immobiliers à taux fixe de 20 ans et plus. La table gardait le seuil du 3e trimestre, 5,29 %.
- Le libellé de `prelevements_sociaux_reduits` est corrigé. Depuis la LFSS 2026, seuls restent à 17,2 % l'assurance-vie, les revenus fonciers, les plus-values immobilières et les PEL et CEL ouverts **avant 2018**. Les PEL et CEL plus récents sont à 18,6 %.

### Contenus corrigés

- **Dictionnaire** (migration `2026_10_17_210000`, seeder aligné) : 35 définitions, 50 champs.
  - Chiffres en repères : Flat tax, Prélèvements sociaux, PEA, Plus-value, CTO, Assurance-vie, Abattement fiscal, PEL, PER, Plus-value immobilière, Crédit revolving, Taux d'usure, Prélèvement automatique, PEE, Tranche marginale, Quotient familial, IFI, IS, TVA.
  - Erreurs de fond corrigées :
    - loi Pinel, présentée comme ouverte ;
    - intéressement, présenté comme soumis à la flat tax ;
    - prélèvements sociaux oubliés : assurance-vie, abattement ;
    - calculs faux : PEA, revolving, prélèvement à la source, salaire net imposable, plus-value immobilière ;
    - LMNP, stop-loss, stablecoin, notation, action de préférence, réplication synthétique, dette publique, découvert, participation, virement SEPA, taux de remplacement, déclaration fiscale.
  - Un exemple ne donne plus de résultat calculé à partir d'un chiffre qui change. Un champ n'est réécrit que s'il est resté identique au texte d'origine.
  - Résultat sur staging : **0 chiffre en dur dans les 203 définitions**.
- **Leçon n° 102 « Où mettre ce coussin »** (migration `2026_10_17_220000`) :
  - **Écran 7** : la bonne réponse dépend des taux (nouveau champ `selon_chiffres`). Le serveur la choisit au service, en fin de leçon et en révision : si le LEP paie plus que le Livret jeune au taux minimum, c'est « Tout sur le LEP » ; sinon, le Livret jeune jusqu'à son plafond, puis le LEP. Sur staging : « Tout sur le LEP » (2,5 % contre 1,70 %).
  - **Écran 2** : un livret bancaire est lui aussi disponible et garanti. Son option est remplacée par « Compte courant ».
  - **Écrans 3 et 6** : âges du Livret jeune en repère `{{livret_jeune_age}}` ; le Livret jeune « qui paie bien » et le LEP « ouvert par la non-imposition » sont corrigés.
- **Leçon n° 101, écran 6** : « tu peux investir » dès un mois couvert contredisait l'écran 4 (trois à six mois).
- **Leçon n° 100, écran 6** : il reste 200 € sur le livret, plus 80 € sur le compte, et non 200 € en tout.
- **Brouillons** : la commande `content:hardcoded-figures` relève tout le contenu, brouillons compris. Sur staging : 0 dans les 4 leçons et les 203 définitions ; 85 dans 214 articles (80 dans des brouillons, 5 dans 4 articles publiés sur staging, n° 39, 41, 44 et 47). Les articles supprimés restent supprimés : ils ne sont ni relus ni modifiés.
- **App, leçon découverte Crypto** (I32) : la bonne réponse refuse d'investir sur un simple conseil, sans comprendre ce qu'on achète, et rappelle de ne jamais y mettre plus que ce qu'on peut perdre. « Une petite somme pour voir » devient une erreur. La réplique de Léo, celles de Val et l'explication vont dans ce sens, et l'impératif « Mets-y » a disparu.
- **App, leçon découverte Salaire** (I33) : les lignes suivent la fiche de paie de référence. Les 1 660 € sont un net payé après impôt : 1 660 + 91 d'impôt = 1 751 avant impôt ; + 509 de cotisations = 2 260 brut ; + 795 = 3 055. « Personne ne te montre ce chiffre » est remplacé, puisque la fiche de paie l'affiche.

### La source du problème

- **Prompts de génération** :
  - leçons et articles : repères `{{cle}}` obligatoires, avec la liste des clés et de leurs libellés, jamais les valeurs (un prompt qui contient la forme interdite n'est pas suivi) ;
  - aucun calcul ni comparaison qui dépende d'une valeur ;
  - exemples chiffrés retirés (22 950 €, PEA à 150 000 € après 5 ans, revolving à 20 %, « actuellement de X % ») ;
  - défis du jour et parcours de vie, qui ne résolvent pas les repères : les valeurs exactes de la table, à recopier telles quelles ;
  - définitions : aucun prompt de génération n'existe.
- **Articles** : un repère `{{cle}}` est désormais résolu à la lecture, dans l'API comme sur le web, et l'éditeur garde le texte brut.
- **Contrôle automatique** (`HardcodedFigureDetector`) : un taux, plafond ou seuil de la table écrit en nombre, périmé ou exact.
  - **Refus** : `lessons:check-format`, leçon publiée, définition enregistrée, article publié ou programmé, revue approuvée.
  - **Signalement** : article du jour généré ou article programmé, laissé non publié et noté dans le journal.
  - Le filtre du chat de Val ne laisse plus passer « la flat tax est de 30 % » sous prétexte que 30 % existe ailleurs dans la table.

### Vérifications

- **Site** :
  - 518 tests (dont 19 nouveaux, chacun prouvé par mutation) et 75 tests JavaScript ;
  - contrôles Blade et z-index ; Pint propre sur les fichiers du lot ;
  - staging déployé, puis vérifié sur la base : 20 chiffres créés avec leur source, définitions résolues, écran 7 servi avec la bonne réponse, leçon valide au contrôle de format.
- **App** : tsc et 424 tests, dont 2 nouveaux sur Crypto et Salaire.

### Reste à faire

1. **Production** : fait (voir l'état ci-dessus).
2. **Articles** : en production, un seul brouillon en cause, le n° 282, à réécrire avec des repères ou à supprimer. Sur staging, 85 chiffres en dur dans des brouillons plus anciens, absents de la production. Ils sont maintenant refusés à la publication.
3. **Leçons découvertes de l'app** : elles ne peuvent pas lire les chiffres réglementaires. Seul le taux des livrets arrive avec le patrimoine, et `/api/internal/regulatory-figures` est réservé aux agents. Restent donc en dur, à revoir à chaque changement :
   - Impôts : barème simplifié 0 / 11 / 30 %, seuils de 11 000 et 30 000 € ;
   - Épargner : inflation à 2 % (hypothèse) ;
   - Logement : 25 ans à 3,5 % (hypothèse) ;
   - Investir : 5 % par an (hypothèse) ;
   - Salaire : montants de la fiche de paie, millésime 2026.

   Il faudrait un endpoint public des chiffres (lot API), ou servir ces leçons depuis le site.
4. **Parcours de vie** : Livret A à 3 % dans `life_path_scenarios.json` et un scénario en base (n° 20 en production, n° 21 sur staging). Ils ne résolvent pas les repères : correction du texte à faire.
5. **PEL** : `LivretRates` estime tout PEL au taux de l'année. Il faudrait le taux de l'année d'ouverture.
6. **`decouvert_taux_usure`** vaut 19,08 %, le seuil des professionnels. Pour un particulier, le découvert suit l'usure des crédits à la consommation de sa tranche (23,60 % jusqu'à 3 000 €). Le libellé et la valeur sont à revoir avant de citer ce chiffre.
7. **Chat de Val** : `AiSystemPrompt` garde ses chiffres en dur (12,8 %, 18,6 %, 30 %), exigés par ses tests. Le PER en cas d'accident de la vie est à 18,6 %, et non 17,2 %.
8. **Contenu de démonstration** : `SeedDemoArticle` (flat tax à 30 %) et `DemoArticlesSeeder` (Livret A à 2,4 %).
9. **CI du site** : l'étape Pint échoue sur `main` depuis la PR n° 6, à cause de deux fichiers hors de ce lot (`2026_10_17_110000_regulatory_rates_single_source.php`, `PortfolioSnapshotTest.php`). Les étapes suivantes de la CI (Prettier, Blade, z-index, harnais) ne tournent donc plus.
10. **Limites du contrôle** :
   - les durées (« après 5 ans ») ne sont pas contrôlées ;
   - un chiffre sans terme déclencheur à proximité passe ;
   - une clé voisine peut être proposée à tort (un revenu fiscal pris pour un plafond).

## Méthode

**Web, en vrai lancement** (Expo web, Chromium sans interface, écran tactile simulé, thème sombre) :
- deux tailles d'écran : grand iPhone (430 × 932) et iPhone SE (375 × 667) ;
- 62 scénarios d'écrans, chacun dans les deux tailles ;
- 10 scénarios avec réduction des animations ;
- 11 leçons parcourues écran par écran, avec des réponses automatiques : les 6 leçons découvertes, dont 2 aussi en grand iPhone ou sans animations, et les 4 leçons publiées. Le parcours de la n° 100 est complet : questions, « Une seconde chance ? », rattrapage, bilan, coffre ;
- 20 écrans ouverts hors ligne, puis avec une erreur 500 du serveur ;
- 6 échecs partiels, avec un profil chargé.

Le serveur web a été relancé avec le cache vidé (`--clear`) avant la série de captures. Le code n'a pas changé pendant l'audit (dernier commit à 3 h 39), une relance suffisait donc.

**Production, en lecture seule** :
- réponses réelles de l'API pour le compte 15 (relevés de 0 h 58 et de 10 h 58), rejouées telles quelles dans l'app web ;
- relevé de la base à 10 h 55 : 69 chiffres réglementaires, 4 leçons, 203 définitions et 281 articles.

**Code** : quatre relectures complètes :
- risques propres à l'iPhone et à Hermes, avec une analyse AST des worklets et des textes, et une compilation des expressions régulières par `hermesc` ;
- espaces insécables, au niveau des octets ;
- contenu et textes ;
- chiffres écrits en dur, avec une copie en lecture seule du site (commit `23572bb`).

S'y ajoutent `tsc`, ESLint et les tests.

**Limites** :
- le comportement natif n'a pas pu être essayé sur un iPhone : sons, vibrations, notifications réelles, VoiceOver, clavier, `Alert`. Ces points sont marqués « à vérifier sur iPhone » ;
- l'écran document de la leçon n° 101 n'a pas pu être rejoué : le site tire le relevé bancaire au moment de servir la leçon, et le relevé de la base ne le contient pas. Sur le web, il apparaît donc vide, ce qui ne dit rien de la production ;
- les parcours de vie et les défis générés en production ne sont pas dans le relevé.

## Tableau des problèmes

Les captures sont dans [docs/audit-captures/](audit-captures/). Les fichiers sont notés `src/…` pour l'app, et `site:` pour le dépôt du site (gelé : toute correction côté site passe par un lot API demandé).

### Bloquant

| # | Écran | Problème | Capture | Cause probable | Correction proposée |
|---|---|---|---|---|---|
| B1 | Réglages, inscription (liens légaux) | La politique de confidentialité et les CGU ne sont pas lisibles : `https://valtheria.fr/politique-confidentialite` et `/cgu` redirigent vers `/acces`. Apple refuse une app dont la politique de confidentialité n'est pas publique (règle 5.1.1). | — | Le site est fermé derrière sa page d'accès, pages légales comprises. | Côté site (lot API) : laisser `/cgu`, `/politique-confidentialite` et `/mentions-legales` publiques, même pendant le gel. |
| B2 | Apprendre, Tous les univers, bienvenue | Un seul module publié (« Avant d'investir », 4 leçons), alors que la bienvenue annonce « 15 univers ». Les 14 autres sont « Bientôt disponible ». Une fois les 4 leçons faites, il ne reste rien à apprendre. Risque de refus pour fonctionnalité minimale (règle 4.2). | [apprendre-un-seul-module](audit-captures/apprendre-un-seul-module.jpg) | Production du contenu en cours. | Publier plusieurs modules avant la sortie, ou n'annoncer que les univers ouverts. |
| B3 | Toute l'app | **Corrigé (chantier 1, lot 1).** Filet global et filet par écran : Val, « Quelque chose s’est mal passé », « Réessayer », « Retour à l’accueil », erreur écrite dans le journal. Réponses de Cash-flow et Épargne normalisées, rendu des articles protégé, ancien Portefeuille supprimé. Aucune erreur d'affichage n'est rattrapée au niveau des routes : en version publiée, une seule réponse mal formée ferme l'app. Constaté sur iPhone le 16 octobre (portefeuille, corrigé). Le risque reste entier sur Cash-flow (plante encore sur le web avec une réponse vide), Épargne, Article et l'ancien Portefeuille, servi en repli (voir I28). | [cashflow-plantage](audit-captures/cashflow-plantage.jpg) | Pas d'`ErrorBoundary` exporté dans `app/`. Accès non protégés : `CashflowScreen.tsx:97` et `:139`, `EpargneScreen.tsx:116`, `PortefeuilleScreen.tsx:127` et `:136`, `PositionRow.tsx:59` et `:67` (`.toFixed` sur `null`), `BlockRenderer.tsx:143`. | `ErrorBoundary` racine et par onglet (Val, puis « Réessayer »). Protéger les champs lus (`?.`, `Number(...)`). |
| B4 | Configuration (`app.json:13`, `:26`) | Identifiant `com.gala0022.Valtheraa` (avec « Valtheraa » et un préfixe personnel), définitif dès la première soumission, sur iOS comme sur Android. | — | Valeur d'origine du projet. | Choisir l'identifiant définitif (par exemple `fr.valtheria.app`) avant toute soumission. |
| B5 | Configuration (`app.json:12`) | **Corrigé (lot 1).** `supportsTablet: false`. `supportsTablet: true` : Apple exigera des captures iPad et testera l'app sur iPad. **Nouveau.** Expo ajoute alors d'office les 4 orientations sur iPad, sinon le binaire est refusé (ITMS-90474) : l'app y passera en paysage, une mise en page jamais dessinée. | — | Valeur par défaut d'Expo. | `supportsTablet: false` pour la première version, ou `requireFullScreen: true` avec une passe de design iPad. |
| B6 | Patrimoine, lecteur, leçons découvertes, toute l'app | **Corrigé (lot 2).** Source unique des espaces, `frenchSpaces()` à l’affichage (AppText et un Text commun), garde-fou de test. Les montants se coupent en fin de ligne. Le formateur du patrimoine utilise des espaces ordinaires pour tous les montants, pourcentages et quantités. Le contenu du site arrive lui aussi avec des espaces ordinaires. Constaté :<br>- leçon n° 100 en grand iPhone, « …RÉCUPÉRER 900 / €. », « 3 000 / € placés », « perdu 20 / % » ;<br>- leçon n° 100 sur SE, « il faut sortir 1 / 125 € », « en vendant 400 / € » ;<br>- bilan de la leçon découverte Investir, « …que le montant / ; placés 30 ans ». | [lecon-100-euro-seul](audit-captures/lecon-100-euro-seul-grand-iphone.jpg), [lecon-100](audit-captures/lecon-100-espaces-et-ligne-sans-valeur.jpg) | `src/utils/patrimoine/format.ts:7-8` : `NBSP` et `NNBSP` valent U+0020, et `grouped()` et `quantity()` remplacent même l'U+202F correcte d'`Intl`. Aucune normalisation des textes reçus. Le dictionnaire et le carnet détruisent en plus les insécables reçues. | Voir la section « Espaces insécables » : corriger les constantes, puis une fonction commune `frenchSpaces()` appliquée à l'affichage. |

### Important

| # | Écran | Problème | Capture | Cause probable | Correction proposée |
|---|---|---|---|---|---|
| I1 | Toute l'app | **Corrigé (commit c79f697).** Délai de 15 s sur toutes les requêtes d'ApiContext, traité comme une coupure du réseau (vérifié : erreur affichée au bout de 16 s). Aucune requête n'a de délai maximal. Un serveur qui ne répond plus laisse l'accueil, le profil, le patrimoine ou la révision en chargement : environ 60 s sur iOS, sans limite sur Android. | — | `fetch` sans `AbortController` (`ApiContext.tsx:160`, `:187`, `:212`, `:238`, `:318`, `:328`, `:338`, `authProbe.ts:11`). | Un `fetchWithTimeout` unique (15 s), reconnu comme erreur réseau. |
| I2 | Démarrage | **Corrigé (commit c79f697).** Seul un 401 déconnecte (vérifié : une 500 garde la session). Une erreur 500 en JSON sur `/user` (maintenance, surcharge) efface le jeton : l'utilisateur est déconnecté. **Vérifié en vrai lancement** : on retombe sur l'accueil sans compte, « Bonjour, Camille ». | — | `ApiContext.tsx:168-174` efface le jeton sur toute réponse non 2xx. | N'effacer le jeton que sur un 401. |
| I3 | Démarrage hors ligne | **Corrigé (lot 1).** Profil relu au lancement, au retour au premier plan et toutes les 30 s ; Profil et Patrimoine affichent l’erreur avec « Réessayer », les réglages restent ouverts. Avec un jeton mais sans réseau, le profil n'est jamais rechargé. **Vérifié** : le Profil **et le Patrimoine** restent en squelette sans fin. Les Réglages, et donc la déconnexion, sont inaccessibles, et les données sont écrites sous « invité ». | [etats-hors-ligne](audit-captures/etats-hors-ligne.jpg) | `refreshUser` n'est appelé nulle part. `PatrimoineGate` attend un `user` qui n'arrive jamais (`usePatrimoine(null)`). | Recharger `/user` au retour du réseau et au premier plan. Afficher un `PageState` hors ligne au lieu du squelette. |
| I4 | Réglages | **Corrigé (lot 4).** Se déconnecter hors ligne, ou avec un jeton expiré, lève une erreur : on reste sur des Réglages vides. | — | `logout` en `try/finally` sans `catch` (`ApiContext.tsx:275-281`), et `handleLogout` sans `try`. | Ajouter un `catch` dans `logout`, puis toujours revenir à l'accueil. |
| I5 | Changement de compte | **Corrigé (lot 4).** La mémoire sans compte est vidée après sa reprise par le premier compte. La mémoire « sans compte » (déclics, journal, précision, mots vus) est versée dans tout nouveau compte du téléphone : un deuxième utilisateur reçoit les données du premier. | — | Copie de la clé `invite`, jamais vidée (`userMemory.ts:67-69`, `wordStates.ts:47`, `accuracy.ts:49-50`). | Ne reprendre la mémoire invitée qu'à l'inscription, puis la vider. |
| I6 | Suppression de compte, déconnexion | **Corrigé (lot 4 et décisions)** : données et rappels effacés à la suppression du compte et à la déconnexion. Les données financières et personnelles restent sur le téléphone : versements, objectifs, carnet, prénom. Les rappels continuent jusqu'à 14 jours après la suppression. | — | Aucune purge des 25 clés `valtheria:*`, et pas de `resetReminder` à la suppression. | Une fonction `purgeUserData` appelée à la suppression (et, au choix, à la déconnexion), plus l'annulation des rappels. |
| I7 | Session | **Corrigé (commit c79f697).** Jeton dans le trousseau (expo-secure-store, `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), ancien jeton repris puis effacé ; AsyncStorage sur le web. Le jeton de connexion est stocké en clair (AsyncStorage) et part dans les sauvegardes iCloud et Finder, comme les objectifs financiers et le prénom. | — | `expo-secure-store` n'est pas installé. | Jeton dans le trousseau (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`) ; `allowBackup: false` sur Android. |
| I8 | Toute l'app | **Corrigé (commit c79f697).** Un succès qui n'est pas du JSON est une erreur (vérifié avec une page de portail Wi-Fi). Une réponse 2xx qui n'est pas du JSON (portail Wi-Fi captif) est traitée comme un succès : modules effacés, leçon fêtée sans être enregistrée, patrimoine en squelette. | — | `response.json().catch(() => null)` puis `unwrap(null)` (`ApiContext.tsx:249`). | Lever une erreur si un 2xx n'est pas du JSON (sauf 204). |
| I9 | Patrimoine, Réglages, Articles, Article, Cash-flow, Épargne | **Corrigé (lots 1 et 4)**, au niveau des écrans (`actionErrorText`, `LoadErrorState`) ; ApiContext lève toujours ses messages bruts, filtrés avant affichage. Les messages d'erreur s'affichent bruts, souvent en anglais. **Vérifié** : « Server Error », « Failed to fetch », « Unexpected token '<', "<html><bod"... is not valid JSON », « Erreur API ». | [erreurs-brutes](audit-captures/erreurs-brutes-et-ancien-portefeuille.jpg) | `ApiContext.tsx:256` lève `json?.message \|\| "Erreur API"`, que les écrans affichent tel quel. | Passer partout par `readableMessage()` (`authErrors.ts`), avec un repli en tutoiement. |
| I10 | Lecteur, leçon découverte Impôts | `impots.ts:80` dit qu'un don est « déduit » de l'impôt, alors que l'écran Associer de la même leçon apprend que c'est une « réduction d'impôt ». | — | Formulation. | « …retirée de ton impôt : c'est une réduction d'impôt. » (phrase complète dans l'annexe contenu) |
| I11 | Rappel (première ouverture), inscription | « Tu peux le couper à tout moment dans ton profil » : le réglage est dans les Réglages, et une personne sans compte n'y a pas accès. Aussi dans `SignupScreen.tsx:378`. | [rappel-promesse-profil](audit-captures/rappel-promesse-profil.jpg) | Texte antérieur au déplacement du réglage. | Ajouter le rappel aux réglages sans compte, et écrire « dans les réglages ». |
| I12 | Connexion | **Corrigé (décisions).** Route en production, essai d'envoi réel (réponse 200) ; activé dans l'app. Réception du courriel à confirmer. Le mot de passe oublié est désactivé (« Bientôt disponible dans l'app. En attendant, passe par le site. »), alors que la page du site répond. Un utilisateur qui l'a oublié est bloqué. | — | `FORGOT_PASSWORD_ENABLED = false` (`LoginScreen.tsx:25`). | Activer le lien (navigateur intégré vers `/forgot-password`) après avoir vérifié l'envoi du courriel. |
| I13 | Lecteur, toute l'app | Sur iOS, rien n'est annoncé à VoiceOver : verdict d'une réponse, erreurs, confirmations. Le vrai ou faux passe en plus à la carte suivante en 1,5 s. | — | Aucun `AccessibilityInfo.announceForAccessibility` ; `accessibilityLiveRegion` ne fonctionne que sur Android. | Un utilitaire `announce()`, et suspendre l'avance automatique sous VoiceOver. À vérifier sur iPhone. |
| I14 | Articles, Article | L'étoile « favori » et le marque-page sont impossibles à activer avec VoiceOver : imbriqués dans la carte, sans libellé ni état. | — | `ArticleScreen.tsx:110-122`, `ArticleDetailScreen.tsx:137-150` : `Pressable` dans `Pressable`. | `IconButton` avec libellé (« Ajouter aux favoris »…) et `accessibilityState`. |
| I15 | Réglages (thème clair) | **Corrigé (décisions).** Thème clair retiré : thème sombre seul, barre d'état claire. Le thème clair n'est pas fini :<br>- choix non mémorisé ;<br>- heure et batterie invisibles ;<br>- or, vert, rouge et couleurs de module illisibles sur fond clair (contraste de 1,8 à 3,1).<br>Sur iPhone, `userInterfaceStyle: "dark"` force en plus le sombre au démarrage. | — | `ThemeContext.tsx:16`, `app/_layout.tsx:90` (`StatusBar style="auto"`), palette claire non retravaillée. | Retirer l'option pour la sortie, ou la terminer. |
| I16 | Lecteur | **Corrigé (lot 4).** Journaux sous `__DEV__`. Des journaux de diagnostic restent dans la version publiée, dont la réponse complète de fin de leçon avec le profil. Sur iPhone, ils vont dans le journal système. | — | `ApprendreDetailScreen.tsx:244`, `:251`, `:258`, `:429`, `:481`, sans `__DEV__`. | `if (__DEV__)`, ou les retirer. |
| I17 | Cash-flow, Épargne, Article, Portefeuille de repli | **Corrigé (lot 1).** Ces écrans plantent sur une réponse inattendue. **Reproduit** : Cash-flow avec une réponse vide (« Cannot read properties of undefined (reading 'depenses') »). | [cashflow-plantage](audit-captures/cashflow-plantage.jpg) | Ancien design, sans garde. | Couvert par B3, puis par la refonte de ces écrans. |
| I18 | Outils (onglet) | Ancien design : emoji en guise d'icônes, « › » en texte, aucun rôle de bouton, « Cash-flow » en anglais, « Portefeuille » alors que l'écran s'appelle « Mon patrimoine ». | [ancien-design](audit-captures/ancien-design-outils-epargne-articles.jpg) | Pas encore refait. | Refaire avec `ListRow` et des icônes Ionicons ; « Mon patrimoine », « Budget du mois ». |
| I19 | Articles (onglet) et Article | Ancien design :<br>- flèche de retour sur la racine d'un onglet ;<br>- couverture sans cache ;<br>- titres sans rôle ;<br>- liens sans rôle « lien » ;<br>- quiz sans état (résultat donné par la seule couleur). | [ancien-design](audit-captures/ancien-design-outils-epargne-articles.jpg) | Pas encore refait. | Refonte (`PageState`, `expo-image`, `IconButton`, rôles). |
| I20 | Article | **Corrigé (lot 1).** Chargement, introuvable, erreur avec « Réessayer ». Si la requête échoue, la page n'affiche qu'un message brut en rouge (« Failed to fetch »), sans chargement ni « Réessayer ». | [article-vide](audit-captures/article-vide-sans-erreur.jpg) | Pas de `PageState` (`ArticleDetailScreen.tsx:102`). | `PageState` pour le chargement et l'erreur. |
| I21 | Cash-flow, Épargne | **Épargne retirée (décision 10)** ; reste Cash-flow, à refaire dans un prochain chantier. Ancien design complet :<br>- formulaires sans libellés ;<br>- suppression immédiate par « ✕ », sans confirmation ;<br>- emoji ;<br>- `toLocaleString` ;<br>- cibles de 32 px. | [ancien-design](audit-captures/ancien-design-outils-epargne-articles.jpg) | Pas encore refaits. | Refonte, ou les retirer de la première version. |
| I22 | Patrimoine, carnet, profil, réglages, article | **Corrigé (lots 1 et 4).** Remarque de Val et carnet lisent les données sans recharger ; l’article utilise le dictionnaire partagé. `useLearningData` relance 3 requêtes à chaque passage, juste pour la remarque de Val. L'article recharge tout le dictionnaire à chaque ouverture. | — | `ValRemark.tsx:17`, `NotebookScreen.tsx:29`, `ArticleDetailScreen.tsx:47`. | Lire le store sans recharger, et utiliser `useDictionary()`. |
| I23 | Bundle et dépôt | **Corrigé (lot 4).** Favicon à 10 Ko, images et dépendance retirées. `favicon.png` pèse 2,97 Mo (6 336 × 2 688). `val.png` (2 Mo) et `b.png` ne servent nulle part. `react-native-render-html` est installée sans être utilisée. | — | Restes du gabarit et des essais. | Favicon à 192 px ; supprimer les images et la dépendance inutiles. |
| I24 | `ApiContext` | 31 méthodes jamais appelées, un contexte typé `any`, et toute l'app qui se re-rend à chaque changement de profil. | — | Fichier de 784 lignes, protégé par règle. | Le découper et le typer (décision à prendre, puisque ce fichier est protégé). |
| I25 | Définitions, articles, leçon n° 102, patrimoine (PEL), parcours de vie | **Corrigé en partie (chantier 2, en production)**, pour les définitions et les leçons : chiffres en repères, 20 chiffres créés. Restent les articles en brouillon, les parcours de vie et le PEL (voir « Reste à faire » du chantier 2). **Nouveau (précisé).** **Mise au point du chantier 1** : les 7 articles cités (n° 10 à 16 du tableau des chiffres) ne sont pas servis aujourd'hui (supprimés sur le site, 404) ; restent servis les définitions, la leçon n° 102, le PEL et les parcours de vie. 19 chiffres réglementaires faux au total, dont :<br>- flat tax 30 % au lieu de 31,4 % ;<br>- prélèvements sociaux 17,2 % au lieu de 18,6 % ;<br>- Livret A à 3 % ou 1,5 % au lieu de 1,7 % ;<br>- loi Pinel présentée comme ouverte ;<br>- PEL ancien estimé au taux de l'année.<br>Voir la section « Chiffres qui changent, écrits en dur ». | — | Les articles, les parcours et les prompts de génération ne passent pas par les chiffres réglementaires. Le seeder du dictionnaire réécrirait toute correction faite en base. | Voir la section dédiée et l'[annexe](audit-annexe-chiffres.md). |
| I26 | Configuration de build | **Corrigé (décisions).** `EXPO_PUBLIC_API_URL` par profil : staging (`https://staging.valtheria.fr/api`) pour development, preview et simulator, production pour production. Les profils `development`, `preview` et `production` visent tous l'API de production. | — | Pas d'`env` par profil dans `eas.json`. | `EXPO_PUBLIC_API_URL` par profil, staging pour les essais. |
| I27 | Liens dans les articles | **Corrigé (lot 1).** Seulement `https:` (navigateur intégré) et `mailto:`. Tout lien `[texte](url)` d'un article est ouvert sans contrôle de son type (`tel:`, `intent:`, `javascript:` sur le web). | — | `BlockRenderer.tsx:107` `Linking.openURL(url)`. | N'accepter que `https:` et `mailto:`, et ouvrir dans le navigateur intégré. |
| I28 | Patrimoine | **Corrigé (lot 1).** L’erreur reste une erreur du nouvel écran ; ancien Portefeuille supprimé. **Nouveau.** Si le patrimoine ne se charge pas (hors ligne, délai, 500), ou sans compte, l'aiguillage affiche l'**ancien** écran « ‹ Portefeuille », avec « Server Error » en anglais (**vérifié**). Quand le réseau revient, cet ancien écran charge les positions et appelle `.toFixed` sur des champs `null` (placements sans cours) : l'app se ferme sur iPhone. | [erreurs-brutes](audit-captures/erreurs-brutes-et-ancien-portefeuille.jpg) | `PatrimoineGate.tsx:15-19` : le nouvel écran n'est servi que si `ledger && portfolio`, sinon `PortefeuilleScreen`. | Remplacer le repli par un `PageState` d'erreur avec « Réessayer » (le nouveau format est en production), et supprimer l'ancien écran. |
| I29 | Un actif, Analyse, Révision, Articles | **Corrigé (lot 1).** **Nouveau.** Hors ligne ou en erreur, les écrans affichent un état vide qui ment, au lieu d'une erreur :<br>- Un actif : « Cet actif n'est plus dans ton patrimoine. » ;<br>- Analyse : « Ajoute un premier actif pour voir ta répartition. » ;<br>- Révision : « Ta première révision arrive après ta première leçon. », pour un compte qui a fini ses 4 leçons ;<br>- Articles : « Failed to fetch » puis « Aucun article pour le moment ».<br>Vérifié avec un profil chargé et seul le patrimoine ou la révision en échec. | [etats-hors-ligne](audit-captures/etats-hors-ligne.jpg) | L'échec du chargement est traité comme une liste vide. | Distinguer « vide » de « erreur » : `PageState` d'erreur avec « Réessayer » et le message hors ligne habituel. |
| I30 | Articles | **Corrigé (lot 1)** : toutes les pages se chargent au défilement (vérifié avec 38 articles). **Mise au point** : la production ne sert aujourd’hui que **2** articles ; les 36 autres « publiés » du relevé sont supprimés (suppression douce, colonne `deleted_at` absente du relevé). **Nouveau.** Seuls les 12 articles les plus récents sont accessibles, sur les 38 publiés : l'API pagine par 12 et l'app ne demande jamais la page suivante. | — | `getArticles()` appelle `/articles` sans `page` (`ApiContext.tsx:317-323`, `ArticleScreen.tsx:32`). | Charger les pages suivantes au défilement (`onEndReached`), sans modifier `ApiContext` si possible (paramètre `page` dans un nouvel appel). |
| I31 | Lecteur, leçon n° 102 | **Corrigé (chantier 2, en production).** Écran 7 : bonne réponse choisie par le serveur selon les taux (`selon_chiffres`). **Nouveau.** Deux bonnes réponses sont fausses :<br>- à l'écran 7, la réponse attendue remplit d'abord le Livret jeune « au meilleur taux », alors que le LEP (2,5 %) rapporte plus que le Livret jeune (1,7 %) : pour 2 000 €, 50 € par an contre 37,20 € ;<br>- le livret « boosté » est compté faux alors qu'il remplit les deux critères annoncés. | — | Logique de la question liée aux taux (la variable change le chiffre, pas la bonne réponse). | Revoir la question côté site (lot API), phrase proposée dans l'annexe contenu. |
| I32 | Leçon découverte Crypto | **Corrigé (chantier 2).** Bonne réponse : ne pas investir sur un simple conseil sans comprendre, et jamais plus que ce qu'on peut perdre. **Nouveau.** Au dialogue avec Léo (« elle va faire fois 10 cette année. Mets tout ton livret dessus ! »), la bonne réponse est « Je veux bien tenter, mais seulement une petite somme que je peux perdre », et Val enchaîne à l'impératif « Mets-y seulement… ». C'est valider l'achat d'une crypto inconnue vantée par un proche, le schéma type d'une arnaque. Phrase interdite (conseil d'achat). | — | Rédaction (`crypto.ts:92-97`). | Bonne réponse : « Je me renseigne d'abord : qui la crée, qui me la vend, et pourquoi on me promet ×10 ? ». Phrases dans l'annexe contenu. |
| I33 | Leçon découverte Salaire | **Corrigé (chantier 2).** Lignes alignées sur la fiche de paie (net payé après impôt). **Nouveau.** La décomposition se contredit :<br>- « 1 660 € net » est un net **après** impôt dans la fiche de paie dont la leçon vient, mais les lignes 470 / 2 130 / 925 le traitent comme un net avant impôt ;<br>- le coût employeur ignore les allègements près du SMIC ;<br>- « Personne ne te montre ce chiffre » est faux : la fiche de paie affiche obligatoirement le total versé par l'employeur. | [revelation-sans-unite](audit-captures/revelation-sans-unite.jpg) | `decouvrir.ts:12`, `:33`, `:41-46`. | Aligner les lignes sur la fiche de paie de référence, et écrire « Ce chiffre est en bas de ta fiche de paie, on le regarde rarement ». |
| I34 | Dictionnaire | **Corrigé en partie (chantier 2, en production)** : USDC, Berkshire et actions de préférence, réplication synthétique, notation de la Grèce. Restent les titres et protocoles précis (CW8, Aave). **Nouveau.** Hors chiffres faux (I25), des définitions donnent des conseils déguisés ou des informations fausses :<br>- titres et protocoles précis (CW8, Aave), « opportunité d'achat » ;<br>- « l'USDC vaut toujours 1 $ » ;<br>- faute « t'appauris ». | — | Contenu du site, généré puis importé par seeder. | Phrases de remplacement dans l'annexe contenu (section 3 B). Corriger aussi le seeder. |
| I35 | Lecteur (tout écran inconnu) | **Corrigé (lot 4).** Texte de Val ; le JSON reste en développement. **Nouveau.** Un écran d'un type non géré, ou mal formé, affiche « Type d'écran pas encore géré » et le **JSON brut** du contenu. | — | `FallbackScreen.tsx:21-24` (`JSON.stringify(screen.payload, null, 2)`). | « Cet écran arrive bientôt dans l'app. Tu peux passer à la suite. », avec le JSON seulement sous `__DEV__`. |
| I36 | Profil, carnet, patrimoine | **Décidé** : contenu d'apprentissage gardé entre deux lancements (modules, univers, série, XP, Vals, mots ; jamais un montant) ; synchronisation ajoutée au lot serveur (section 10). **Nouveau.** Une partie de la progression ne vit que sur le téléphone : carnet, journal de la semaine, étapes du patrimoine, précision, mots, et **objectifs du patrimoine**. Sur un nouveau téléphone (ou après une réinstallation), tout est perdu, et les écrans contredisent le serveur. Constaté avec le compte 15 sur un appareil neuf :<br>- « Série 1 j » à côté de « Ta première leçon de la semaine t'attend » ;<br>- carnet vide après 4 leçons terminées ;<br>- « étapes 0 sur 5 » dans le Profil, alors que le Patrimoine fête « deux nouvelles étapes » juste après. | [profil-incoherences](audit-captures/profil-incoherences.jpg) | AsyncStorage seul (`weekJournal`, `notebook`, `patrimoinePrefs`, `accuracy`…). Les étapes ne sont calculées qu'à l'ouverture du Patrimoine. | Court terme : calculer les étapes depuis les données du patrimoine, et dériver la semaine de l'historique du serveur. À terme : synchroniser ces données avec le compte (lot API). |
| I37 | Icône iOS (`app.json:7`) | **Corrigé (lot 4).** `ios.icon` opaque, fond `#0D0D0F`, logo à 80 % (à valider visuellement). **Nouveau.** L'icône est transparente à 77 %, et Expo l'aplatit sur **du blanc** pour iOS : le logo apparaîtra sur un carré blanc sur l'écran d'accueil, dans TestFlight et sur l'App Store. | — | `withIosIcons` (`removeTransparency`, fond `#ffffff`). Android a son fond sombre. | Fournir `ios.icon` : 1024 × 1024, opaque, fond `#0D0D0F` (variantes `dark` et `tinted` en option). |
| I38 | Filet contre les plantages d'animation | **Corrigé (lot 3).** Contrôle par l’arbre syntaxique, cas d’essai T1 à T9, zéro faux signalement. **Nouveau.** Le test des styles animés, ajouté après le plantage du 16 octobre, ne verrait qu'environ un cas sur quatre. Il ignore :<br>- les méthodes (`theme.withOpacity(...)`) ;<br>- les rappels de gestes et de `withTiming` ;<br>- `useAnimatedReaction` ;<br>- l'intérieur des fonctions `'worklet'`. | — | `tests/worklets.test.ts` lit le texte, et seulement trois hooks. | Passer par l'AST de TypeScript, et couvrir les 9 angles morts listés dans l'annexe iPhone (T1 à T9). |
| I39 | Article | **Corrigé (lot 1).** Une seule instance de l’expression. **Nouveau.** L'expression régulière qui repère les mots du dictionnaire (tous les termes, `\p{L}` et lookbehind) est recompilée pour chaque paragraphe. Le moteur de Hermes est interprété : l'article peut mettre plusieurs centaines de millisecondes à s'afficher sur iPhone, alors que rien ne se voit sur le web. À mesurer. | — | `BlockRenderer.tsx:23-27` et `:46`. | Réutiliser une seule instance, ou chercher mot par mot dans un `Set` comme `dictionary.ts:425-436`. |

### Gênant

| # | Écran | Problème | Capture | Cause probable | Correction proposée |
|---|---|---|---|---|---|
| G1 | Première ouverture | Val se présente au moins trois fois en une minute (quatre selon le relevé du contenu) : bienvenue (« Salut ! Moi, c'est Val. »), prénom (« Salut ! Moi, c'est Val. Et toi, comment je t'appelle ? »), inscription (« Moi, c'est Val. Et toi ? »). **Nouveau.** On demande aussi deux noms : le prénom, puis le pseudo (« Comment Val doit t'appeler ? »). S'ils diffèrent, le bilan dit « Bravo, Camille » et le Profil « Quentin ». | [deux-prenoms](audit-captures/deux-prenoms.jpg), [val-trois-fois](audit-captures/val-se-presente-trois-fois.jpg) | Textes écrits séparément ; prénom local et pseudo du compte. | Garder la présentation de la bienvenue. Proposer le prénom comme pseudo à l'inscription (« Tu gardes Camille comme pseudo ? »). |
| G2 | Leçons découvertes | Chiffres mal formatés : « 1660 € net » et « 69000 dollars » sans séparateur, alors que le curseur affiche « 1 660 € » ; « 1000 € placés » ; 21 espaces ordinaires avant € ou %. **Nouveau.** Lignes de révélation sans unité : « Les intérêts coûtent environ 100 000 », « + tes cotisations salariales 470 », « = ton salaire brut 2 130 ». | [revelation-sans-unite](audit-captures/revelation-sans-unite.jpg), [lecon-decouverte-1660](audit-captures/lecon-decouverte-1660.jpg) | Texte en dur (`decouvrir.ts:12`, `crypto.ts`, `logement.ts`) ; valeurs de révélation sans unité. | Passer par `formatAmount()`, et donner une unité à chaque ligne de révélation. |
| G3 | Liens directs | **Corrigé (lot 4).** Un lien qui ouvre l'app à froid sur `/client/login` ou `/client/register` retombe sur la bienvenue tant que la première ouverture n'est pas finie (vérifié). | — | `OnboardingGate` n'autorise que `/bienvenue…`. | Autoriser aussi `/client/login` et `/client/register`. |
| G4 | Lecteur (révélation) | Une ligne atténuée n'affiche que son libellé, trop pâle (contraste de 2,13). Dans la leçon n° 100, « Ce que son appli affiche après la baisse » perd sa valeur (2 400), alors que l'écran suivant demande de comparer « 3 000 au départ, 2 400 aujourd'hui ». | [lecon-100](audit-captures/lecon-100-espaces-et-ligne-sans-valeur.jpg) | `RevealScreen.tsx:226`, couleur `textFaint`. | Afficher la valeur si elle existe, et écrire ces notes en `subtitle`. |
| G5 | Accueil d'Apprendre | La bulle de Val (« Tu es à jour ! Une petite révision ? 0 sur 1 ») répète la carte qui suit (« Tu es à jour, de nouvelles leçons arrivent »). Le « 0 sur 1 » n'est pas expliqué, et le « 2 · » de « 2 · LA RÉVISION » non plus. | [apprendre-un-seul-module](audit-captures/apprendre-un-seul-module.jpg) | Deux composants qui disent la même chose. | Une seule phrase ; retirer le compteur de la bulle. |
| G6 | Bilan, profil | « Meilleure série » désigne deux choses : des jours d'affilée et des bonnes réponses d'affilée (« Meilleure série : 6 d'affilée » sous « Série 3 jours »). **Nouveau.** Le vrai ou faux annonce « 3 bonnes réponses sur 4 », puis le bilan affiche « Précision 33 % · 1 sur 3 » : le jeu de cartes compte pour une seule question. | — | Vocabulaire (`StreakSheet.tsx:78`, `accuracy.ts:170`, `MedalsCard.tsx:89`). | Réserver « série » aux jours ; « record : 6 d'affilée » pour les réponses ; expliquer ce que compte la précision. |
| G7 | Leçons découvertes | Imprécisions :<br>- « une prime ne fait jamais perdre d'argent » (elle peut faire baisser des aides) ;<br>- « Quand tu revends avec un gain, il est imposé » (faux pour un échange crypto contre crypto, et pour un total de cessions sous 305 € par an) ;<br>- des bonnes réponses qui se devinent ;<br>- « Presque. » même si tout est faux. | — | Rédaction. | Phrases de l'annexe contenu. |
| G8 | Notifications | **Corrigé (lot 4).** À vérifier sur iPhone. Si la permission est refusée, rien n'ouvre les réglages du téléphone. Si elle est retirée plus tard, le rappel reste affiché « 19 h ». L'autorisation provisoire d'iOS n'est pas reconnue. | — | `reminder.ts:98`, `:126`. | `Linking.openSettings()`, et repasser le rappel à « coupé ». À vérifier sur iPhone. |
| G9 | Mémoire du téléphone | **Corrigé (lot 4).** File d’attente commune ; lecture illisible distinguée. Une lecture ratée est traitée comme « jamais vu » et écrase les vraies données. La révision et le texte des leçons grandissent sans limite (Android : 6 Mo maximum). Écritures sans file d'attente : deux favoris touchés vite, ou deux déclics ajoutés en même temps, et l'un est perdu. | — | `userMemory.ts:38-47` et `:81-88`, `revisionMemory.ts`, `lessonTexts.ts`, `dictionaryMemory.ts:34-47`, `lastModule.ts:39-47`. | Distinguer « absent » d'« illisible », borner les listes, et un `createUserStore` commun avec file d'attente. |
| G10 | Connexion | **Corrigé (lot 4).** Le mot de passe est envoyé deux fois : deux requêtes `/auth/login`, dont la première crée un jeton jamais utilisé. | — | `LoginScreen.tsx:49` puis `:55`. | Un seul appel. |
| G11 | Liens profonds | **Corrigé (lot 4).** État « Se connecter » dans les Réglages. `valtheria://client/reglages` en invité ouvre des Réglages dont toutes les actions échouent en 401. | — | Pas de garde sur les routes qui exigent un compte. | Rediriger vers la connexion. |
| G12 | Animations | **Corrigé (lot 4).** `freezeOnBlur` sur les onglets et les piles. Les boucles infinies (bulle de Val, flamme, chemin du module, coffre) continuent quand l'écran est caché. | — | Ni `freezeOnBlur`, ni `cancelAnimation` hors focus. | `freezeOnBlur: true` sur les onglets et les piles. |
| G13 | Patrimoine | **Corrigé en partie (lot 4)** : écran caché figé ; le re-rendu toutes les 30 s de l’écran visible reste. Un minuteur de 30 s re-rend tout l'écran, même caché. | — | `PatrimoineScreen.tsx` (`TICK_MS`). | Ne rafraîchir que « Mis à jour il y a… », ou suspendre hors focus. |
| G14 | Carnet, opérations d'un actif | Listes longues sans virtualisation. | — | `ScrollView` avec `map` (`NotebookScreen.tsx:44`, `ActifScreen.tsx`). | `SectionList`, ou « Voir tout ». |
| G15 | Grand texte | Aucun texte ne peut atteindre 200 % (plafonds de 1,2 à 1,6). L'explication du vrai ou faux est coupée à 3 lignes. | — | `Style.ts:401-448`, `TrueFalseScreen.tsx:378`. | Plafond de 2 pour le texte courant ; retirer `numberOfLines`. |
| G16 | Cibles tactiles | Moins de 44 px : appareil photo du profil (30 px), crayon du profil (36 px), « ? » d'aide (40 px), puces du dictionnaire (36 px), onglets de niveau (38 px), boutons `sm` (36 px). | — | Tailles des composants. | `hitSlop`. |
| G17 | Contrastes (thème sombre) | Sous le seuil de lisibilité :<br>- `textFaint` (2,13) pour des textes informatifs ;<br>- l'accent de Val (`goldDeep`) à 3,57 sur la bulle ;<br>- la bulle « Commencer » du module ivoire à 2,49 ;<br>- les icônes ivoire sur les ronds de module, de 1,4 à 2,8. | — | Palette. | `subtitle` pour le texte, accents plus sombres. |
| G18 | VoiceOver | Libellé d'un champ lu deux fois, et erreur non rattachée au champ ; écrans muets pendant le chargement ; chemin du module lu avant le bouton retour ; croix « Fermer » lue avant le titre de la feuille ; puces de période et de catégorie sans état (anciens écrans). | — | `TextField.tsx`, `Skeleton.tsx`, `ModuleScreen.tsx`, `BottomSheet.tsx`, `HistoryChart.tsx`, `AddEntryForm.tsx`. | Corrections ponctuelles (annexe contenu, sections 1 A.6 et 1 C). |
| G19 | Défilements | **Corrigé (lot 4).** Trois défilements animés ignorent la réduction des animations. | — | `ApprendreDetailScreen.tsx:606` et `:778`, `DictionaryHomeScreen.tsx:111`. | `animated: !reduced`. |
| G20 | Vocabulaire du patrimoine | **Corrigé en partie (décision 10)** : un seul système d'objectifs, ceux du patrimoine (Épargne retirée, objectifs repris). « Portefeuille » dans Outils, mais « Mon patrimoine » à l'arrivée ; deux systèmes d'objectifs (Épargne et patrimoine) ; « Revenus passifs » ou « Intérêts sur 1 an » ; « Plus-value » pour un montant qui peut être négatif (« Plus-value réalisée » sur une vente à perte) ; « YTD ». | — | Libellés d'époques différentes. | « Mon patrimoine » partout, un seul système d'objectifs, « Intérêts estimés », « Plus ou moins-value », « Année ». |
| G21 | Remarques de Val (patrimoine) | Un bien à plus de 30 % déclenche « tout dépend de lui » et « Revoir « Diversifier » ». **Vérifié** sur l'Analyse du compte 15 : la remarque vise un ETF Nasdaq-100 (65 %), lui-même composé de 100 entreprises, et renvoie à une leçon d'un univers fermé. Même cas pour la résidence principale. | [actif-variation](audit-captures/actif-variation-avant-achat.jpg) | `valTips.ts:63-72`, `:23-28`. | Exclure l'immobilier et nuancer pour les fonds (« un ETF répartit déjà, mais sur un seul marché »). Ne citer qu'une leçon publiée. |
| G22 | Recherche d'actif | Le texte d'exemple nomme des produits (« ex. Solana, CW8, LVMH »), et il est coupé sur iPhone SE. Le formulaire de l'ancien Portefeuille cite « AAPL, BTC, Apple Inc. ». | [actif-variation](audit-captures/actif-variation-avant-achat.jpg) | `AssetSearchScreen.tsx:127`, `AddPositionForm`. | « Nom, symbole ou ISIN ». |
| G23 | Ancien Portefeuille (repli) | **Corrigé (lot 1).** Écran supprimé. Pourcentages avec un point (« +3.45% ») ; en-tête « ‹ » ; emoji de type ; suppression par « ✕ » sans confirmation. | — | Ancien design, servi sur erreur (I28). | Le supprimer (I28). |
| G24 | Lecteur | « Tout près : tu étais à 80 € » (on comprend que l'estimation valait 80 €) ; « Bien plus que tu pensais » et « Bien moins que tu pensais ». Une seule réplique d'erreur, quel que soit le mauvais choix (`epargner.ts:120`, `decouvrir.ts:106`). | — | `lessonPlayer.ts:131`, `:134`. | « …à 80 € près » ; « …que ce que tu pensais » ; une réplique par mauvais choix. |
| G25 | Fenêtre de sortie d'une leçon | « Tu y étais presque » s'affiche dès le premier écran. | — | `QuitSheet.tsx:29`. | « Si tu pars maintenant, tu recommenceras depuis le début. » |
| G26 | Accueil sans compte | « En attendant, toutes les leçons sont à toi » contredit « Verrouillé ». « Reprendre la leçon » s'affiche alors que la leçon repart du début. | — | `discoveryHome.ts:324`, `GuestLessonCard.tsx:61`. | « …les six leçons découvertes sont à toi » ; « Recommencer la leçon ». |
| G27 | Masculin implicite | « Tu dois être connecté. » (3 écrans), « Le vrai secret de ceux qui épargnent », et, dans du code mort, « tu t'étais arrêté », « Prêt pour la suite ? ». | — | `valLines.ts`, `epargner.ts`, anciens écrans. | « Connecte-toi pour continuer. », « Le vrai secret pour épargner » ; supprimer le code mort. |
| G28 | Notifications (textes) | Pression sur la série dans trois textes (`reminder.ts:32`, `:34`, `:36`, dont « Ta série compte sur toi ») ; « une minute » qui ne correspond pas aux durées affichées ; « tu le gardes pour toujours ». | — | `utils/reminder.ts:32-48`. | Formulations de l'annexe contenu. |
| G29 | Code | **Corrigé (lot 1).** `ArticleDetailScreen` est ignoré par le compilateur React, à cause d'un `useMemo` manuel. | — | `ArticleDetailScreen.tsx:53`. | Retirer le `useMemo` (avec la refonte). |
| G30 | Code | **Corrigé en partie (lots 1 et 2)** : doublons de l’ancien Portefeuille et des constantes d’espace supprimés. Trois `formatMoney` locaux aux règles différentes, deux modules de format, deux types `Position`, deux courbes de portefeuille, deux boutons retour, deux mémoires des mots, `NBSP` redéclaré dans 9 fichiers. | — | Ancien et nouveau design qui cohabitent. | Garder `utils/format.ts`, `utils/patrimoine` et les composants communs ; supprimer les doublons avec les refontes. |
| G31 | Code | `Style.ts` fait 1 840 lignes, dont environ 1 300 pour l'ancien design. `getBasiquesStyles`, `getBoutonStyles` et `getInputStyles` sont morts. | — | Héritage. | Déplacer l'ancien design dans `legacy.ts`, puis le supprimer au fil des refontes. |
| G32 | Code | Fichiers de plus de 500 lignes : `ApprendreDetailScreen` (858), `ModuleScreen` (607), `TrueFalseScreen` (582), `OrderScreen` (574), `DiscoveryEndScreen` (542), `ValBubble` (538), `PatrimoineScreen` (528), `ChestReveal` (512), `OperationScreen` (511). | — | Croissance par ajouts. | Extraire `useLessonSession` et l'écran de fin en priorité. |
| G33 | Configuration | `AGENTS.md` renvoie à la documentation d'Expo v54, alors que le projet est en SDK 57. | — | Fichier non mis à jour. | Pointer vers la v57. |
| G34 | Configuration | 13 paquets `expo-*` ont un correctif de retard (expo 57.0.19, attendu 57.0.30). | — | Pas de mise à jour depuis la création. | `npx expo install --fix`, puis tests. |
| G35 | Configuration | Le serveur Metro ne voit pas toujours les fichiers modifiés : un iPhone peut tourner sur un ancien code. | — | Surveillance des fichiers. | Relancer avec `--clear` après une mise à jour ; vérifier Watchman. |
| G36 | Notifications | **Corrigé (décisions).** Toucher un rappel ouvre l'accueil d'Apprendre, app ouverte ou fermée. À vérifier sur iPhone. Toucher une notification ouvre l'accueil, pas la leçon proposée. | — | Aucun écouteur de réponse aux notifications. | Ouvrir la leçon du jour. |
| G37 | Données de la courbe | Le passage à la nouvelle mesure de l'investi (16 octobre) crée une marche de 214 € dans la Performance. | — | Les anciens relevés gardent « investi = prix de revient ». | Côté site (lot API) : recalculer `net_invested` sur les anciens relevés. |
| G38 | Recherche d'actif | Taper « livret » montre les livrets suggérés, puis « Aucun actif trouvé pour « livret » » (vérifié). | [actif-variation](audit-captures/actif-variation-avant-achat.jpg) | Deux listes sans lien. | Masquer « Aucun actif trouvé » quand des suggestions répondent. |
| G39 | Thème | **Corrigé (décisions).** Option retirée. Le choix du thème n'est pas mémorisé (voir I15). | — | `ThemeContext.tsx:16`. | Le mémoriser, ou retirer l'option. |
| G40 | Lecteur et leçons découvertes, iPhone SE | **Nouveau.** Sur petit écran, du contenu passe sous le bouton fixe, sans indice de défilement :<br>- la 3e réponse d'un choix (« Ne mettre aucun apport… ») ;<br>- le 3e pot de la répartition (« Épargne ») ;<br>- la dernière ligne du tableau de révélation de Crypto (« 1000 € placés au sommet en valaient… »), coupée net. | [iphone-se-contenu-masque](audit-captures/iphone-se-contenu-masque.jpg) | Pied de page fixe, sans dégradé de fondu ni marge basse suffisante. | Marge basse égale à la hauteur du pied, fondu au-dessus du bouton, et défilement automatique vers la réponse touchée. |
| G41 | Un actif | **Nouveau.** La variation « sur 1 an » porte sur le cours, y compris avant l'achat. Côte à côte : « + 729 € (+ 28,2 %) depuis tes achats » et « − 2 436 € (− 42,3 %) sur 1 an » (Solana) ; « + 429 € » et « − 828 € » (Bitcoin). On croit avoir perdu de l'argent. | [actif-variation](audit-captures/actif-variation-avant-achat.jpg) | Période appliquée à la quantité actuelle, sans tenir compte de la date d'achat. | Limiter la période à la détention, ou écrire « Le cours sur 1 an : − 42,3 % ». |
| G42 | Carnet, « Me tester » | **Corrigé (lot 1).** **Nouveau.** Sans déclic, le test répond « Je ne trouve pas cette leçon. » | [profil-incoherences](audit-captures/profil-incoherences.jpg) | État vide non prévu. | « Ton carnet est encore vide : termine une leçon, et on se teste. » |
| G43 | Profil, objectif | **Nouveau.** Pour l'objectif « Je découvre, on verra », la carte dit « Les leçons de cet univers arrivent bientôt » et renvoie à « Avant d'investir », déjà terminé. | [profil-incoherences](audit-captures/profil-incoherences.jpg) | Repli sur le premier univers ouvert. | Dire où mène le lien (« En attendant, revois Avant d'investir »), ou proposer la révision. |
| G44 | Noter une opération, objectif | **Corrigé (lot 4).** Barre « OK » sur tous les claviers numériques d’iOS. À vérifier sur iPhone. **Nouveau.** Le clavier numérique d'iOS n'a pas de touche Retour, et rien ne permet de le fermer : le bouton « Enregistrer » reste caché. À vérifier sur iPhone. | — | Champs `decimal-pad` sans `keyboardDismissMode` ni barre « OK » (`OperationScreen.tsx:255`, `ObjectifScreen.tsx:91`). | `keyboardDismissMode="interactive"` et un `InputAccessoryView` « OK ». |
| G45 | Bienvenue | **Corrigé (lot 4).** **Nouveau.** Deux capteurs de gravité tournent pendant toute la première ouverture, même quand la bienvenue est cachée sous le prénom ou la leçon. Batterie entamée ; sur Android, la parallaxe démarre décalée. | — | `VaultScene.tsx:256-265`, monté tant que la bienvenue existe. | Un seul capteur, coupé hors focus, intervalle de 33 ms. |
| G46 | Réglages | **Corrigé (lot 4 et décisions)** : suppression avec purge, messages lisibles, export en fichier JSON par la feuille de partage (téléchargé sur le web). Reste à essayer sur iPhone. **Nouveau.** La suppression du compte et l'export n'ont jamais pu être essayés : `Alert` ne fait rien sur le web. L'export partage en plus les données en JSON brut dans la feuille de partage. À vérifier sur iPhone. | — | `SettingsScreen.tsx:118-143`. | Essai sur un build de développement ; export dans un fichier `.json` nommé. |
| G47 | Patrimoine, lecteur, module | **Corrigé en partie (lot 2)** : formateurs en cache ; compteurs et défilement du module à mesurer sur iPhone. **Nouveau.** Coûts propres à Hermes, à mesurer sur iPhone :<br>- un `Intl.NumberFormat` créé à chaque montant ;<br>- des compteurs animés qui font un `setState` à chaque image ;<br>- le défilement du module lu côté JS. | — | `patrimoine/format.ts:15`, `:51` ; `useCountUp.ts:28`, `RevealScreen.tsx:118` ; `ModuleScreen.tsx:163-167`. | Cache des formateurs comme `utils/format.ts`, mises à jour moins fréquentes, `useAnimatedScrollHandler`. |
| G48 | Démarrage | **Corrigé (commit c79f697).** Lecture protégée, une nouvelle tentative, puis démarrage sans session. **Nouveau.** La lecture du jeton n'est pas protégée : si elle échoue (stockage illisible, ou app relancée avant le premier déverrouillage), le démarrage attend sans fin. | — | `ApiContext.tsx:155`, sans `try`. | `try/catch/finally` (fichier protégé : décision à prendre). |
| G49 | Leçon n° 100 | **Nouveau.** À « Laquelle de ces phrases est fausse ? », « Si tu ne vends pas, tu n'as encore rien perdu » est validée comme vraie. Or la valeur a bien baissé : c'est la perte qui n'est pas encore définitive. | — | Rédaction (site). | « Si tu ne vends pas, ta perte n'est pas encore définitive. » |
| G50 | Leçon découverte Épargner | **Nouveau.** « Essaie d'en garder au moins 10 %. » sonne comme une injonction. « au bon endroit, il est protégé » est imprécis : avec l'hypothèse de 2 % d'inflation de la leçon, un Livret A à 1,7 % perd aussi un peu. | — | `epargner.ts:12` et suivants. | Phrases de l'annexe contenu. |
| G51 | Base du site (articles) | **Nouveau.** 226 articles générés automatiquement sont marqués `is_published = 1` avec le statut `draft`. Beaucoup sont coupés en plein mot, et environ 120 sont redondants (49 sur les intérêts composés). L'API ne les sert pas aujourd'hui, mais un changement de filtre les exposerait. Un article servi (`pea`) montre une note interne. | — | Lots de génération sans relecture. | Côté site (lot API) : repasser ces brouillons à `is_published = 0`, et retirer la note interne de `pea`. |

### Cosmétique

| # | Écran | Problème | Cause | Correction |
|---|---|---|---|---|
| C1 | Leçons découvertes | `crypto.ts:40` : 240 € sans tenir compte du change (plutôt 250 €) ; « fois 10 » ; « La moitié du prix en plus » (c'est la moitié de la somme empruntée) ; « vient s'y retirer ». | Rédaction. | Phrases de l'annexe contenu. |
| C2 | Toute l'app, contenu du site | Apostrophes droites et guillemets droits : une quinzaine de textes de l'app (« J'ai déjà un compte »…), et le contenu du site (« qu'elle », « qu'il » dans les leçons publiées, « "huitième merveille" » dans les articles). | Saisie. | Apostrophe typographique ’ et guillemets « », avec la normalisation de la section « Espaces insécables ». |
| C3 | Toute l'app | Majuscules écrites en dur dans les chaînes (« TES POSITIONS »). | Saisie. | `textTransform` (mieux lu par VoiceOver). |
| C4 | Patrimoine | « Mon patrimoine », mais « TES POSITIONS » et « TES OBJECTIFS » ; « clôturée » ou « soldée ». | Libellés. | Un seul possessif ; « soldée » partout. |
| C5 | Toute l'app | « S'inscrire », « Créer un compte » et « Créer mon compte » cohabitent. | Libellés. | « Créer mon compte ». |
| C6 | Dictionnaire | « Que signifie X ? » et « Que veut dire X ? » pour la même question ; la bulle répète le titre (« Que veut dire Inflation ? »). | Libellés. | Une seule formulation, et une bulle qui encourage. |
| C7 | Analyse | « …quand le site saura dire… » (détail interne). | Texte. | « Bientôt, la répartition par zone géographique. » |
| C8 | Opération | « Quantité (parts) » pour une action. | Libellé. | « actions » ou « titres ». |
| C9 | Lecteur, profil | Emoji 🔥 au lieu du composant `StreakFlame`. | `LessonRecap.tsx:132`, `DiscoveryEndScreen.tsx:301`. | `StreakFlame`. |
| C10 | Code | **Corrigé (lot 1).** Fichiers orphelins : `modals.tsx/modal.tsx`, `haptic-tab.tsx`, `use-color-scheme.ts`. | Gabarit. | Supprimer. |
| C11 | Code | Exports morts : `MASKED`, `formatPercent`, `formatRelativeDate`, `welcomeLine`, `clearPatrimoine`. **Nouveau** : `eurOr`, `investedEurOf`, `DEFAULT_PREFS`, `markDiscovered`, `useDiscoveredWords`, `moduleLevelLabel`, `moduleDoneLine`, `allDoneLine`, `useDelayedLoading`, `opacityDim`, `parallaxShift`. | Héritage. | Supprimer. |
| C12 | Code | **Corrigé (lot 1).** ESLint sans aucun problème. ESLint : 17 problèmes (10 erreurs, 7 avertissements), tous dans l'ancien design, plus `.expo/`, qu'ESLint parcourt. | Héritage. | `ignores: ['dist/*', '.expo/*']` ; corriger avec les refontes. |
| C13 | `package.json` | **Corrigé (lot 4).** Le script `reset-project` vise un fichier absent. | Gabarit. | Supprimer. |
| C14 | Bulle de Val | Le clignement garde ses minuteurs et se déclenche même caché. | `ValBubble.tsx:107`. | Garder seulement le minuteur courant. |
| C15 | Courbes | Les repères de valeur (« 120 € », « 80 000 € ») et l'étiquette du prix de revient passent sous la courbe (vérifié sur Solana et Bitcoin). | Texte posé sur la courbe. | Fond translucide sous l'étiquette. |
| C16 | Grand nombre du patrimoine | `maxFontSizeMultiplier={1}` : le total ne grandit jamais. | `BigNumber.tsx:40`. | Plafond de 1,2. |
| C17 | Feuilles | La croix « Fermer » passe avant le titre pour VoiceOver. | Ordre dans l'arbre. | La placer après le contenu. |
| C18 | Lecteur | `getArticle(slug)` n'encode pas le slug. | `ApiContext.tsx:338`. | `encodeURIComponent`. |
| C19 | Pages légales | `links.ts` code `valtheria.fr` en dur, indépendamment de l'adresse de l'API. | Constante. | Dériver de la configuration. |
| C20 | Dictionnaire | « La BCE vise ~2%/an » : typographie. | Saisie. | « 2 % par an », avec la passe sur les espaces. |
| C21 | Univers introuvable | **Nouveau.** Le bouton dit « Retour aux modules » sur un écran d'univers. | Libellé repris. | « Retour aux univers ». |
| C22 | Mon patrimoine | **Nouveau.** « Revenus passifs + 51,00 € » avec centimes, à côté de montants arrondis (« 19 744 € », « + 7 317 € »). | Formateur différent. | Même arrondi pour les tuiles. |
| C23 | Réglages, iPhone SE | **Nouveau.** « Ton objectif » passe sur deux lignes, poussé par la valeur « Je découvre, on verra ». | Valeur longue dans une ligne. | Tronquer la valeur, pas le libellé. |
| C24 | Module (chemin) | **Nouveau.** L'illustration de Val en haut du chemin est coupée par l'en-tête (on ne voit que les jambes). | Position du décor. | Décaler le décor sous l'en-tête. |
| C25 | Citations et états vides (ancien design) | **Nouveau.** `fontStyle: 'italic'` avec Inter, dont l'italique n'est pas chargée : iOS retombe sur San Francisco. | `Style.ts:781`, `:1030`, `:1287`, `:1321`, `:1494`. | Charger `Inter_400Regular_Italic`. |
| C26 | Logos des placements | **Nouveau.** `Image` de React Native sans cache disque : logos rechargés et clignotants à chaque ouverture. | `AssetIcon.tsx:45`. | `expo-image` avec `cachePolicy="memory-disk"`. |
| C27 | Démarrage | **Nouveau.** Le préchargement des images ne sert à rien en version publiée (fichiers déjà dans l'app), mais retarde l'ouverture en développement. | `usePreloadedImages.ts:35-39`. | `expo-image` pour ces 4 images, ou retirer le préchargement natif. |

## Espaces insécables

Le relevé exhaustif (fichier, ligne, extrait octet par octet, caractère attendu) est dans l'[annexe espaces](audit-annexe-espaces.md).

**Cause principale.** Une seule paire de constantes est fausse, celle qui compte le plus pour l'argent. Dans `src/utils/patrimoine/format.ts:7-8`, `NBSP` et `NNBSP` valent toutes deux U+0020. De plus, `grouped()` et `quantity()` (lignes 15-17 et 51-53) remplacent l'espace fine insécable correcte que produit `Intl` par cette espace ordinaire. Résultat mesuré : `money(27071)` renvoie « 27 071 € » avec deux espaces sécables. Tout le patrimoine passe par là : liste, actif, courbe, opérations, aperçu, objectifs, partage et VoiceOver. `src/utils/format.ts`, lui, est juste et sert de référence. Les tests ne l'ont pas vu, car ils comparent avec des chaînes tapées elles aussi avec des espaces ordinaires (6 tests à réécrire).

**Endroits concernés dans l'app : 377 occurrences dans 94 fichiers de `src/`** (aucune dans `app/`) :
- 303 affichées ;
- 63 lues seulement par VoiceOver ;
- 11 de développement ou de partage.

| Cas | Affiché | VoiceOver | Dev, partage | Total |
|---|---|---|---|---|
| Avant « : » | 94 | 44 | 6 | 144 |
| Nombre + unité (€, %, ans, mois, min, h, XP, Vals…) | 58 | 12 | 5 | 75 |
| Avant « ? » | 69 | 0 | 0 | 69 |
| Avant « ! » | 39 | 3 | 0 | 42 |
| Guillemets « » (ouvrant et fermant) | 28 | 4 | 0 | 32 |
| Avant « ; » | 5 | 0 | 0 | 5 |
| Pourcentage sans espace et avec un point décimal (« 2.35% ») | 4 | 0 | 0 | 4 |
| Milliers | 3 | 0 | 0 | 3 |
| Nombre + symbole variable | 3 | 0 | 0 | 3 |

Fichiers les plus touchés :

| Fichiers | Occurrences |
|---|---|
| `utils/patrimoine/valTips.ts` | 16 |
| `lesson/discovery/epargner.ts` | 14 |
| `lesson/discovery/decouvrir.ts` | 13 |
| `utils/patrimoine/chart.ts`, `utils/dictionary.ts`, `screens/header/LoginScreen.tsx`, `lesson/discovery/investir.ts` | 12 chacun |
| `utils/universes.ts` | 11 |
| `utils/patrimoine/celebration.ts` | 9 |
| `utils/accuracy.ts`, `lesson/discovery/crypto.ts` | 8 chacun |
| `PatrimoineScreen`, `ProfilScreen`, `TermScreen`, `lesson/discovery/index.ts`, `impots.ts`, `valLines.ts` | 7 chacun |

S'y ajoutent les formateurs des anciens écrans :
- `toLocaleString(…) + ' €'` dans Portefeuille, `PositionRow`, Épargne, Cash-flow, `EntryRow` et `CategoryBreakdown` ;
- `toFixed(2)%` dans `PortefeuilleScreen.tsx:127` et `:136`, et `PositionRow.tsx:59` et `:67`.

**Insécables détruites à l'arrivée.** `dictionary.ts:27` et `:522` et `notebook.ts:47` font `replace(/\s+/g, ' ')`. En JavaScript, `\s` couvre U+00A0 et U+202F : une correction faite côté site serait perdue dans le Dictionnaire et le Carnet.

**Contenu du site.** Il ne contient que 40 U+00A0, toutes dans des articles, et aucune U+202F. Dans les leçons, les définitions et les articles :

| Cas | Occurrences |
|---|---|
| Montant + € | 2 623 |
| Pourcentages | 1 664 |
| Milliers | 2 252 |
| Ponctuation double | 3 807 |
| Guillemets | 90 |
| Unités (ans, mois, jours…) | 2 188 |

Exemples réels :
- leçon n° 100, « panne de scooter à 900 €. » et « Le marché a perdu 20 %. » ;
- leçon n° 102, « Pour 5 000 € laissés un an » ;
- définition CTO, « au PFU à 30 % » ;
- leçon n° 101, « Le piège, c'est « un mois de salaire ». ».

Aucune normalisation générique n'existe : `noOrphan()` ne traite que la ponctuation finale de la bulle de Val, et `AppText` ne touche pas au texte.

**Correction globale proposée** :
1. **Cause racine.** Dans `utils/patrimoine/format.ts`, écrire `' '` et `' '` en échappement (jamais en caractère invisible), et remplacer par `/\s/g` dans `grouped()` et `quantity()`. Mieux encore : importer ces constantes depuis un module unique au lieu de les redéclarer dans 9 fichiers. Corriger aussi :
   - `valTips.ts:31` ;
   - les formateurs des anciens écrans, en passant par `formatAmount()` et `formatVariationPercent()` ;
   - le repli `\s+` du dictionnaire et du carnet, en `/[^\S  ]+/g`.
2. **Une fonction `frenchSpaces(text)`**, pure, idempotente et compatible Hermes (sans `\p{…}`, sans lookbehind, sans drapeau `u`). Elle colle par une insécable :
   - les groupes de milliers entre eux ;
   - €, %, $, ans, mois, h, min, XP, Vals… au nombre qui précède ;
   - « ? », « ! » et « ; » (fine insécable) et « : » (insécable) au mot qui précède ;
   - les guillemets « » à leur contenu.

   Elle protège les adresses web et les e-mails, et laisse « 14:30 », « 1:2 », « 3,141 592 » et le Markdown intacts. Prototype testé sur les 6 003 chaînes du contenu de production : il ne reste aucune faute pour €, %, milliers et guillemets, et aucune balise HTML n'est modifiée (51 ms sous Node). Le code complet et ses tests sont dans l'annexe.
3. **Où l'appliquer**, pour couvrir l'app et le site sans réécrire chaque chaîne :
   - dans `AppText`, en fusionnant d'abord les morceaux de texte voisins (`{montant} €` arrive en deux morceaux) ;
   - aux points d'entrée du contenu du site : `normalize.ts` (`plainText`, `valText`), `dictionary.ts` (`normalizeEntry`), `notebook.ts` (`plainDeclic`) et les blocs d'article ;
   - dans `ValBubble` (`parseWords(noOrphan(frenchSpaces(text)))`).

   Jamais dans `ApiContext.tsx`. La police Fraunces n'a pas de glyphe U+202F : l'option `thin: false` la remplace par U+00A0 pour les titres, comme le font déjà `BigNumber` et `StatBand`.
4. **Tests** :
   - `tests/frenchSpaces.test.ts` (5 tests prêts dans l'annexe) ;
   - réécriture des 6 tests du patrimoine qui figent l'erreur ;
   - une assertion d'octets sur `money()` ;
   - un garde-fou statique qui refuse une constante `NBSP` fausse.
5. **Côté site, en complément** : une normalisation à l'enregistrement profiterait aussi au web, mais le site est gelé. Elle ne peut se faire que par un lot API demandé. La correction côté app suffit seule pour l'affichage.

## Chiffres qui changent, écrits en dur

Le relevé complet, par source, est dans l'[annexe chiffres](audit-annexe-chiffres.md). Les valeurs « actuelles » sont celles de la table `regulatory_figures` de production au 17 octobre 2026.

### Comment fonctionnent les chiffres réglementaires

Le repère `{{cle}}` (par exemple `{{livret_a_taux}}`) est remplacé par la valeur de la table, unité comprise (« 1,7 % »). Il n'y a pas de calcul, et pas d'accès à une seule valeur d'une liste.

| Contenu | Résolu ? |
|---|---|
| Écrans de leçon | Oui, par le serveur, avec contrôle de format. Le titre, la description et l'objectif ne sont pas résolus. |
| Définitions du dictionnaire | Oui, sans contrôle : une clé mal tapée s'afficherait telle quelle. |
| Articles, parcours de vie, défis | **Non.** |
| Leçons découvertes | **Non** : elles sont embarquées dans l'app, qui n'a pas accès aux chiffres. Seule exception : le taux des livrets, reçu avec le patrimoine. |

**Cause racine.** Les prompts qui génèrent leçons, défis, parcours et articles n'injectent pas la table. Ils demandent même des « chiffres réels et actuels » (`site: AiPromptBuilder.php:513`, `:640`). D'où les taux de mémoire : Livret A à 3 %, flat tax à 30 %.

### Déjà faux aujourd'hui (à corriger en priorité)

**Mise au point (chantier 1, 17 octobre)** : l'API ne sert aujourd'hui que 2 articles. Les articles n° 10 à 16 ci-dessous sont supprimés sur le site (suppression douce, invisible dans le relevé de la base) : ils ne s'affichent pas dans l'app, mais redeviendraient faux s'ils étaient republiés.

| # | Endroit | Écrit | Valeur actuelle | Clé à utiliser |
|---|---|---|---|---|
| 1 | Définition « Flat tax » | PFU 30 % (12,8 + 17,2) ; exemple 1 500 € / 3 500 € | 31,4 % (12,8 + 18,6) ; 1 570 € / 3 430 € | `flat_tax_taux`, `prelevements_sociaux_capital`, **à créer** `pfu_ir_taux` (12,8 %). Exemple à réécrire sans résultat calculé |
| 2 | Définition « Prélèvements sociaux » | 17,2 % ; CSG 9,2 % | 18,6 % ; CSG 10,6 % | `prelevements_sociaux_capital`, `prelevements_sociaux_reduits` ; **à créer** `csg_capital_taux`, `crds_taux` |
| 3 | Définition « PEA » | 17,2 % ; « 30 % économisés = 12 000 € » | 18,6 % ; seule la part d'impôt (12,8 %) est économisée : 5 120 € | `prelevements_sociaux_capital`, `pea_plafond`, `pea_duree_exoneration`, `pfu_ir_taux` |
| 4 | Définition « Plus-value » | 30 % ; 15 € / 35 € | 31,4 % ; 15,70 € / 34,30 € | `flat_tax_taux` |
| 5 | Définition « CTO » | PFU à 30 % | 31,4 % | `flat_tax_taux` |
| 6 | Définition « Intéressement » | « tu évites les 30 % de flat tax » | Faux sur le fond : l'intéressement perçu est imposé au barème | Réécrire, `ir_bareme_taux` |
| 7 | Définition « Loi Pinel » | « Réduction allant jusqu'à 21 % » | Dispositif fermé depuis le 31/12/2024 | Réécrire au passé |
| 8 | Leçon n° 102, écran 7 | Bonne réponse : Livret jeune d'abord, « au meilleur taux » | LEP 2,5 % > Livret jeune 1,7 % | Revoir la question (I31) |
| 9 | Leçon découverte Salaire (`decouvrir.ts:41-45`) | 470 / 2 130 / 925 | Fiche source : brut 2 260, net avant impôt 1 751,74, net payé 1 660,93 | Aligner sur la fiche (I33) |
| 10 | Article `pea` | 17,2 % (×4) ; 30 % (×5) | 18,6 % ; 31,4 % | Correction manuelle |
| 11 | Article `bitcoin-pourquoi-tout-le-monde-en-parle-en-2026` | 30 % (×2) | 31,4 % (`crypto_taux_imposition`) ; le seuil de 305 € porte sur les cessions | Correction manuelle |
| 12 | Article `pea-le-compte-bourse-qui-te-fait-payer-presque-zero-impot` | 30 % ; 17,2 % (×4) ; 2 100 € | 31,4 % ; 18,6 % ; 2 198 € | Correction manuelle |
| 13 | Article `pea-le-compte-bourse-qui-te-fait-payer-moins-d-impots` | 17,2 % ; 30 % (et 31,4 % plus bas : il se contredit) | 18,6 % ; 31,4 % | Correction manuelle |
| 14 | Article `epargner-avec-un-petit-salaire-la-methode-qui-marche-vraiment` | Livret A 1,5 % (×4) ; 150 € ; « 100 € de plus » | 1,7 % ; 170 € ; 80 € | Correction manuelle |
| 15 | Article `la-regle-des-50-30-20-reprends-le-controle-de-ton-budget` | Livret A / LDDS « autour de 1,4 à 1,6 % » | 1,7 % | Correction manuelle |
| 16 | Article `1929-comment-une-bulle-speculative-a-plonge-le-monde-dans-le-chaos` | « livret A à 3 % » (au présent) | 1,7 % | Correction manuelle |
| 17 | `site: database/seeders/data/life_path_scenarios.json` (parcours de vie) | Livret A à 3 % (×4), 375 € en 5 ans | 1,7 % : environ 437 € en 5 ans sur 5 000 € | Correction du JSON et des scénarios en base |
| 18 | `site: app/Services/Assets/LivretRates.php:24-31` (patrimoine de l'app) | Tout PEL au taux de l'année (2 %) | Le taux d'un PEL est fixé à l'ouverture (2,25 % en 2024, 1,75 % en 2025) | Utiliser l'année d'ouverture, ou garder le taux saisi |
| 19 | `site: database/seeders/DictionaryTermSeeder.php` | Mêmes textes que les n° 1 à 7 | — | Le seeder fait `updateOrCreate` : relancé, il **réécrirait** toute correction. Le corriger aussi |

À vérifier, peut-être faux :
- le PER (17,2 % ou 18,6 % depuis la LFSS 2026), dans le prompt du chat de Val ;
- l'or (37,6 % sur la plus-value) ;
- l'exemple « taux d'usure à 4,5 % » de la définition (valeur actuelle : 5,29 %).

### Justes aujourd'hui, mais en dur : à passer en variable

- **Définitions, avec une clé existante** :
  - Assurance-vie et Abattement fiscal (`assurance_vie_abattement`, `assurance_vie_duree_abattement`) ;
  - PEA (`pea_plafond`, `pea_duree_exoneration`) ;
  - PEL (`pel_duree_minimale`), PEE (`pee_duree_blocage`) ;
  - Tranche marginale (`ir_bareme_taux`) ;
  - Découvert (`decouvert_taux_usure`), Taux d'usure (`credit_taux_usure`) ;
  - Quotient familial (`ir_quotient_familial_plafond`) ;
  - Gestion passive (`etf_world_rendement_moyen`).
- **Définitions, clé à créer** : IFI, IS, TVA, prélèvement automatique, plus-value immobilière, moins-value, participation, crédit renouvelable.
- **Articles servis, justes aujourd'hui** : 13 articles « evergreen » citent 31,4 %, 18,6 %, 150 000 €, 20 000 €, 305 €, 2,5 %, 10 000 € ou 23 028 €. Les articles ne résolvent pas `{{cle}}` : ils deviendront faux au prochain changement. Correction : une résolution des variables pour les articles (lot API), ou une revue à chaque changement de taux.
- **Code du site servant l'app** : prompts de génération (`AiPromptBuilder.php:365`, `:383`, `:356`, `:446`), chat de Val (`AiSystemPrompt.php:322-349`). Injecter le bloc des chiffres (`figuresBlock()`), comme pour le chat.
- **App** : aucun autre chiffre réglementaire en dur que dans les leçons découvertes. Le barème simplifié de la leçon Impôts (0 / 11 / 30 %, seuils arrondis à 11 000 € et 30 000 €) est annoncé comme tel. Les hypothèses (inflation 2 %, crédit sur 25 ans à 3,5 %, 5 % par an) sont cohérentes avec la table. Ces leçons étant embarquées, elles ne peuvent utiliser `{{cle}}` que si l'app reçoit les chiffres : un endpoint public des chiffres (lot API), ou des leçons servies par le site.

### Chiffres réglementaires à créer

**Créés au chantier 2** (les 20 clés non optionnelles ci-dessous, valeurs vérifiées : voir la section du chantier 2). Les clés optionnelles ne sont pas créées.

| Clé | Libellé | Valeur actuelle | Pour |
|---|---|---|---|
| `pfu_ir_taux` | Part impôt sur le revenu du PFU | 12,8 % | Flat tax, PEA, 4 articles, chat de Val |
| `pfu_taux_reduit` | PFU au taux réduit (assurance-vie, PEL, CEL) | 30 % | Chat de Val, assurance-vie |
| `csg_capital_taux` | CSG sur les revenus du capital | 10,6 % (à vérifier) | Prélèvements sociaux |
| `crds_taux` | CRDS | 0,5 % | Prélèvements sociaux |
| `smic_net_mensuel` | SMIC net mensuel | 1 443 € (à vérifier) | Article petit salaire |
| `smic_brut_mensuel` | SMIC brut mensuel | 1 823,03 € (à vérifier) | Fiche de paie, leçons à venir |
| `livret_jeune_age` | Âges d'ouverture du Livret jeune | 12 à 25 ans | Leçon n° 102 |
| `per_deduction_taux` | Plafond de déduction du PER | 10 % des revenus professionnels | Chat de Val |
| `ifi_seuil` | Seuil de l'IFI | 1 300 000 € (à vérifier) | Définition IFI |
| `is_taux_normal`, `is_taux_reduit`, `is_taux_reduit_plafond` | Impôt sur les sociétés | 25 % ; 15 % ; 42 500 € (à vérifier) | Définition IS |
| `tva_taux` | Taux de TVA | 20 % / 10 % / 5,5 % / 2,1 % | Définition TVA |
| `frais_rejet_prelevement_plafond` | Frais de rejet d'un prélèvement | 20 € | Prélèvement automatique |
| `credit_conso_taux_usure` | Usure des crédits à la consommation | à relever (Banque de France) | Crédit renouvelable, prompts |
| `plus_value_immo_taux_ir`, `plus_value_immo_durees_exoneration` | Plus-values immobilières | 19 % ; 22 ans / 30 ans | Définition |
| `metaux_precieux_taxe_forfaitaire`, `metaux_precieux_pv_taux` | Métaux précieux | 11,5 % ; 37,6 % (à vérifier) | Article sur l'or |
| `pea_frais_ouverture_plafond` | Frais d'ouverture d'un PEA | 10 € (à vérifier) | Article PEA |

En option : `moins_values_report_duree` (10 ans), `participation_seuil_salaries` (50), et `assurance_vie_abattement_seul` et `_couple` (4 600 € et 9 200 €), pour citer une seule valeur de la liste.

### Décompte

| Source | Chiffres en dur | Dont faux aujourd'hui |
|---|---|---|
| App, leçons découvertes (6) | 2 leçons, plus 2 hypothèses cohérentes | 1 (Salaire) |
| App, autres textes | 0 | 0 |
| Leçons publiées (4) | 1 chiffre (Livret jeune 12-25 ans) ; la n° 102 utilise déjà 20 variables | 1 logique (n° 102) |
| Dictionnaire (203) | 27 définitions | 7 définitions (12 champs) |
| Articles servis (38) | 13 evergreen | 7 |
| Articles non servis (243) | environ 98 (détection automatique) | environ 84 |
| Code du site servant l'app | environ 15 emplacements | 4, plus 1 à vérifier |

## Écrans encore à l'ancien design

| Écran | Route | Signes de l'ancien design | Proposition pour la sortie |
|---|---|---|---|
| Outils (onglet) | `app/(tabs)/outils.tsx` → `OutilsScreen` | En-tête hérité, emoji, « › » en texte, styles en ligne, pas de rôles | Refaire (liste de deux outils) |
| Cash-flow | `app/outils/cashflow.tsx` → `CashflowScreen` + `components/outils/cashflow/*` | `getCashflowStyles`, « ‹ », emoji 🔁 📅, « ✕ », `toLocaleString`, formulaires sans libellés (plus de plantage depuis le chantier 1) | Gardé tel quel, refait dans un prochain chantier (décision 10) |
| ~~Épargne~~ | ~~`app/outils/epargne.tsx` → `EpargneScreen`~~ | **Retiré (décision 10)** : objectifs repris dans ceux du patrimoine | — |
| Articles (onglet) | `app/(tabs)/article.tsx` → `ArticleScreen` | Retour sur une racine d'onglet, `Image` sans cache, favori inaccessible, pas de `PageState`, pas de pagination | Refaire |
| Article | `app/articles/[slug].tsx` → `ArticleDetailScreen` + `BlockRenderer` | En-tête hérité, erreur brute, quiz sans état, liens sans rôle, `Text` natif | Refaire |
| Écran de secours du lecteur | `FallbackScreen` | Message de développeur et JSON brut | Message de Val et « Passer » |
| En-tête hérité | `components/topbar/header.tsx`, `Back.tsx` | Pastilles « Se connecter / S'inscrire », chevron sans libellé | Supprimer avec les écrans ci-dessus |

Sont à jour : première ouverture, Apprendre (accueil, univers, module, chemin), lecteur et bilan, coffre, révision, Dictionnaire (liste, fiche, test), Profil, Réglages, carnet, connexion, inscription et patrimoine (Mon patrimoine, Un actif, Noter une opération, Recherche, Analyse, Objectif).

## Avant une sortie sur l'App Store

**Obligatoire**
1. Pages légales publiques : politique de confidentialité, CGU et mentions légales (B1).
2. Identifiant définitif (B4). Fait : `supportsTablet` retiré (B5) et icône iOS opaque (I37).
3. Contenu : plus d'un module publié, ou une promesse alignée sur ce qui est ouvert (B2).
4. Filet contre les plantages et les impasses. Fait au chantier 1 : `ErrorBoundary` (B3), ancien Portefeuille supprimé (I28), profil repris et déconnexion hors ligne (I3, I4), états d'erreur distincts des états vides (I29). Fait aussi : délai réseau (I1) et plus de déconnexion sur une erreur 500 (I2).
5. Contenu juste :
   - les 19 chiffres faux (I25) ;
   - leçon n° 102 (I31) ;
   - leçons découvertes Crypto et Salaire (I32, I33) ;
   - définitions qui conseillent un produit (I34) ;
   - aucun JSON brut à l'écran (I35).
6. Protection des données. Fait : purge à la suppression du compte (I6), plus de fuite entre comptes (I5), journaux de diagnostic retirés (I16). Fait aussi : jeton dans le trousseau (I7).
7. Fiche App Store :
   - étiquettes de confidentialité (e-mail, prénom, données financières saisies, progression ; pas de suivi publicitaire) ;
   - catégorie Éducation ou Finance ;
   - âge minimum ;
   - captures iPhone 6,9 et 6,5 pouces ;
   - texte qui précise que l'app ne donne pas de conseil en investissement.
8. Compte de démonstration pour la revue d'Apple, avec un patrimoine rempli. La suppression de compte existe dans les Réglages, comme Apple l'exige, mais elle n'a jamais été essayée sur iPhone (G46).
9. `expo install --fix` (G34). Fait : builds EAS séparés par environnement (I26).

**Fortement conseillé**
- Chiffres réglementaires partout (section dédiée). Fait : espaces insécables (B6).
- Fait : mot de passe oublié (I12, réception à confirmer), messages d'erreur lisibles (I9), pagination des articles (I30).
- Refaire ou retirer les écrans à l'ancien design (Outils, Cash-flow, Articles). Fait : Épargne retirée (décision 10).
- Progression synchronisée, ou au moins cohérente avec le serveur (I36).
- VoiceOver : annonces et favoris des articles (I13, I14).
- Essai complet sur un iPhone réel, en version de production (EAS build, pas Expo Go) :
  - sons, vibrations, notifications ;
  - VoiceOver, grand texte, réduction des animations ;
  - réseau coupé ;
  - clavier numérique (G44) ;
  - temps d'affichage d'un article (I39) ;
  - écran document de la leçon n° 101.

## Déjà corrigé avant cet audit

Ces corrections ont été faites pendant le travail sur le patrimoine, la nuit du 16 au 17 octobre. Elles ne figurent pas dans le tableau.

| Problème | Correction |
|---|---|
| Plantage à l'ouverture du portefeuille sur iPhone | Style animé sans fonction ordinaire ; test des styles animés (commit 82f4e15), dont la portée reste à étendre (I38) |
| Relevés faux de la courbe (24 septembre, 12 octobre) | Le site saute un relevé sans cours ; relevés supprimés ; filtre et suppression dans l'app |
| Taux des livrets faux | Source unique : les chiffres réglementaires, dates d'effet, signal dans l'admin, définitions branchées |
| Bitcoin sans courbe sur 1J, 1S, 1M | Points par heure, Binance en secours, aucun échec gardé en cache |
| Devises incohérentes | Tout en euros, l'original à côté, points d'achat au prix converti |
| ETF nommé dans « Souvent suivis » | Remplacé par les placements sans cours |
