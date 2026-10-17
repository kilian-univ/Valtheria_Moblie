# Relevé du contenu (annexe de l'audit)

> Annexe de [l'audit complet](audit-complet.md) du 17 octobre 2026, en lecture seule. Les mentions « dossier de travail », « scratchpad » ou `extraits/…` renvoient à des fichiers temporaires de l'audit, non conservés.


Relevé complet, en lecture seule, au 17 octobre 2026. Sommaire :

- **Leçons découvertes** (src/lesson/discovery/) : vérification des calculs, problèmes, points de l’audit précédent.
- **1. Textes de l’app** : 1 A écrans (app/, src/screens/), 1 B composants Apprendre, 1 C autres composants, 1 D logique et données (valLines, valTips, reminder.ts, discoveryHome, lessonPlayer…).
- **2. Points de l’audit précédent** : tableau unique avec l’état actuel et la phrase de remplacement de chacun.
- **3. Contenu de production** : 3 A les 4 leçons publiées (n° 100 à 103), 3 B les 203 définitions du dictionnaire.
- **4. Articles publiés** : 4 A les 25 plus récents (avec les doublons sur tout l’index), 4 B 25 articles evergreen.
- **5. Synthèse** : un seul nom par notion.

Les sections 1 A à 1 D, 3 B et 4 viennent de relectures fichier par fichier, que j’ai recoupées et vérifiées par sondage. Les numéros de ligne renvoient à l’état du dépôt au 17 octobre 2026, avec les modifications en cours non commitées.

Priorités : important = faux, interdit, trompeur ou très visible ; gênant = ton, masculin implicite, incohérence ; cosmétique = typographie.

## Leçons découvertes (src/lesson/discovery/)

### Vérification des calculs

| Leçon | Calcul affiché | Vérification | Verdict |
|---|---|---|---|
| epargner (L’argent qui fond) | 1 000 € à 2 % d’inflation pendant 10 ans → 820 € | 1 000 / 1,02¹⁰ = 820,35 € | Juste |
| epargner | Allocation sur 1 800 € : {epargne} % → {epargne_montant} €/mois, ×12 dans un an | 10 % = 180 €/mois, 2 160 €/an ; la règle (épargne ≥ 10 %, besoins ≥ 50 %) est atteignable depuis le départ (70/30/0) | Juste |
| epargner | 20 € par mois = 240 € par an | 20 × 12 = 240 | Juste |
| investir (La machine à intérêts) | 100 €/mois, 30 ans, 5 %/an → 81 500 €, dont 36 000 versés et 45 500 d’intérêts | Taux mensuel équivalent (1,05^(1/12) − 1), versements de fin de mois : 81 540 € ; 36 000 € versés ; 45 540 € d’intérêts. Même méthode que la formule du simulateur (formulas.ts:11) | Juste, et cohérent avec le curseur |
| investir | « Plus de la moitié de cet argent, tu ne l’as jamais versée » | 45 500 / 81 500 = 56 % | Juste |
| investir | Simulateur : à 30 ans, capital à 65 ans | 35 ans → 110 850 € pour 42 000 € versés ; à 20 ans → environ 196 000 € pour 54 000 € | Juste |
| crypto (Le grand huit) | 69 000 $ → 16 500 $, baisse de 76 %, 1 000 € → 240 € | 16 500 / 69 000 = 23,9 % → baisse de 76,1 %. Mais 240 € mélange dollars et euros (point déjà relevé) : l’euro est passé d’environ 1,13 $ à 1,07 $ ; en euros, 1 000 € deviennent environ 250 € | Calcul juste en dollars, unité fausse |
| logement (Le vrai prix d’un crédit) | 200 000 € sur 25 ans à 3,5 % → mensualité ≈ 1 000 €, total ≈ 300 000 €, intérêts ≈ 100 000 € | Mensualité 1 001,25 € ; total 300 375 € ; intérêts 100 375 €. Même formule que le simulateur (formulas.ts:21) | Juste |
| logement | « Avec ça, tu peux économiser des dizaines de milliers d’euros » | 15 ans : mensualité 1 429,77 €, intérêts 57 359 € → 43 000 € d’intérêts en moins qu’en 25 ans | Juste |
| impots (Le mythe de la tranche) | 29 000 → 31 000 € : 1 000 × 11 % + 1 000 × 30 % = 410 € | 110 + 300 = 410 | Juste (barème simplifié annoncé) |
| impots | Léa, 40 000 € : taux moyen ≈ 12,7 % | 19 000 × 11 % + 10 000 × 30 % = 5 090 € ; 5 090 / 40 000 = 12,7 % | Juste |
| decouvrir (Ton vrai salaire) | 1 660 net + 470 = 2 130 brut + 925 = 3 055 € | Additions justes. Salariales 470 / 2 130 = 22 % : réaliste. Patronales 925 / 2 130 = 43 % : c’est le taux plein, SANS les allègements de cotisations patronales sur les salaires proches du SMIC (2 130 € brut ≈ 1,17 SMIC). Avec la réduction générale, le coût réel tourne autour de 2 400 à 2 550 € | Faux en pratique (voir tableau) |

### Problèmes relevés

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/lesson/discovery/decouvrir.ts:12, 21, 36, 44-46 | « Tu touches 1 660 € net, tu coûtes 3 055 € à ton [employeur] » ; lignes « + les cotisations patronales 925 » « = ce que tu coûtes 3 055 » | Les 925 € de cotisations patronales (43 % du brut) ignorent la réduction générale de cotisations, qui est forte à ce niveau de salaire. Le coût réel d’un brut de 2 130 € est plutôt de 2 400 à 2 550 €. La leçon exagère l’écart d’environ 500 à 650 € | Recalculer avec le simulateur de l’Urssaf (mon-entreprise.urssaf.fr) et remplacer les deux montants, par exemple : « Tu touches 1 660 € net, tu coûtes environ 2 500 € à ton [employeur] ; l’écart finance ta [protection sociale]. » Ligne : « + les cotisations patronales, après réductions : ≈ 370 ». Ajouter une ligne atténuée : « Ordre de grandeur, il dépend de l’entreprise ». Le curseur (min 1 660, max 4 000) reste valable | important |
| src/lesson/discovery/decouvrir.ts:33 | « Personne ne te montre ce chiffre. C’est pourtant ce que tu vaux pour ton employeur. » | Faux : le bulletin de paie affiche obligatoirement le « Total versé par l’employeur ». Et « ce que tu vaux » assimile une personne à son coût | « Ce chiffre est tout en bas de ta fiche de paie, et presque personne ne le regarde. C’est ce que ton travail coûte vraiment. » | important |
| src/lesson/discovery/decouvrir.ts:109 | « Le prélèvement à la source vient ensuite s’y retirer. » | Tournure incorrecte (« se retirer » veut dire « partir ») | « Le prélèvement à la source est retiré ensuite. » | gênant |
| src/lesson/discovery/decouvrir.ts:106 | « Pas tout à fait. Le brut est plus haut que ce que tu touches. » | Seule réplique d’erreur, affichée aussi si on choisit « Le coût employeur » : elle ne répond qu’à l’erreur « brut » | « Pas tout à fait. Le brut et le coût employeur viennent avant les cotisations salariales. Le net à payer, c’est juste après. » | gênant |
| src/lesson/discovery/decouvrir.ts:63 | « Ton net après impôt sur le revenu » (à classer plus petit que « Ton net à payer ») | Si on n’est pas imposable (taux à 0 %), les deux montants sont égaux : l’ordre n’est pas strictement vrai. Et cette ligne n’a pas été montrée à l’écran précédent | « Ton net après prélèvement à la source » et, dans l’explication : « Si ton taux est à 0 %, ces deux lignes sont égales. » | cosmétique |
| src/lesson/discovery/decouvrir.ts:84, 116 | Bonne réponse « Elles financent ma retraite, ma santé et le chômage. » ; « Le net à payer avant impôt sur le revenu » | Quiz qui se devinent : la bonne réponse est la seule nuancée et la plus longue ; la seconde reprend mot pour mot « avant… impôt » de la question (« avant le prélèvement à la source ») | Dialogue : allonger une mauvaise réponse (« Elles paient surtout les frais de la banque qui verse mon salaire. »). Choix : reformuler la question sans « avant » : « La ligne de ta fiche de paie qui vient juste après les cotisations salariales s’appelle… » | cosmétique |
| src/lesson/discovery/epargner.ts:12 | « mis de côté en [premier], au bon endroit, il est protégé. » | Imprécis : avec l’hypothèse de la leçon (2 % d’inflation), un Livret A à 1,7 % perd aussi un peu de pouvoir d’achat. Il protège le capital, pas complètement sa valeur | « mis de côté en [premier], au bon endroit, il est à l’abri et fond beaucoup moins. » | gênant |
| src/lesson/discovery/epargner.ts:55, 76 | « Essaie d’en garder au moins 10 %. Tes envies s’en remettront. » | Écran noté : épargner 10 % devient la « bonne » réponse, avec un ton d’injonction. Proche de « il faut épargner » | « Avec 10 %, tu aurais déjà 2 160 € de côté dans un an. On essaie ? » (garder la règle, changer le ton) | gênant |
| src/lesson/discovery/epargner.ts:119 | « Le vrai secret de ceux qui épargnent sans effort. » | Masculin implicite (« ceux qui ») et ton « recette miracle » | « C’est l’astuce la plus simple : l’argent part avant que tu le voies. » | gênant |
| src/lesson/discovery/epargner.ts:120 | « C’est ce que fait presque tout le monde, et c’est pour ça que ça marche rarement. » | Affichée aussi si on choisit « Mettre de côté chaque fois qu’une prime arrive » : ne correspond pas à cette réponse | « Ça peut marcher, mais ce qui reste en fin de mois et les primes, c’est irrégulier. Le virement automatique, lui, tombe tous les mois. » | gênant |
| src/lesson/discovery/epargner.ts:129 | « Programmer un virement le jour où la paie tombe » | Seule réponse précise et la plus longue : se devine | Allonger les autres : « Garder ce qui reste sur ton compte à la fin de chaque mois », « Mettre de côté une partie de chaque prime ou cadeau » | cosmétique |
| src/lesson/discovery/investir.ts:71 | « Moins de temps, donc plus d’effort par mois : mais ça reste utile. » | Le simulateur garde 100 € par mois : « plus d’effort par mois » ne se voit pas à l’écran ; ponctuation « : mais » bancale | « Moins d’années devant toi, donc un capital plus petit. Chaque euro placé travaille quand même. » | gênant |
| src/lesson/discovery/investir.ts:69 | « Commencer tôt, c’est le meilleur cadeau à te faire. » | Légère pression, superlatif | « Commencer tôt, c’est laisser plus de temps au temps. » | cosmétique |
| src/lesson/discovery/investir.ts:46 | « 5 % par an est une hypothèse, rien n’est garanti en bourse » | Il manque frais et impôts, qui réduisent le résultat | « 5 % par an est une hypothèse, avant frais et impôts. Rien n’est garanti en bourse » | cosmétique |
| src/lesson/discovery/investir.ts:114 | « Parce qu’il répartit ton argent sur des milliers d’entreprises » | Seule réponse plausible (les deux autres sont absurdes) : se devine | Mauvaise réponse plus crédible : « Parce qu’il ne contient que des grandes entreprises qui ne font pas faillite » | cosmétique |
| src/lesson/discovery/crypto.ts:92, 97 | Léo : « J’ai trouvé une nouvelle crypto, elle va faire fois 10 cette année. » Bonne réponse : « Je veux bien tenter, mais seulement une petite somme que je peux perdre. » | La « bonne » réponse valide l’achat d’une crypto inconnue vantée par un proche avec une promesse de ×10, schéma typique d’arnaque. Ça ressemble à un feu vert à l’achat | Bonne réponse : « Une promesse de ×10, je me méfie. Je regarde d’abord ce que c’est, et je n’y mettrais jamais plus que ce que je peux perdre. » Réaction : « Pas bête. Les promesses trop belles, c’est souvent là que ça coince. » | important |
| src/lesson/discovery/crypto.ts:88 | « Personne ne sait ce qu’une crypto fera. Mets-y seulement ce que tu peux perdre. » | Impératif « Mets-y » : pousse à mettre de l’argent | « Personne ne sait ce qu’une crypto fera. Si un jour tu en achètes, ce sera seulement ce que tu peux perdre. » | gênant |
| src/lesson/discovery/crypto.ts:49 | « Tu en sais plus que la moitié des gens qui en achètent. » | Affirmation chiffrée invérifiable | « Tu viens d’éviter quatre idées reçues sur la crypto. » | cosmétique |
| src/lesson/discovery/crypto.ts:92 | « elle va faire fois 10 » | Écrit oral, se lit mal | « elle va faire ×10 cette année » | cosmétique |
| src/lesson/discovery/crypto.ts:123 | « Portefeuille » = « L’outil qui garde tes clés d’accès à tes cryptos » | Même mot que la page Portefeuille de l’app (outils/portefeuille), qui veut dire autre chose | « Portefeuille crypto (wallet) » | cosmétique |
| src/lesson/discovery/logement.ts:31 | « La moitié du prix en plus, juste pour avoir emprunté. » | C’est la moitié de la somme empruntée, pas du prix du logement | « La moitié de la somme empruntée en plus, juste en intérêts. » | cosmétique |
| src/lesson/discovery/logement.ts:75 | « Une fois ton offre acceptée, le compromis t’engage, puis tu deviens propriétaire… » | Imprécis : tu as 10 jours pour te rétracter, et le compromis tombe si tu n’obtiens pas ton prêt. L’étape « obtenir le prêt » manque dans l’ordre | « Une fois ton offre acceptée, tu signes le compromis : tu as 10 jours pour te rétracter, et il tombe si la banque refuse ton prêt. Tu deviens propriétaire le jour de l’acte chez le notaire. » (éventuellement ajouter l’étape « Obtenir ton prêt » avant l’acte) | gênant |
| src/lesson/discovery/logement.ts:64 | « Plus court, chaque mois pèse plus, mais tu paies beaucoup moins d’intérêts. » | Seule réplique, affichée même quand le curseur revient à 25 ans | Deux plages : jusqu’à 20 ans « Plus court : chaque mois pèse plus, mais tu paies beaucoup moins d’intérêts. » ; 21 à 25 ans « Plus long : des mensualités plus douces, et beaucoup plus d’intérêts. » | cosmétique |
| src/lesson/discovery/logement.ts:100 | « Emprunter sur une durée plus courte, si la mensualité reste supportable » | Seule réponse nuancée et la plus longue : se devine | Nuancer une mauvaise réponse : « Emprunter plus longtemps pour garder de la marge chaque mois » | cosmétique |
| src/lesson/discovery/logement.ts:91 | « Avec ça, tu peux économiser des dizaines de milliers d’euros. » | Formulation proche d’une promesse de gain | « Sur un crédit comme celui-ci, ça fait des dizaines de milliers d’euros d’intérêts en moins. » | cosmétique |
| src/lesson/formulas.ts:94 (simulateur du crédit) | Bornes de la courbe « Aujourd’hui » … « 25 ans » | « 25 ans » se lit comme un âge | « dans 25 ans » | cosmétique |
| src/lesson/discovery/impots.ts:80 et 104-105 | Vrai/faux : « Une grande partie du don peut être déduite de ton impôt. » ; même leçon, appariement : « Déduction : une somme retirée de ton revenu imposable » | Ajout à l’audit précédent : la leçon se contredit d’un écran à l’autre (elle enseigne la différence déduction / réduction puis l’emploie mal). Et la réduction ne sert que si tu paies de l’impôt | « Si tu paies de l’impôt, 66 % du don en sont retirés : c’est une réduction d’impôt, dans la limite de 20 % de ton revenu imposable. » | important |
| src/lesson/discovery/impots.ts:36 | « Beaucoup refusent une augmentation par peur de changer de tranche. C’est une erreur : tu gardes toujours la plus grosse partie. » | « C’est une erreur » juge les gens ; « toujours » trop absolu (aides et seuils de revenus) | « Beaucoup ont peur de changer de tranche. Pour l’impôt, rassure-toi : tu gardes la plus grosse partie de ce que tu gagnes en plus. » | gênant |
| src/lesson/discovery/impots.ts:48 | « Au total, d’impôt en plus pour 2 000 € de prime » | La question parle de 2 000 € de revenu imposable en plus, pas d’une prime de 2 000 € (une prime de 2 000 € brut ajoute nettement moins au revenu imposable, après cotisations et abattement de 10 %) | « Au total, d’impôt en plus pour 2 000 € de revenu imposable en plus » | cosmétique |
| src/lesson/discovery/impots.ts:118 | « Ses 11 000 premiers euros ne sont pas taxés, les suivants le sont à 11 %. » | Incomplet : on ne dit pas que les 10 000 derniers sont à 30 % | « Ses 11 000 premiers euros ne sont pas taxés, les 19 000 suivants le sont à 11 %, et seuls les 10 000 derniers à 30 %. Son taux moyen : environ 12,7 %. » | cosmétique |
| src/lesson/discovery/impots.ts:120 | « Avec ce barème, Léa gagne 40 000 €. » | « gagne » : salaire ou revenu imposable ? Le barème s’applique au revenu imposable ; « ce barème » renvoie à l’écran 1 | « Avec le barème simplifié du début, Léa a un revenu imposable de 40 000 €. Son taux moyen est-il aussi de 30 % ? » | cosmétique |
| src/lesson/discovery/impots.ts:95 | « Ces quatre mots, et ta feuille d’impôts devient lisible. » | Le document s’appelle « avis d’impôt » | « Avec ces quatre mots, ton avis d’impôt devient lisible. » | cosmétique |
| src/lesson/discovery/impots.ts:114 | « Exactement. Et c’est ça qui compte vraiment. » | Vague : on ne sait pas ce qui compte | « Exactement : ton taux moyen, c’est ce que tu paies vraiment. » | cosmétique |
| src/lesson/discovery/impots.ts:23 | « Barème simplifié : 0 % jusqu’à 11 000 €, 11 % jusqu’à 30 000 €, 30 % au-delà. » | Simplification annoncée, donc acceptable. Le vrai barème 2026 (11 600 / 29 579 €) donnerait 490 € et non 410 € | Facultatif : garder, ou passer au vrai barème (« 0 % jusqu’à 11 600 €, 11 % jusqu’à 29 579 €, 30 % au-delà », réponse 490 €) | cosmétique |

### Points de l’audit précédent : état actuel et phrase de remplacement

| Endroit | Texte actuel | État | Proposition |
|---|---|---|---|
| src/lesson/discovery/impots.ts:12, 14 | « Changer de [tranche] ne fait jamais perdre d’argent » ; accroche « Pourquoi une prime ne fait jamais perdre d’argent » | Toujours présent (aides, décote et seuils de revenus peuvent coûter plus que la prime) | Accroche : « Pourquoi changer de tranche ne fait pas fondre ta prime ». À retenir : « Changer de [tranche] ne te fait pas payer plus d’impôt sur tout ton revenu ; seule la partie au-dessus du [seuil] est taxée plus. » |
| src/lesson/discovery/crypto.ts:78 | « Quand tu revends avec un gain, il est imposé. » | Toujours présent (il manque le seuil de 305 €, le taux et l’échange crypto contre crypto, qui n’est pas imposé) | « Quand tu revends contre des euros avec un gain, il est imposé à 31,4 %, sauf si tes ventes de l’année ne dépassent pas 305 €. » |
| src/lesson/discovery/crypto.ts:40 | « 1 000 € placés au sommet en valaient un an plus tard environ » 240 € | Toujours présent (dollars convertis comme des euros) | « 1 000 $ placés au sommet en valaient un an plus tard environ » 240 $ (ou garder les euros avec 250 €) |
| src/lesson/discovery/investir.ts:80, logement.ts:72, decouvrir.ts:55 | « Presque. … » | Toujours présent : affiché même si tout l’ordre est faux | investir : « Pas encore. Plus ton argent est réparti, moins il est risqué. » ; logement : « Pas tout à fait. Tout commence par l’apport, et tout finit chez le notaire. » ; decouvrir : « Pas tout à fait. Pense à ce qu’on retire à chaque étape. » (ou garder « Presque » seulement si une seule paire est inversée) |
| src/lesson/discovery/decouvrir.ts:21-46 | « 1 660 € » | Toujours présent ; ajout : ce qui est faux, c’est surtout le coût employeur de 3 055 € (voir plus haut) | Voir la ligne « important » sur decouvrir.ts:12 |
| src/lesson/discovery/index.ts:107 | « … Moi, c’est Val. Et toi ? » (étape du pseudo) | Toujours présent : c’est une des présentations de Val | Si Val s’est déjà présenté à l’accueil : « … on commencera par l’univers {univers}. Et toi, comment je t’appelle ? » |

---

# 1. Textes de l’app (hors leçons découvertes)

## 1 A. Écrans : app/ et src/screens/

Périmètre : tous les fichiers de `app/` (42 fichiers, presque tous de simples routes ; seul `app/+not-found.tsx` porte du texte, sans problème) et de `src/screens/` (38 écrans), lus en entier. Je n'ai relevé que les chaînes réellement affichées ou lues par VoiceOver. Les textes qui viennent des composants ou des utilitaires (`src/components`, `src/utils`, `src/lesson`) sont hors périmètre ; je les signale seulement quand l'écran les assemble mal.

Note de style : `sectionLabel` applique déjà `textTransform: 'uppercase'` (Style.ts:445). Les capitales visibles des intitulés de section sont donc voulues ; seules celles écrites en dur dans le code sont relevées (voir la ligne « capitales en dur »).

### 1 A.1 Première ouverture, inscription, connexion

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/screens/header/LoginScreen.tsx:84 | « Content de te revoir. Ta série t’attend. » | Masculin implicite (« Content »). Pression sur la série, et c'est faux si la personne n'a aucune série en cours. | « Te revoilà ! On reprend où on en était ? » | important |
| src/screens/onboarding/SignupScreen.tsx:377-378 | « Les notifications sont coupées pour Valtheria. Tu peux les autoriser dans les réglages du téléphone, puis choisir ton heure dans ton profil. » | Information fausse : l'heure du rappel se règle dans Réglages (SettingsScreen.tsx:188, `ReminderSettingRow`), pas dans le profil. | « Les notifications sont coupées pour Valtheria. Autorise-les dans les réglages du téléphone, puis choisis ton heure dans Réglages. » | important |
| src/screens/onboarding/SignupScreen.tsx:293 | `Dernière étape, ${prénom ou pseudo}` | Faux : l'étape du compte est suivie de l'étape du rappel (StepHeader affiche « 2 sur 3 » ou « 1 sur 2 »). | `On crée ton compte, ${prénom}` | gênant |
| src/screens/onboarding/SignupScreen.tsx:283 | « Comment Val doit t’appeler ? » | Question sans inversion (registre oral). Val parle de lui à la troisième personne juste sous sa propre bulle (« Moi, c’est Val »). Et on demande un pseudo, pas un prénom. | « Choisis ton pseudo » | gênant |
| src/screens/onboarding/SignupScreen.tsx:296 | « Pour garder ta série sur tous tes appareils. » | La série est la seule raison donnée pour créer un compte : levier de la peur de perdre. | « Pour retrouver ta progression sur tous tes appareils. » | gênant |
| src/screens/onboarding/DiscoveryEndScreen.tsx:369 et 371 | « Garder ma série » / « Crée ton compte gratuitement pour la garder. » | Même levier (perte de la série). Le bouton ne dit pas qu'il mène à la création d'un compte. | Bouton : « Créer mon compte ». Sous-texte : « C’est gratuit : ta série et ta progression te suivent partout. » | gênant |
| src/screens/onboarding/DiscoveryEndScreen.tsx:355 (et libellé VoiceOver :350) | « Des vraies leçons t’y attendent » | Faute : devant un adjectif au pluriel, on écrit « de » (« de vraies leçons »). Laisse aussi entendre que la leçon découverte n'en était pas une. | « D’autres leçons t’y attendent » | gênant |
| src/screens/onboarding/DiscoveryEndScreen.tsx:411 | « Tu en sais déjà plus que beaucoup de monde sur l’argent. » | Flatterie invérifiable après six leçons d'une minute. | « Six sujets découverts : tu as déjà de bonnes bases. » | cosmétique |
| src/screens/onboarding/SignupScreen.tsx:344 | « Me connecter » | Incohérent avec « Se connecter » (LoginScreen.tsx:201) pour la même action. | « Me connecter » partout (boutons à la première personne, comme « Créer mon compte »), ou « Se connecter » partout | cosmétique |
| src/screens/header/LoginScreen.tsx:202 | « Pas encore de compte ? Créer un compte » | Incohérent avec « Créer mon compte » (SignupScreen.tsx:352). | « Pas encore de compte ? Créer mon compte » | cosmétique |

### 1 A.2 Apprendre, révision, carnet

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/screens/notebook/NotebookQuizScreen.tsx:67 ; src/screens/revision/RevisionScreen.tsx:447 | `${correct} bonnes réponses sur ${total}` (accessibilityLabel) | Pas d'accord au singulier : VoiceOver lit « 0 bonnes réponses », « 1 bonnes réponses ». | « Aucune bonne réponse sur 5 » / « 1 bonne réponse sur 5 » / « 3 bonnes réponses sur 5 » | cosmétique |
| src/screens/apprendre/UniverseScreen.tsx:100 ; src/screens/apprendre/ModuleScreen.tsx:341 | « Retour aux modules » | Le bouton mène à l'accueil d'Apprendre (`router.replace('/apprendre')`), pas à une liste de modules. | « Retour à l’accueil » | cosmétique |
| src/screens/apprendre/UniverseScreen.tsx:99 | « Cet univers n'est plus disponible. » | Apostrophe droite. | « Cet univers n’est plus disponible. » | cosmétique |
| src/screens/apprendre/ModuleScreen.tsx:340 | « Ce module n'est plus disponible. » | Apostrophe droite. | « Ce module n’est plus disponible. » | cosmétique |
| src/screens/revision/RevisionScreen.tsx:340 | « Impossible d’enregistrer ta révision : le serveur ne répond pas, ou la session a expiré. » | « La session a expiré » est du jargon technique. | « Impossible d’enregistrer ta révision pour l’instant. Réessaie dans un instant. » | cosmétique |

### 1 A.3 Dictionnaire

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/screens/dictionary/DictionaryHomeScreen.tsx:290 | `${n} mots de l'argent, expliqués simplement` | Apostrophe droite, dans le sous-titre de l'onglet (très visible). | `${n} mots de l’argent, expliqués simplement` | cosmétique |
| src/screens/dictionary/DictionaryHomeScreen.tsx:67 | « Aucun mot vu en attente : ouvre une fiche pour commencer. » | « Vu en attente » est obscur. Le filtre s'appelle « Vus ». | « Aucun mot à retravailler : ouvre une fiche pour en découvrir un. » | cosmétique |
| src/screens/dictionary/DictionaryHomeScreen.tsx:271 | « Tout » (filtre de catégories) | Juste à côté, le filtre d'état dit « Tous » (utils/wordStates.ts:122). Deux mots pour la même idée. | « Tous » dans les deux rangées | cosmétique |
| src/screens/dictionary/TermScreen.tsx:207 | « Ce mot n'est pas (ou plus) dans le dictionnaire. » | Apostrophe droite. | « Ce mot n’est pas (ou plus) dans le dictionnaire. » | cosmétique |

### 1 A.4 Outils : patrimoine, portefeuille, budget, épargne

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/screens/patrimoine/PatrimoineScreen.tsx:197 | « Suivre ton patrimoine, c’est voir où va ton argent, et le faire grandir. » | Promesse de gain implicite : suivre son patrimoine ne le fait pas grandir. Cette phrase est juste au-dessus de « Valtheria ne donne pas de conseil en investissement. » | « Suivre ton patrimoine, c’est voir d’un coup d’œil où en est ton argent. » | important |
| src/screens/OutilsScreen.tsx:19 ; src/screens/patrimoine/PatrimoineScreen.tsx:195 et 261 | « Portefeuille » (tuile) puis « Mon patrimoine » (titre de l'écran ouvert) | La même entrée porte deux noms. L'ancien écran (PortefeuilleScreen.tsx:110) s'appelle encore « Portefeuille ». | Un seul nom : « Mon patrimoine » sur la tuile et sur l'écran | gênant |
| src/screens/OutilsScreen.tsx:21 | « Suis tes positions et leur évolution » | « Positions » est du jargon de courtier, sans explication. | « Suis tes placements et leur évolution » | gênant |
| src/screens/OutilsScreen.tsx:26 ; src/screens/CashflowScreen.tsx:62 et 114 ; src/screens/EpargneScreen.tsx:128 | « Cash-flow » | Anglicisme, alors que l'écran affiche déjà « Reste à vivre » (CashflowScreen.tsx:126). | « Mon budget » (tuile et titre), « Entrées et sorties du mois » (sous-titre) | gênant |
| src/screens/PortefeuilleScreen.tsx:127 et 136 | `{gain_loss_pct.toFixed(2)}%` / `{daily_change_pct.toFixed(2)}%` | Affiche « +3.25% » : point décimal à l'anglaise, sans espace insécable avant %. | Formater en français : « +3,25 % » (`toLocaleString('fr-FR')` puis ` %`) | gênant |
| src/screens/EpargneScreen.tsx:128 | « Renseigne ton épargne dans le cash-flow pour suivre ta marge. » | Anglicisme, et « marge » reste vague. | « Indique ce que tu mets de côté chaque mois dans ton budget : tu verras ce qu’il te reste à répartir. » | gênant |
| src/screens/patrimoine/AnalyseScreen.tsx:126 | « Le profil suit la part à risque élevé. » | Phrase obscure, sans sujet clair. | « Ton profil dépend de la part de ton patrimoine placée sur des actifs à risque élevé. » | gênant |
| src/screens/patrimoine/AssetSearchScreen.tsx:138 et 176 ; src/screens/patrimoine/OperationScreen.tsx:396 | « PLACEMENTS SANS COURS » / « Pour un actif sans cours… » / « Sa valeur n’a pas de cours… » | Dans une app de leçons, « cours » se lit d'abord comme « leçon ». Ici c'est du jargon (cotation). | « Placements sans prix de marché » / « Pour ce qui n’a pas de prix de marché : un livret, un bien immobilier, un objet de valeur. » | gênant |
| src/screens/patrimoine/OperationScreen.tsx:377 | « Le montant total aujourd’hui. Un versement compte pour ta régularité. » | Première phrase sans verbe. La seconde est obscure et transforme l'épargne en jeu (incitation). | « Indique le montant total sur ton livret aujourd’hui. Chaque versement apparaît dans ton suivi. » | gênant |
| src/screens/patrimoine/OperationScreen.tsx:396 | « Sa valeur n’a pas de cours : tu la mets à jour à la main, quand tu veux. » | Formulation fautive : une valeur n'a pas de cours. | « Ce bien n’a pas de prix de marché : tu mets sa valeur à jour à la main, quand tu veux. » | cosmétique |
| src/screens/patrimoine/ObjectifScreen.tsx:134 (champ Montant) avec 115-124 (champ Nom) | « Donne un nom à ton objectif. » (message de validateGoal) | Le message d'erreur sur le nom s'affiche sous le champ « Montant à atteindre » : seul ce champ reçoit `error`. | Afficher l'erreur sous le champ concerné : nom → champ Nom, montant → champ Montant | cosmétique |
| src/screens/patrimoine/AnalyseScreen.tsx:82 | « La répartition par zone géographique arrivera quand le site saura dire où chaque actif est investi. » | On est dans l'app, pas sur « le site ». | « La répartition par zone arrive bientôt : il faut d’abord savoir où chaque actif est investi. » | cosmétique |
| src/screens/patrimoine/OperationScreen.tsx:306 | `Quantité (parts)` | Pour une action, « parts » est imprécis : on détient des actions, pas des parts. | « Quantité » seul, ou « Quantité (titres) » | cosmétique |
| src/screens/CashflowScreen.tsx:160 | « Aucune entrée dans cette catégorie. » | Les onglets sont Revenus / Dépenses / Épargne, pas des catégories. « Catégorie » désigne déjà les postes de dépense (CategoryBreakdown). | « Rien de noté ici pour ce mois. » | cosmétique |
| src/screens/EpargneScreen.tsx:122 et 134 | « Affecté aux objectifs » / « Dépassement de X € — tu affectes plus que ton épargne disponible. » | « Affecter » est un jargon comptable, et le ton est sec. | « Prévu pour tes objectifs » / « Tu as prévu X € de plus que ce que tu mets de côté chaque mois. » | cosmétique |
| src/screens/PortefeuilleScreen.tsx:87 et 133 ; src/screens/CashflowScreen.tsx:82 | « Impossible d'ajouter la position. » / « Aujourd'hui » / « Impossible d'ajouter l'entrée. » | Apostrophes droites. | « Impossible d’ajouter la position. » / « Aujourd’hui » / « Impossible d’ajouter l’entrée. » | cosmétique |

### 1 A.5 Réglages, profil

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/screens/header/SettingsScreen.tsx:132 | Alerte « Supprimer le compte » : « Cette action est définitive. Confirmer ? » | Message sec, qui ne dit pas ce qui sera perdu. Le titre diffère de la ligne « Supprimer mon compte » (:204). | Titre : « Supprimer ton compte ? ». Message : « Ta progression, ta série et ton carnet seront effacés pour de bon. » Boutons : « Annuler » / « Supprimer » | gênant |
| src/screens/header/ProfilScreen.tsx:135 ; SettingsScreen.tsx:187 ; src/screens/patrimoine/ObjectifScreen.tsx:86 | « Ton objectif » | Un même libellé pour deux notions : l'objectif d'apprentissage (profil, réglages) et l'objectif d'épargne (patrimoine). | Profil et réglages : « Ce qui t’amène » ou « Ton sujet ». Patrimoine : « Ton objectif d’épargne » | gênant |
| src/screens/header/SettingsScreen.tsx:83 | « Échec de la mise à jour. » | Message froid et impersonnel. | « Je n’ai pas pu changer ton pseudo. Réessaie dans un instant. » | cosmétique |
| src/screens/header/SettingsScreen.tsx:143 | Alerte titrée « Erreur » | Titre générique. | « Suppression impossible » | cosmétique |
| src/screens/header/SettingsScreen.tsx:171 et 200 | Sections « Compte » puis « Données et compte » | Le mot « compte » sert à deux sections. | « Compte » puis « Tes données » | cosmétique |

### 1 A.6 Erreurs brutes et accessibilité (VoiceOver)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/screens/ArticleScreen.tsx:110-122 ; src/screens/ArticleDetailScreen.tsx:137-150 | Boutons étoile (favori) et marque-page (à lire plus tard) | Ni accessibilityLabel, ni rôle, ni état : VoiceOver n'annonce rien d'utile. | Libellés « Ajouter aux favoris » / « Retirer des favoris » et « Lire plus tard » / « Retirer de ma liste », avec `accessibilityRole="button"` et `accessibilityState={{ selected }}` | important |
| src/screens/PortefeuilleScreen.tsx:107-108 ; src/screens/EpargneScreen.tsx:80-81 ; src/screens/CashflowScreen.tsx:111-112 | Bouton retour `‹` | Un caractère seul, sans libellé ni rôle : VoiceOver lit au mieux « ‹ ». | Utiliser BackButton (comme les autres écrans), ou ajouter `accessibilityLabel="Retour"` et `accessibilityRole="button"` | important |
| PortefeuilleScreen.tsx:67, 87, 96 ; EpargneScreen.tsx:49, 68 ; CashflowScreen.tsx:62, 82, 91 ; ArticleScreen.tsx:36 ; ArticleDetailScreen.tsx:42 ; SettingsScreen.tsx:83, 120, 143 ; patrimoine/ActifScreen.tsx:117 ; patrimoine/OperationScreen.tsx:235 | `err.message \|\| '…'` | Le message brut du serveur est affiché tel quel (souvent technique ou en anglais : « Network request failed », « Unauthenticated. »). | Toujours afficher le texte de l'app, par exemple « Impossible de charger tes données pour l’instant. Réessaie dans un instant. », et garder err.message pour les journaux | gênant |
| src/screens/ArticleScreen.tsx:51-53 ; src/screens/ArticleDetailScreen.tsx:63 | (aucun texte) | Toucher l'étoile sans être connecté ouvre la connexion sans un mot d'explication. | Bulle ou toast : « Connecte-toi pour garder tes articles favoris. » | gênant |
| src/screens/OutilsScreen.tsx:58-91 ; src/screens/ArticleScreen.tsx:95 | Cartes d'outils (« 📈 Portefeuille Suis tes positions… › ») et cartes d'articles | Pressable sans rôle ni libellé : VoiceOver lit l'émoji (« graphique en hausse ») et le chevron, sans dire que c'est un bouton. | `accessibilityRole="button"`, `accessibilityLabel="Portefeuille. Suis tes placements et leur évolution"`, émoji et chevron masqués | gênant |
| src/screens/EpargneScreen.tsx:176-178 | « Supprimer » | Bouton sans rôle, qui ne dit pas ce qu'il supprime, et supprime sans confirmation. | `accessibilityLabel="Supprimer l’objectif {nom}"`, plus une confirmation | cosmétique |
| NotebookQuizScreen.tsx:51 « MES DÉCLICS » ; WordTestScreen.tsx:78 « TESTE-TOI » et :120 « MAÎTRISÉ » ; RevisionScreen.tsx:262 et 420 « RÉVISION » ; ApprendreDetailScreen.tsx:699 « LEÇON DÉCOUVERTE » ; AssetSearchScreen.tsx:138 et 173 ; AnalyseScreen.tsx:156 ; ActifScreen.tsx:329 ; OperationScreen.tsx:456 ; PatrimoineScreen.tsx:368, 390, 420 ; DiscoveryEndScreen.tsx:320 ; NotebookScreen.tsx:55 (`toUpperCase()`) | Capitales en dur | Le style met déjà en capitales (`textTransform`). Le texte source en majuscules est ce que lit VoiceOver, qui épelle parfois les mots courts. Les autres intitulés (« Mes mots », « Tes univers ») sont en casse normale. | Écrire en casse normale (« Mes déclics », « Placements sans prix de marché », « Tes opérations »…) et laisser le style mettre en capitales | cosmétique |

### 1 A. Points de l’audit précédent (écrans)

Dans mon périmètre, seuls les trois points ci-dessous sont encore présents. Les autres (« Presque. », « Tout près », QuitSheet, « toutes les leçons sont à toi », « tu t’étais arrêté », « Prêt pour la suite ? », notifications, impots.ts, crypto.ts, « 1660 € », « Meilleure série », « Tu peux le couper à tout moment dans ton profil ») sont introuvables dans `app/` et `src/screens/` : ils vivent dans les composants et les données. À noter : SignupScreen.tsx:378 reprend la même erreur « dans ton profil », relevée plus haut comme nouvelle.

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/screens/PortefeuilleScreen.tsx:74 ; src/screens/EpargneScreen.tsx:56 ; src/screens/CashflowScreen.tsx:69 | « Tu dois être connecté. » | Masculin implicite, ton injonctif, et aucun bouton pour se connecter. | « Connecte-toi pour retrouver ton portefeuille. » (ou « … ton budget. », « … tes objectifs. »), avec un bouton « Me connecter » | gênant |
| src/screens/patrimoine/AssetSearchScreen.tsx:127 | « Nom, symbole ou ISIN (ex. Solana, CW8, LVMH) » | Cite des titres précis, ce qui revient à un exemple d'achat. « ISIN » n'est pas expliqué. | « Nom, symbole ou code ISIN » | important |
| src/screens/onboarding/WelcomeScreen.tsx:30 ; src/screens/onboarding/FirstNameScreen.tsx:18 ; src/screens/onboarding/SignupScreen.tsx:280 | « Salut ! Moi, c’est Val. » / « Salut ! Moi, c’est Val. Et toi, comment je t’appelle ? » / « Moi, c’est Val. Et toi ? » | Val se présente trois fois dans le même parcours. | Garder Welcome. Prénom : « Et toi, comment je t’appelle ? ». Inscription : « Choisis le pseudo qui te ressemble. » | gênant |

### 1 A. Lexique relevé (écrans)

| Notion | Appellations et endroits |
|---|---|
| Série | « Ta série t’attend » (LoginScreen.tsx:84) ; « garder ta série » (SignupScreen.tsx:296) ; « Garder ma série » / « pour la garder » (DiscoveryEndScreen.tsx:369, 371) ; « jours de série » (DiscoveryEndScreen.tsx:390). Chiffres de série passés aux composants StatBand, StatPills et StreakSheet (ProfilScreen.tsx:131, ModuleScreen.tsx:444, ApprendreHomeScreen.tsx:183). Le mot « streak » n'apparaît jamais à l'écran. |
| XP, niveau | « Niveau N » et « · encore N XP » (ProfilScreen.tsx:123, 126). Pas d'autre texte XP en dur dans le périmètre. |
| Vals | Aucune chaîne visible dans le périmètre (seulement des props `vals` vers StatBand et StatPills). |
| Patrimoine / portefeuille | Tuile « Portefeuille » (OutilsScreen.tsx:19), titre « Portefeuille » ou nom serveur (PortefeuilleScreen.tsx:110). « Mon patrimoine » (PatrimoineScreen.tsx:195, 261). « ton patrimoine » (ObjectifScreen.tsx:137, ActifScreen.tsx:131, AnalyseScreen.tsx:122). |
| Position, actif, bien, livret, relevé, opération | « positions » (OutilsScreen.tsx:21 ; PortefeuilleScreen.tsx:160, 164, 167 ; PatrimoineScreen.tsx:390, 420 ; ActifScreen.tsx:207, 225 ; OperationScreen.tsx:460, 466). « actif » (AssetSearchScreen.tsx:120 ; AnalyseScreen.tsx:85, 121 ; PatrimoineScreen.tsx:198 ; OperationScreen.tsx:271). « bien » (OperationScreen.tsx:192, 241). « relevé » (PatrimoineScreen.tsx:438, 441). « Noter une opération » (ActifScreen.tsx:368, PatrimoineScreen.tsx:246, OperationScreen.tsx:241). |
| Cours (prix de marché) | « Cours figé », « dernier cours connu » (ActifScreen.tsx:195) ; « Pas de cours disponible » (ActifScreen.tsx:256) ; « sans cours » (AssetSearchScreen.tsx:138, 176) ; « cours actuel » (OperationScreen.tsx:330). Risque de confusion avec cours = leçon. |
| Budget | « Cash-flow » (OutilsScreen.tsx:26 ; CashflowScreen.tsx:62, 114 ; EpargneScreen.tsx:128) ; « Reste à vivre » (CashflowScreen.tsx:126) ; Revenus, Dépenses, Épargne (CashflowScreen.tsx:134-136). |
| Épargne, objectifs | « Épargne » (OutilsScreen.tsx:33, EpargneScreen.tsx:83) ; « Épargne mensuelle » (EpargneScreen.tsx:114) ; « Objectifs » côté serveur (EpargneScreen.tsx:149, 102) ; « Épargne de précaution », « Ton objectif », « Nouvel objectif » côté téléphone (ObjectifScreen.tsx:86). Deux systèmes d'objectifs d'épargne distincts. |
| Objectif d'apprentissage | « ce qui t’amène » (ObjectiveScreen.tsx:90) ; « Ton objectif » (ProfilScreen.tsx:135, SettingsScreen.tsx:187) ; « Changer d’objectif », « six objectifs » (ProfilScreen.tsx:147-148) ; ailleurs « six sujets » / « Sujets découverts » (DiscoveryEndScreen.tsx:318, 320, 406). |
| Rappel | Rappel quotidien : « Activer mon rappel » (GuestReminderScreen.tsx:73, SignupScreen.tsx:385) ; « Me rappeler demain » (DiscoveryEndScreen.tsx:375). Ailleurs, « N rappels » désigne des rappels d'épargne (EpargneScreen.tsx:87) : même mot, autre notion. |
| Inscription / compte | « sans inscription » (WelcomeScreen.tsx:152) ; « Les inscriptions ouvrent très bientôt » (SignupScreen.tsx:264) ; « Créer mon compte » (SignupScreen.tsx:352) ; « Créer un compte » (LoginScreen.tsx:202) ; « Crée ton compte » (DiscoveryEndScreen.tsx:371) ; « J’ai déjà un compte » (WelcomeScreen.tsx:154, SignupScreen.tsx:270) ; « Supprimer mon compte » (SettingsScreen.tsx:204) et « Supprimer le compte » (SettingsScreen.tsx:132). |
| Connexion | « Connexion » (LoginScreen.tsx:86) ; « Se connecter » (LoginScreen.tsx:201, SettingsScreen.tsx:203 pour « Se déconnecter ») ; « Me connecter » (SignupScreen.tsx:344) ; « connecte-toi » (SignupScreen.tsx:261). |
| Prénom / pseudo | « Ton prénom » (FirstNameScreen.tsx:70) ; « Ton pseudo » (SignupScreen.tsx:233, SettingsScreen.tsx:216, 219) ; « Pseudo » (SettingsScreen.tsx:172). |
| Leçon | « Leçon découverte » (ApprendreDetailScreen.tsx:699-700, ProfilScreen.tsx:163, SignupScreen.tsx:261) ; « Prochaine leçon » (ProfilScreen.tsx:158) et « Leçon suivante » (ModuleScreen.tsx:385) ; « Leçon indisponible » (ApprendreDetailScreen.tsx:647) et « Leçons indisponibles » (ApprendreHomeScreen.tsx:243, UniverseScreen.tsx:93, ModuleScreen.tsx:333). |
| Module | « modules » / « module » (UniversesScreen.tsx:78) ; « Modules » (ApprendreHomeScreen.tsx:325) ; « Module terminé ! » (ModuleScreen.tsx:376) ; « Choisir mon prochain module » (ModuleScreen.tsx:378) ; « Guide du module » (ModuleScreen.tsx:468) ; « Retour aux modules » (UniverseScreen.tsx:100, ModuleScreen.tsx:341). |
| Univers | « Tous les univers » (UniversesScreen.tsx:103) ; « Tes univers », « Tout voir » (ApprendreHomeScreen.tsx:304, 307) ; « Univers terminé ! », « Univers suivant » (ProfilScreen.tsx:173, 175) ; « La suite : univers X » (DiscoveryEndScreen.tsx:353). « Chapitre » n'apparaît jamais. |
| Révision | « Révision du jour » (RevisionScreen.tsx:143, 441) ; pastille « RÉVISION » (RevisionScreen.tsx:262, 420) ; « ta révision » (WordTestScreen.tsx:124, 133 ; RevisionScreen.tsx:50, 176, 186). |
| Carnet, déclic | « Ton carnet » (NotebookScreen.tsx:39, ProfilScreen.tsx:198) ; « Me tester sur mes déclics » (NotebookScreen.tsx:84) ; « MES DÉCLICS » (NotebookQuizScreen.tsx:51) ; « Revoir mon carnet », « Refaire le test » (NotebookQuizScreen.tsx:74-75) ; « déclic » ou « déclics » (ProfilScreen.tsx:197). |
| Mots du dictionnaire | « Mes mots » = étoile (TermScreen.tsx:314, DictionaryHomeScreen.tsx:233). Sur les articles, l'étoile veut dire favori (ArticleScreen.tsx:118) : même icône, deux notions. « Vu », « Maîtrisé », « À découvrir » (TermScreen.tsx:79 ; WordTestScreen.tsx:120 ; DictionaryHomeScreen.tsx:66-68). « Dictionnaire » avec une majuscule (ProfilScreen.tsx:220, 227) contre « le dictionnaire » en minuscule (TermScreen.tsx:196, 207). |
| Réglages / profil | « Réglages » (LoginScreen.tsx:152, ProfilScreen.tsx:108, SettingsScreen.tsx:158) ; « ton profil » utilisé à tort pour les réglages (SignupScreen.tsx:378). |
| Mon / ton dans les titres | « Mon patrimoine » (PatrimoineScreen.tsx:261) à côté de « Ton carnet », « Ton objectif », « Tes positions », « Tes opérations » : mélange de première et de deuxième personne. |

## 1 B. Composants Apprendre : src/components/apprendre/

Périmètre : 67 fichiers lus en entier (end, home, module, module/path, player, screens, universe, plus LessonSkeleton, ScreenRenderer, types). Les helpers de libellés appelés depuis ces composants (src/utils/lessonPlayer.ts, accuracy.ts, streakRewards.ts, learning.ts, levels.ts, dailyProgram.ts, profile.ts) ont été ouverts pour vérifier les accords selon les valeurs ; un problème n'est relevé ici que s'il est affiché par un composant du périmètre (l'endroit de la chaîne source est alors précisé).

Vérifications sans problème : aucun vouvoiement, aucun « ... », aucun guillemet droit visible, aucun masculin implicite du type prêt, connecté, inscrit. Pas de conseil d'achat ni de promesse de gain. Les constantes `NBSP` sont bien des espaces insécables (U+00A0). Les gabarits comptés gèrent le singulier et le pluriel : « 1 paire trouvée sur 4 », « 1 erreur en chemin », « 1 bonne réponse sur 5 », « 1 jour de série ! », « 1 gel », « 1 écran · environ 1 min », « Rattraper 1 question », « 1 rattrapée ». « Série de 0 jour » et « 0 bonne réponse » sont corrects (singulier devant zéro).

### 1 B. Problèmes

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/components/apprendre/screens/FallbackScreen.tsx:21-24 | « Type d’écran pas encore géré : « {screen.type} » » suivi de `JSON.stringify(screen.payload, null, 2)` | Un écran de type non pris en charge (number, live_month, écran mal formé) affiche à l'utilisateur un message de développeur et le JSON brut du contenu. Très visible, jargon, aspect « app cassée ». | « Cet écran arrive bientôt dans l’app. Tu peux passer à la suite. » (sans JSON ; garder le JSON pour le terminal ou un mode développeur) | important |
| src/components/apprendre/player/AnswerSheet.tsx:110 (alimenté par screens/ChoiceScreen.tsx:29-33, screens/DocumentScreen.tsx:53-57, screens/OrderScreen.tsx:123) | `verdict.correctText.includes(', ') ? 'Les bonnes réponses : ' : 'La bonne réponse : '` | Le pluriel est deviné à la présence de « , » dans le texte. Une seule bonne réponse qui contient une virgule (« Oui, mais sous plafond ») s'affiche « Les bonnes réponses : … ». À l'inverse, pour un ordre (« A → B → C »), c'est « La bonne réponse » au lieu de « Le bon ordre ». | Transmettre le nombre de bonnes réponses (ou le type d'écran) dans le brouillon : « La bonne réponse : … », « Les bonnes réponses : … », « Le bon ordre : … » | gênant |
| src/components/apprendre/screens/DialogueScreen.tsx:206 | accessibilityLabel="Il écrit" | Masculin implicite : le personnage peut être une femme (Léa, Inès…). VoiceOver dit « Il écrit ». | `${character.name} écrit…` | gênant |
| src/components/apprendre/screens/SliderScreen.tsx:87 | « Fais glisser pour parier » | Le vocabulaire du pari évoque le jeu d'argent dans une app de finance. Il n'est pas non plus cohérent avec l'écran suivant, qui parle de « Ton estimation » (RevealScreen.tsx:69). | « Fais glisser pour estimer » | gênant |
| src/components/apprendre/screens/SliderScreen.tsx:70 | accessibilityLabel={screen.question ?? 'Ton pari'} | Même incohérence pari/estimation, lue par VoiceOver | 'Ton estimation' | gênant |
| src/components/apprendre/module/path/ModulePath.tsx:212-213 | « Étape ${n}, ${titre}, verrouillée » / « …, terminée » / « …, en cours » | Sur la même page, VoiceOver dit « Étape 3 », la carte affiche « LEÇON 3 SUR 5 » (LessonCard.tsx:78) et le guide dit « Leçon 3 » (ModuleGuideSheet.tsx:53) | « Leçon ${n}, ${titre}, verrouillée » | gênant |
| src/components/apprendre/module/path/ModulePath.tsx:232 | « Termine l’étape précédente pour la débloquer » | Même incohérence étape/leçon | « Termine la leçon précédente pour la débloquer » | gênant |
| src/components/apprendre/home/DailyProgram.tsx:89 | label="COMMENCER" | Capitales en dur sur un bouton dont le libellé VoiceOver est le texte lui-même (Button : accessibilityLabel={label}). Le projet note lui-même que « les capitales s'épellent parfois » (GuestLessonCard.tsx:57, qui prévoit un spokenLabel), ce qui n'est pas fait ici. | Libellé « Commencer » avec un style en capitales (textTransform), ou un libellé lu « Commencer la leçon » | gênant |
| src/components/apprendre/module/path/LessonCard.tsx:90 | label={replay ? 'REFAIRE' : 'COMMENCER'} | Même problème de capitales lues par VoiceOver | « Refaire » / « Commencer » en casse normale, capitales par le style | gênant |
| src/components/apprendre/end/LessonRecap.tsx:105-114 | tuile « XP » : `+ ${xp}` / « gagnés » ; VoiceOver « ${xp} XP gagnés » | La tuile s'affiche dès que xp n'est pas null, donc aussi à 0 (rejeu sans progrès) : « + 0 gagnés », « 0 XP gagnés ». À 1 : « 1 XP gagnés ». | N'afficher la tuile que si xp > 0 ; accorder : `${xp} XP ${xp >= 2 ? 'gagnés' : 'gagné'}` | gênant |
| src/components/apprendre/end/LessonRecap.tsx:163 | « Leçon parfaite : tout juste du premier coup » | « tout juste » peut se lire « de justesse », c'est-à-dire le contraire de ce qu'on veut dire | « Leçon parfaite : tout bon du premier coup » | gênant |
| src/components/apprendre/screens/TrueFalseScreen.tsx:377 (et :341 pour VoiceOver) | « Raté ! » | Ton plus sec que le reste du lecteur, où la feuille dit « Pas tout à fait » (AnswerSheet.tsx:98). Deux verdicts différents pour une même erreur. | « Pas cette fois ! » (ou reprendre « Pas tout à fait ») | gênant |
| src/components/apprendre/universe/ModuleLine.tsx:34 (texte de src/utils/levels.ts:187) | « 2 sur 5 leçons » | Incohérence avec la ligne de module de l'accueil (ModuleRow.tsx:24, src/utils/learning.ts:178), qui dit « 2 leçons sur 5 » | Un seul format partout : « 2 leçons sur 5 » | gênant |
| src/components/apprendre/home/StreakSheet.tsx:109 et :119 | « Bientôt disponible avec ton compte. » | Ce texte s'affiche à un compte connecté (freezes null = « compte connecté, le gel arrive bientôt »). « avec ton compte » laisse croire qu'il faut encore en créer un. | « Le gel arrive bientôt sur ton compte. » | gênant |
| src/components/apprendre/home/StreakSheet.tsx:109 vs :119 | VoiceOver « En réserve : 1 gel. » / visible « En réserve : 1 gel sur 2 » | Le libellé lu ne correspond pas au texte affiché (il manque le plafond) | VoiceOver : « En réserve : 1 gel sur 2. » | cosmétique |
| src/components/apprendre/end/ChestReveal.tsx:334 et :339 ; home/StatPills.tsx:45 | `${amount} Vals`, `+ ${montant} Vals`, `${vals} Vals` | À 1 : « + 1 Vals », « 1 Vals » (VoiceOver et texte affiché) | Accorder : « 1 Val », « 2 Vals ». Voir aussi le Lexique : « Val » est déjà le nom de la mascotte. | cosmétique |
| src/components/apprendre/screens/RevealScreen.tsx:196 (texte de src/utils/lessonPlayer.ts:134) | « Bien plus que tu pensais » / « Un peu moins que tu pensais » | Comparatif sans « ne » ni « ce que » : tournure relâchée à l'écrit | « Bien plus que ce que tu pensais » / « Un peu moins que ce que tu pensais » | cosmétique |
| src/components/apprendre/player/RetryIntro.tsx:55 | « Revoir ce qui a coincé, c’est ce qui fait le plus retenir. Ça compte dans ton bilan. » | « ce qui fait le plus retenir » est maladroit | « Revoir ce qui a coincé, c’est comme ça qu’on retient le mieux. Ça compte dans ton bilan. » | cosmétique |
| src/components/apprendre/player/RetryIntro.tsx:96 | « Réessayer sans rattraper » | Peu clair : on réessaie quoi ? (en fait, l'envoi du bilan qui a échoué) | « Renvoyer et voir le bilan » | cosmétique |
| src/components/apprendre/end/LessonEndFlow.tsx:296 | « Reviens demain pour passer à {to + 1}. » | Le nombre n'a pas d'unité (« passer à 6 » quoi ?). Le ton reste acceptable (invitation, pas de pression). | « Demain, ta série peut passer à 6 jours. » | cosmétique |
| src/components/apprendre/home/GuestState.tsx:20 | « J'ai déjà un compte » | Apostrophe droite ; la même phrase prend ’ dans GuestLessonCard.tsx:158 | « J’ai déjà un compte » | cosmétique |
| src/components/apprendre/player/AnswerSheet.tsx:98 ; end/EndFlowBoundary.tsx:49 ; end/LessonEndFlow.tsx:361 ; player/QuitSheet.tsx:26 ; home/OtherTopicSheet.tsx:38 | « Bien vu ! », « Révision terminée ! » / « Leçon terminée ! », « Module terminé ! », « Quitter la leçon ? », « Un autre sujet ? » | Espace ordinaire avant ! et ? dans des titres en gros corps : le signe peut passer seul à la ligne. Le reste du dossier utilise l'espace insécable (RetryIntro.tsx:52, TrueFalseScreen.tsx:377, ChestReveal.tsx:285-288, LessonRecap.tsx:151). | Mettre une espace insécable ( ) avant ! et ? | cosmétique |
| src/components/apprendre/end/LessonEndFlow.tsx:151 ; end/LessonRecap.tsx:83, :107, :119, :130, :162, :209 ; end/ChestReveal.tsx:81-84, :278, :320 ; home/DailyProgram.tsx:173 ; home/UniverseCarousel.tsx:93 ; module/path/LessonCard.tsx:78 ; module/path/StartBubble.tsx:74 | « RÉVISION TERMINÉE », « LEÇON TERMINÉE », « PRÉCISION », « SÉRIE », « LEÇON PARFAITE », « À RETENIR », « COMMUN / RARE / ÉPIQUE / LÉGENDAIRE », « TA RÉCOMPENSE », « UNE SURPRISE », « COFFRE SURPRISE », « SURPRISE », « 2 · LA RÉVISION », « TON OBJECTIF », « LEÇON 2 SUR 5 », « COMMENCER » | Capitales écrites en dur dans les chaînes (VoiceOver les lit telles quelles, risque d'épellation). Ailleurs, le projet passe par toUpperCase ou un libellé lu séparé. | Écrire en casse normale et mettre les capitales par le style (`textTransform: 'uppercase'`) | cosmétique |
| src/components/apprendre/end/LessonEndFlow.tsx:280 vs :309, :320, :358 ; end/ChestReveal.tsx:357 | « On continue » / « Continuer » / « Voir la suite » / « Super » | Quatre libellés différents pour le même bouton « étape suivante » dans une même cérémonie de fin | Garder « Continuer » partout (ou « On continue » partout) ; « Super » peut rester sur le coffre si c'est voulu | cosmétique |
| src/components/apprendre/home/HomeHeader.tsx:89 vs home/LearnTopBar.tsx:54 | « Mon compte » / « Mon profil » | Deux noms pour le même bouton d'avatar selon l'en-tête | « Mon profil » partout | cosmétique |
| src/components/apprendre/home/HomeHeader.tsx:117-120 | `Niveau ${level}` puis `  ${xp} XP` dans un même Text, sans accessibilityLabel | VoiceOver lit « Niveau 3  120 XP » d'un bloc : il risque de le lire comme « 3 120 » | accessibilityLabel={`Niveau ${level}, ${xp} XP`} | cosmétique |
| src/components/apprendre/module/LessonSheet.tsx:42 | `${formatXp(xp)} à gagner` → « + 20 XP à gagner » | Le « + » fait doublon avec « à gagner » | « 20 XP à gagner » | cosmétique |
| src/components/apprendre/module/LessonList.tsx:34 | `Après ${view.previousTitle}` | Un titre sans guillemets se lit mal (« Après Les bases du budget ») | « Après « Les bases du budget » » (guillemets avec espaces insécables) | cosmétique |
| src/components/apprendre/screens/OrderScreen.tsx:123 | correctText `items.join(' → ')` | VoiceOver lit « flèche vers la droite » entre chaque élément (et la feuille titre « La bonne réponse ») | Utiliser « , puis » pour le texte lu, et « Le bon ordre : » (voir la ligne AnswerSheet) | cosmétique |
| src/components/apprendre/screens/DocumentScreen.tsx:191-192 | accessibilityHint « Ligne à repérer », aussi pour une ligne déjà bien trouvée (look 'correct') | Pour une ligne que l'utilisateur a trouvée, l'indice ne dit pas que c'est juste | 'correct' : « Bonne ligne » ; 'missed' : « Ligne à repérer » | cosmétique |

### 1 B. Points de l’audit précédent (composants Apprendre)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/components/apprendre/player/QuitSheet.tsx:29 | « Tu y étais presque. Si tu pars maintenant, tu devras la recommencer depuis le début. » | Toujours présent : « Tu y étais presque » s'affiche même au premier écran (pression ou affirmation fausse) | « Si tu pars maintenant, tu reprendras cette leçon depuis le début. » | gênant |
| src/components/apprendre/screens/RevealScreen.tsx:196 (pastille) et :183 (VoiceOver), texte de src/utils/lessonPlayer.ts:130 | « Tout près : tu étais à {X} » | Toujours présent : « tu étais à 50 € » se lit comme ta valeur, pas comme l'écart | « Tout près : à {X} près » | gênant |
| src/components/apprendre/end/LessonRecap.tsx:188-191 (texte de src/utils/accuracy.ts:170) vs home/StreakSheet.tsx:78 | « Meilleure série : 5 d’affilée » (bonnes réponses) / « Meilleure série : 12 jours » (jours) | Toujours présent : « série » sert pour les jours et pour les bonnes réponses, et « 5 d’affilée » n'a pas de nom | Bilan : « Record : 5 bonnes réponses d’affilée » ; feuille de série : « Record : 12 jours » | gênant |

Les autres points de l'audit précédent (impots.ts:80, « Presque. », « toutes les leçons sont à toi », « tu t'étais arrêté », notifications, crypto.ts:40, « ex. Solana, CW8, LVMH », etc.) n'apparaissent pas dans src/components/apprendre/.

### 1 B. Lexique relevé (composants Apprendre)

- **série (jours)** : home/StatPills.tsx:34 (« Série de N jours »), home/StreakSheet.tsx:71 (« Ta série »), :74, :78, :126 (« Continuer ma série » / « Commencer ma série »), home/GuestStreakCard.tsx:76 (« Ta série : N jours »), :96 (« ta série »), end/LessonEndFlow.tsx:291 (« jours de série ! »), end/LessonRecap.tsx:130 (« SÉRIE »), :136 (« Série : N jours d’affilée »).
- **série / affilée (bonnes réponses)** : end/LessonRecap.tsx:191 (« Meilleure série : N d’affilée »), player/LessonTopBar.tsx:234 (« N bonnes réponses d’affilée »), player/AnswerSheet.tsx:119 (« + 1 bonne réponse du premier coup »).
- **flamme** : home/GuestStreakCard.tsx:76, :93 (« Allume ta flamme »).
- **gel / gel de série** : home/StreakSheet.tsx:108-119, home/GuestStreakCard.tsx:77, :102, home/StreakWeek.tsx:63 (« sauvé par un gel »).
- **médaille** : home/GuestStreakCard.tsx:84 (« tes médailles »), home/StreakSheet.tsx:90-98 (« Gagnée », « dans N jours »).
- **Vals (monnaie)** : end/ChestReveal.tsx:334, :339 (« + N Vals », « Tu en as maintenant N »), home/StatPills.tsx:45. Homonyme de **Val** (mascotte) : au singulier, « 1 Val » se confondrait avec la mascotte.
- **XP** : end/LessonRecap.tsx:107, :113 (« XP gagnés »), home/HomeHeader.tsx:119, home/GuestStreakCard.tsx:79, :115, module/LessonSheet.tsx:42 (« à gagner »), module/LessonList.tsx:47, module/path/LessonCard.tsx:96. **Niveau** : home/HomeHeader.tsx:118, home/LearnTopBar.tsx:54 (levelA11y : « encore N XP avant le niveau N+1 »). Ne pas confondre avec **niveau (de difficulté d'un univers)** : universe/LevelTabs.tsx:37, home/UniverseCarousel.tsx:77.
- **coffre / récompense** : end/ChestReveal.tsx:278 (« TA RÉCOMPENSE », « COFFRE SURPRISE »), :289 (« Un coffre pour toi »), :296, :361 (« Ouvrir le coffre ») ; raretés commun, rare, épique, légendaire (:81-84).
- **leçon / étape** : module/path/ModulePath.tsx:212, :232 (« Étape ») contre module/path/LessonCard.tsx:78 (« LEÇON N SUR T »), module/LessonSheet.tsx:35 (« Leçon N sur T »), module/path/ModuleGuideSheet.tsx:53 (« Leçon N »), module/path/JumpButton.tsx:35, module/path/StartBubble.tsx:64.
- **module** : end/LessonEndFlow.tsx:361 (« Module terminé ! »), module/path/ModuleGuideSheet.tsx:39 (« Guide du module »), module/path/ModulePath.tsx:259 (« Trophée du module »), module/ModuleSkeleton.tsx:17, home/DailyProgram.tsx:95.
- **univers / objectif / sujet** : home/UniverseCarousel.tsx:76, :93 (« ton objectif », « TON OBJECTIF »), home/OtherTopicSheet.tsx:38 (« Un autre sujet ? »), home/GuestLessonCard.tsx:59.
- **révision** : home/DailyProgram.tsx:171-184 (« La révision », « 2 · LA RÉVISION », « Réviser », « En préparation »), end/EndFlowBoundary.tsx:49, :52, end/LessonEndFlow.tsx:151 (« RÉVISION TERMINÉE »).
- **bilan / précision / score** : player/RetryIntro.tsx:55, :96 (« bilan », « Passer au bilan »), end/LessonRecap.tsx:119, :125 (« PRÉCISION »), screens/TrueFalseScreen.tsx:405, :410 (« Voir mon score », « Ton score arrive »). Trois mots pour le résultat d'une leçon.
- **estimation / pari** : screens/SliderScreen.tsx:70, :87 (« Ton pari », « parier ») contre screens/RevealScreen.tsx:69 (« Ton estimation »), :70, :163 (« En vrai »).
- **verdicts** : player/AnswerSheet.tsx:98 (« Bien vu ! » / « Pas tout à fait »), screens/TrueFalseScreen.tsx:377 (« Bien vu ! » / « Raté ! »), screens/MatchScreen.tsx:63 (« Toutes les paires du premier coup. »), RevealScreen (« Pile dans le mille », « Tout près », « Bien plus que tu pensais »).
- **question / carte / paire / écran** : player/RetryIntro.tsx:92 (« Rattraper N questions »), screens/TrueFalseScreen.tsx:310 (« Carte N sur T »), screens/MatchScreen.tsx:103 (« paires trouvées »), home/DailyProgram.tsx:179 (« N écrans · environ N min »), player/ScreenBoundary.tsx:40, :45 (« Cet écran a un souci », « Passer cet écran »).
- **compte / connexion / profil** : home/GuestState.tsx:19-20, home/GuestLessonCard.tsx:60, :158 (« Créer mon compte », « J’ai déjà un compte »), home/HomeHeader.tsx:89 (« Mon compte » / « Se connecter »), home/LearnTopBar.tsx:54 (« Mon profil »). Le mot « inscription » n'apparaît pas.
- **fermer / quitter** : player/LessonTopBar.tsx:173 (« Fermer la leçon ») ouvre player/QuitSheet.tsx:26, :34 (« Quitter la leçon ? », « Quitter »).
- **mot du jour / programme du jour** : home/WordOfDayLine.tsx:21, :26 (« Le mot du jour »), home/DailyProgram.tsx:67 (« Leçon du jour faite »), :68 (« Une autre leçon »).
- Termes absents de ce dossier : patrimoine, portefeuille, chapitre, inscription.

## 1 C. Autres composants : src/components/ hors apprendre/

Périmètre : 87 fichiers relus en entier : article, common, dictionary, onboarding, outils, patrimoine, profile, splash, topbar, haptic-tab, plus src/modals.tsx.

Exclusions vérifiées :
- `src/components/dev/DevSliderSwitches.tsx` : chargé seulement sous `__DEV__` (src/screens/header/LoginScreen.tsx:209), donc absent en production. Ignoré.
- `src/modals.tsx` est un **dossier** qui contient `modal.tsx` : celui-ci rend un fragment vide `<></>` et n'est pas sous `app/`. Aucun texte visible.
- `src/components/onboarding/SocialButtons.tsx` : `SOCIAL_LOGIN_ENABLED = false`, donc rien ne s'affiche (« Continuer avec Apple / Google », « ou avec ton e-mail »).
- `src/components/onboarding/VaultScene.tsx` (pas encore suivi par git, travail en cours) : un seul texte, le libellé lu « Valtheria » du logo, qui est correct. La réplique de Val vient de WelcomeScreen, hors de mon périmètre.
- Les écrans hérités d'Outils (`outils/cashflow`, `outils/portfolio`) sont **bien visibles** : ils s'ouvrent depuis l'onglet Outils (OutilsScreen → /outils/cashflow, et /outils/portefeuille quand PatrimoineGate retombe sur PortefeuilleScreen). `topbar/header.tsx` est visible lui aussi (écrans Articles, Article et Outils).

### 1 C. Points de l'audit précédent (toujours présents dans ce périmètre)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/components/onboarding/ReminderPromise.tsx:16 | « Un seul rappel par jour, jamais plus. Tu peux le couper à tout moment dans ton profil. » | Le réglage est dans **Réglages** (ReminderSettingRow est monté par src/screens/header/SettingsScreen.tsx), pas dans le profil. | « Un seul rappel par jour, jamais plus. Tu peux le couper quand tu veux dans les Réglages. » | important |
| src/components/profile/MedalsCard.tsx:89 et :70 (texte de src/utils/accuracy.ts:175) | « Ta meilleure série : ${run} d’affilée » | « Série » désigne déjà les jours d'affilée (flamme, médailles de série) ; ici, ce sont des bonnes réponses. Le double sens est toujours là. | « Ton record : ${run} bonnes réponses d’affilée » | gênant |

### 1 C. Faux, trompeur ou interdit

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/components/outils/portfolio/AddPositionForm.tsx:64 | placeholder « Ticker (ex: AAPL, BTC) » | Cite des titres précis (Apple, Bitcoin) comme exemples : même nature que le point « ex. Solana, CW8, LVMH » de l'audit précédent. Anglicisme « Ticker » non expliqué. « ex: » sans espace ni point. | « Symbole du titre (ex. : le code affiché par ta banque) » | important |
| src/components/outils/portfolio/AddPositionForm.tsx:73 | placeholder « Nom (ex: Apple Inc.) » | Encore un titre précis cité en exemple. | « Nom du placement » | important |
| src/components/patrimoine/PositionLine.tsx:108 et :116 | « Plus-value réalisée » (ligne lue : « …, position clôturée, plus-value réalisée ${signedMoney(gain)} ») | Le libellé reste « plus-value » quand le montant est négatif (affiché en rouge) : c'est alors une **moins-value**. Faux pour l'utilisateur. | `gain >= 0 ? 'Plus-value réalisée' : 'Moins-value réalisée'` (même règle pour le libellé lu) | important |
| src/components/patrimoine/PositionLine.tsx:45 | « Garanti » (colonne de droite d'un livret sans taux, en vert) | Placé là où s'affiche d'habitude une variation, en vert, le mot peut se lire comme « rendement garanti ». C'est le capital qui est garanti. | « Capital garanti » | gênant |
| src/components/profile/MedalsCard.tsx:89 | « Ta série d’affilée commence à 3 bonnes réponses du premier coup » | Le chiffre 3 ne correspond à rien : la carte affiche le record dès 1 (`best > 0`), le bilan à partir de 2 (BEST_RUN_SHOWN_FROM), et le premier défi est à 5. | « Enchaîne des bonnes réponses du premier coup : ton record s’affichera ici. » | gênant |
| src/utils/accuracy.ts:180 (rendu par src/components/common/ChallengeCelebration.tsx:43-51, titre et VoiceOver) | « Nouveau défi : ${c.title} ! » → « Nouveau défi : 5 d’affilée ! » | Le titre s'affiche quand un défi est **gagné** ; « Nouveau défi » laisse croire qu'un nouveau défi est à relever. | « Défi réussi : 5 d’affilée ! » | gênant |
| src/components/common/MedalCelebration.tsx:52 | « ${medal.days} jours d’affilée. Continue comme ça. » | Injonction légère liée à la série, juste après la médaille : à la limite de la pression sur la série. | « ${medal.days} jours d’affilée. Joli rythme ! » | gênant |

### 1 C. Accessibilité (VoiceOver)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/components/topbar/header.tsx:34-39 | bouton icône `person-circle-outline`, sans libellé | Bouton du profil sans `accessibilityLabel` ni `accessibilityRole` : VoiceOver n'annonce rien d'utile (écrans Articles et Outils). | `accessibilityRole="button" accessibilityLabel="Mon profil"` | important |
| src/components/topbar/Back.tsx:18-20 | TouchableOpacity avec un chevron, sans libellé | Retour muet pour VoiceOver. Le composant commun BackButton (« Retour ») existe déjà. | Utiliser BackButton, ou `accessibilityRole="button" accessibilityLabel="Retour"` | important |
| src/components/outils/cashflow/EntryRow.tsx:52-54 | « ✕ » (bouton supprimer) | Bouton de suppression sans libellé : VoiceOver lit le caractère « ✕ » (« multiplication »). | `accessibilityRole="button" accessibilityLabel={`Supprimer ${entry.label}`}` | important |
| src/components/outils/portfolio/PositionRow.tsx:37-39 | « ✕ » (bouton supprimer) | Même problème. | `accessibilityLabel={`Supprimer ${position.name}`}` | important |
| src/components/article/BlockRenderer.tsx:153-168, 172 | choix du quiz d'article (Pressable) | Pas de rôle « button », et le résultat (bonne ou mauvaise réponse) n'est donné **que par la couleur** : rien n'est lu, rien n'est écrit. Gênant aussi pour les daltoniens. | Rôle `button`, `accessibilityState={{ selected }}`, et une ligne visible et lue avant l'explication : « Bonne réponse ! » / « Pas cette fois : la bonne réponse est en vert. » | gênant |
| src/components/onboarding/ReminderPicker.tsx:141 et :145 | `Plus de ${label}` / `Moins de ${label}` avec label = « heures » | Élision manquante : « Plus de heures », « Moins de heures ». | Libellés propres à chaque champ : « Une heure de plus » / « Une heure de moins », « 15 minutes de plus » / « 15 minutes de moins » | gênant |
| src/components/onboarding/ReminderPicker.tsx:142 | `${value} ${label}` → « 1 heures », « 0 heures », « 00 minutes » | Accord faux pour 0 et 1 (heure va de 0 à 23). « 00 » se lit « zéro zéro ». | `${n} ${n > 1 ? 'heures' : 'heure'}` avec n = nombre, même logique pour les minutes, sans le zéro de remplissage | gênant |
| src/components/patrimoine/DateField.tsx:94 et :98 | `${label} suivant` / `${label} précédent` avec label = « année » | Accord faux : « année suivant », « année précédent ». | Passer le genre : « Jour suivant », « Mois suivant », « Année suivante » (et « … précédente ») | gênant |
| src/components/patrimoine/DateField.tsx:95 (et MONTHS ligne 14) | `${label} : ${value}` → « mois : janv. » | L'abréviation est lue telle quelle (« janv ») : il vaut mieux lire le mois en entier. | Libellé lu avec le mois complet : « mois : janvier » | cosmétique |
| src/components/common/ListRow.tsx:86 | `verrouillée, ${lockedReason}` | Toujours au féminin. Pour un univers (UniversesScreen.tsx:67-68), VoiceOver dit « Épargne, verrouillée, Bientôt disponible ». | Formule neutre : `${title}, pas encore disponible` (ou `accès verrouillé, ${lockedReason}`) | gênant |
| src/components/profile/PatrimoineStepsCard.tsx:38 | `${m.title}, ${… ? 'gagnée' : 'à gagner'}` → « Premier actif suivi, gagnée » | L'accord se fait sur « étape », absent de la phrase : on entend « Premier objectif atteint, gagnée ». | `${m.title} : c’est fait` / `${m.title} : pas encore` | gênant |
| src/components/profile/MedalsCard.tsx:69 | `${c.title}, ${… ? 'gagné' : 'à gagner'}` → « Première leçon parfaite, gagné » | Même problème, accord sur « défi », absent de la phrase. | `${c.title} : c’est fait` / `${c.title} : pas encore` | gênant |
| src/components/outils/portfolio/HistoryChart.tsx:109-110 (libellés src/components/outils/portfolio/chartConstants.tsx:6-12) | « 1J », « 1S », « 1M », « 3M », « 6M », « 1A », « Max » | Puces sans libellé lu ni état « sélectionné » : VoiceOver lit « 1 J ». | `accessibilityRole="tab"`, `accessibilityState={{ selected }}`, libellé « 1 jour », « 1 semaine »… (comme periodSpoken) | gênant |
| src/components/outils/cashflow/AddEntryForm.tsx:83-112 | puces de catégorie, « 🔁 Récurrent », « 📅 Ce mois-ci » | Aucun rôle ni état sélectionné : VoiceOver ne dit pas quelle option est choisie, et lit les emojis (« flèches en boucle »). | `accessibilityRole="radio"`, `accessibilityState={{ checked }}`, libellé sans emoji | gênant |
| src/components/outils/cashflow/TypeTabs.tsx:25-26 | « Revenus » / « Dépenses » / « Épargne » | Onglets sans `accessibilityRole="tab"` ni état sélectionné. | Ajouter rôle et état | cosmétique |
| src/components/common/ValBubble.tsx:243 | `Val : ${title}. ${texte}` | Si le titre finit déjà par « ? » ou « ! », la lecture donne « Titre ?. … ». | N'ajouter le point que si le titre ne finit pas par une ponctuation | cosmétique |
| src/components/patrimoine/ChartMenu.tsx:122 | `Supprime le relevé du ${a.label}` → « Supprime le relevé du 2 juin · 1 234 € » | Le séparateur « · » est lu au milieu de la phrase. | « Supprime le relevé du 2 juin (1 234 €) » | cosmétique |
| src/components/profile/StatBand.tsx:34 | « Série : 5 jours, record 12 » | Le record est lu sans unité. | « Série : 5 jours, record : 12 jours » | cosmétique |
| src/components/article/BlockRenderer.tsx:104-110 | liens `[texte](url)` des articles | Sans `accessibilityRole="link"` : rien n'indique à VoiceOver que le texte s'ouvre. | Ajouter `accessibilityRole="link"` | cosmétique |

### 1 C. Ton, cohérence, vocabulaire

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/components/topbar/header.tsx:53 | « S'inscrire » | Vocabulaire « inscription », alors que la consigne est « création de compte » (le Dictionnaire dit « Créer mon compte »). Apostrophe droite. | « Créer mon compte » (ou « Créer un compte ») | gênant |
| src/components/profile/PatrimoineStepsCard.tsx:40 (et :34) | hint « Ouvre Mon patrimoine » | La carte ouvre /outils/portefeuille, présenté comme « Portefeuille » dans Outils (OutilsScreen) et rendu par PortefeuilleScreen quand le nouveau suivi n'est pas disponible. Incohérence patrimoine / portefeuille. | Unifier : « Ouvre ton patrimoine », avec la tuile Outils renommée « Mon patrimoine » (ou l'inverse) | gênant |
| src/components/outils/portfolio/PositionRow.tsx:50 | « · prix figé » | Le nouveau suivi dit « cours figé » (PositionLine.tsx:82). | « · cours figé » | cosmétique |
| src/utils/patrimoine/chart.ts:9 (affiché par src/components/patrimoine/PeriodPicker.tsx:36) | « YTD » | Anglicisme non expliqué, visible (le libellé lu, « année en cours », est correct). Autre incohérence : « Tout » ici, « Max » dans l'ancien graphique (chartConstants.tsx:12). | « Année » (ou « Depuis janv. ») ; harmoniser « Tout » / « Max » | gênant |
| src/components/outils/cashflow/AddEntryForm.tsx:102, :110 ; EntryRow.tsx:43 ; src/components/outils/portfolio/types.ts:30-37 (TYPE_ICON, affichés par AddPositionForm.tsx:56 et PositionRow.tsx:27) | « 🔁 Récurrent », « 📅 Ce mois-ci », « 🔁 récurrent », « 📅 ce mois-ci », 🪙 📈 📊 🏦 ⛏️ 📦 | La charte n'autorise que la flamme comme emoji (« Seul emoji autorisé de l'app (validé) », StreakFlame.tsx:26). Ce sont des écrans de l'ancien design. | Icônes Ionicons ou AssetIcon (comme le nouveau suivi), libellés sans emoji | gênant |
| src/components/outils/portfolio/AddPositionForm.tsx:64 et :73 (livret) | « Nom (ex: Livret A) » puis « Nom complet » | Pour un livret, deux champs « Nom » à la suite : on ne sait pas quoi mettre dans chacun. | 1er champ : « Livret (ex. : Livret A, LDDS) » ; 2e : « Banque ou surnom (facultatif) » | gênant |
| src/components/patrimoine/GoalsSection.tsx:37, src/components/common/UniverseCard.tsx:21 (« TON OBJECTIF »), src/components/profile/ObjectiveSheet.tsx:27 (« Ton objectif ») | « TES OBJECTIFS » / « Ton objectif » | « Objectif » sert à la fois au but d'apprentissage (premier lancement, carte d'univers) et aux objectifs d'épargne du patrimoine. | Garder « objectif » pour l'épargne et dire « Ton cap » (ou « Ce qui t’amène ») côté apprentissage, ou l'inverse | gênant |
| src/components/profile/PatrimoineStepsCard.tsx:53 | « Un versement par mois lance ta régularité » | Tournure maladroite (« lancer une régularité ») et légèrement incitative. | « Ta régularité se compte en mois avec au moins un versement. » | cosmétique |

### 1 C. Orthographe, typographie, format

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/components/outils/portfolio/PositionRow.tsx:59 | `{position.gain_loss_pct.toFixed(2)}%)` → « (+12.34%) » | Point décimal anglais et pas d'espace avant %. Très visible sur chaque ligne. | Formater en fr-FR : « (+12,34 %) » (formatVariationPercent existe déjà) | gênant |
| src/components/outils/portfolio/PositionRow.tsx:67 | « {…toFixed(2)}% aujourd'hui » → « +1.25% aujourd'hui » | Même défaut, plus une apostrophe droite. | « +1,25 % aujourd’hui » | gênant |
| src/components/outils/portfolio/PositionRow.tsx:45 | `{position.quantity} × …` → « 0.5 × 81,46 € » | Quantité brute, sans formatage français. | `quantity(position.quantity)` (utils/patrimoine/format) → « 0,5 × 81,46 € » | gênant |
| src/components/outils/cashflow/AddEntryForm.tsx:61 | placeholder « Libellé (ex: Salaire, Courses...) » | « ex: » sans espace ni point ; « ... » au lieu de « … ». | « Libellé (ex. : salaire, courses…) » | cosmétique |
| src/components/outils/portfolio/AddPositionForm.tsx:90 | placeholder « Prix d'achat » | Apostrophe droite. | « Prix d’achat » | cosmétique |
| src/components/dictionary/DictionaryStates.tsx:63 | « Le dictionnaire t&apos;attend » | Rendu avec une apostrophe droite. | « Le dictionnaire t’attend » | cosmétique |
| src/components/dictionary/DictionaryStates.tsx:58 | « aux … mots de l'argent » / « aux mots de l'argent » | Apostrophe droite (deux fois). | « de l’argent » | cosmétique |
| src/components/dictionary/DictionaryStates.tsx:70 | « J'ai déjà un compte » | Apostrophe droite. | « J’ai déjà un compte » | cosmétique |
| src/components/article/BlockRenderer.tsx:207 | `"{block.content}"` | Guillemets droits autour de chaque citation d'article. | `« {block.content} »` (avec espaces insécables) | cosmétique |
| src/components/dictionary/DictionaryStates.tsx:33 | `Rien pour « ${query.trim()} ».` | Espaces ordinaires à l'intérieur des guillemets : le « » peut se retrouver seul en début de ligne. | Espaces insécables `« … »` | cosmétique |
| src/utils/patrimoine/format.ts:113 (affiché par src/components/patrimoine/DateField.tsx:39, :78 et GoalsSection.tsx:83, :93) | « 1 juin 2026 », « Valider le 1 juin 2026 » | Il manque « 1er » (rateDateLabel le fait déjà, pas longDate). | « 1er juin 2026 », « Valider le 1er juin 2026 » | cosmétique |
| src/components/patrimoine/GoalsSection.tsx:37 ; src/components/profile/WeekChart.tsx:33 ; src/components/patrimoine/ChartMenu.tsx:111 | « TES OBJECTIFS », « CETTE SEMAINE », « RELEVÉS ANORMAUX » | Capitales écrites en dur, alors que la variante sectionLabel met déjà en capitales (`textTransform: 'uppercase'`, Style.ts:30). | « Tes objectifs », « Cette semaine », « Relevés anormaux » | cosmétique |
| src/components/outils/cashflow/EntryRow.tsx:48 | `'-'` devant le montant d'une dépense | Trait d'union au lieu du signe moins ; espace ordinaire avant €. | « −12 € » (U+2212, espace insécable) | cosmétique |

### 1 C. Remarques générales (non comptées ligne à ligne)

- **Espaces insécables avant « ! ? : % € »** : le défaut est systématique dans ce périmètre (exemples : MedalCelebration.tsx:61 et :63 « Nouvelle médaille : ${medal.name} ! » ; accuracy.ts:180 ; AllocationBar.tsx:30 et :43 `{s.percent}{' '}%`, où l'espace est ordinaire ; ReminderPicker.tsx:62 « Autre heure : » ; NeighborButtons, ChartMenu). Seuls utils/format.ts et la dernière ponctuation des bulles de Val (noOrphan) les posent. Sur les titres centrés (title1 des célébrations), « ! » peut passer seul à la ligne. À traiter en une fois, par exemple avec un utilitaire `frenchSpacing()` appliqué dans AppText.
- Les cartes en capitales (`UniverseCard.tsx:89` `label.toUpperCase()`, `SettingsList.tsx:22` `title.toUpperCase()`) mettent en capitales par le code : c'est voulu par le design, pas une faute de texte.
- Les écrans hérités d'Outils (cashflow, ancien portefeuille) n'utilisent ni AppText ni Button. Tous leurs textes échappent donc au plafond d'agrandissement, aux tons et aux libellés VoiceOver des composants communs. C'est la principale source de défauts de ce lot.

### 1 C. Lexique relevé

| Notion | Appellation | Endroit |
|---|---|---|
| Série (jours d'affilée) | « série · record N », « Série : N jours » (lu) | profile/StatBand.tsx:33-34 |
| Série | « jours d’affilée », « gel de série » | common/MedalCelebration.tsx:52 |
| Série | « Médailles de série », « N médailles de série sur 6 », « Première médaille à 3 jours », hint « Ouvre ta série et tes médailles » | profile/MedalsCard.tsx:44-57 |
| Bonnes réponses d'affilée (≠ série) | « Ta série d’affilée commence à… », « Ta meilleure série : N d’affilée », « Défis de précision », « Pas encore de série d’affilée » | profile/MedalsCard.tsx:70-89 (double sens avec « série ») |
| Défi | « Nouveau défi : … ! », « Défis de précision N sur 5 » | common/ChallengeCelebration.tsx:43, profile/MedalsCard.tsx:73-74 |
| Médaille | « Nouvelle médaille : Étincelle ! » | common/MedalCelebration.tsx:63 |
| XP | « XP », « N XP » | profile/StatBand.tsx:40-41, profile/WeekChart.tsx:26-36 |
| Niveau | « Niveau 10, encore 25 XP… » (commentaire, libellé fourni par l'écran) | profile/ProfileAvatar.tsx:19 |
| Vals (monnaie) | « Vals », « N Vals » (lu) ; jamais expliqué dans ce périmètre | profile/StatBand.tsx:44, common/ValsCoin.tsx |
| Leçon | « N leçons terminées sur N » (lu), « N / N » | common/UniverseCard.tsx:118-124 |
| Leçon | « N leçons », « Ta première leçon de la semaine t’attend. », « aucune leçon pour l’instant » | profile/WeekChart.tsx:25-48 |
| Leçon | « Sons des leçons » (lu) / « Sons » (visible) | common/SoundToggle.tsx:48-71 |
| Univers | label de carte d'univers, « verrouillée » (lu) | common/UniverseCard.tsx, common/ListRow.tsx:86 |
| Correction | « Déplier / Replier la correction » | common/BottomSheet.tsx:205 |
| Compte | « Créer mon compte », « J'ai déjà un compte », « Crée ton compte pour accéder… » | dictionary/DictionaryStates.tsx:66-70 |
| Inscription | « S'inscrire », « Se connecter » | topbar/header.tsx:46-53 |
| Profil | « Changer ma photo » | profile/ProfileAvatar.tsx:58 |
| Réglages / profil | « …dans ton profil » (alors que le réglage est dans Réglages) | onboarding/ReminderPromise.tsx:16 |
| Rappel | « Rappel quotidien », « Coupé », « Activer mon rappel », « Couper le rappel », « Choisis ton heure », « Matin / Midi / Soir » | onboarding/ReminderSettingRow.tsx, onboarding/ReminderPicker.tsx |
| Patrimoine | « Ton patrimoine · étapes N sur 6 », « Ouvre Mon patrimoine », « Régularité : … » | profile/PatrimoineStepsCard.tsx:37-53 |
| Portefeuille | route /outils/portefeuille, tuile « Portefeuille » (OutilsScreen), « Nouvelle position », squelette « Portefeuille » | outils/portfolio/AddPositionForm.tsx:49 |
| Actif / position | « Ouvre le détail de cet actif », « position clôturée », « Plus-value réalisée » | patrimoine/PositionLine.tsx:60, :108, :116 |
| Cours figé / prix figé | « cours figé » (nouveau) / « prix figé » (ancien) | patrimoine/PositionLine.tsx:82, outils/portfolio/PositionRow.tsx:50 |
| Objectif (épargne) | « TES OBJECTIFS », « Ajouter un objectif », « Épargne de précaution », « atteint(e) » | patrimoine/GoalsSection.tsx |
| Objectif (apprentissage) | « Ton objectif », « TON OBJECTIF » | profile/ObjectiveSheet.tsx:27, common/UniverseCard.tsx:21 |
| Étape (patrimoine) | « étapes N sur 6 », « gagnée / à gagner » | profile/PatrimoineStepsCard.tsx |
| Épargne | onglet « Épargne » (cash-flow), sous-titre « Épargne » d'un livret, « Épargne de précaution » | outils/cashflow/TypeTabs.tsx:8, patrimoine/PositionLine.tsx:41 |
| Relevé | « relevé(s) anormal(aux) », « Options de la courbe » | patrimoine/ChartMenu.tsx |
| Périodes | « 1J 1S 1M YTD 1A 5A Tout » / « 1J 1S 1M 3M 6M 1A Max » | patrimoine/PeriodPicker.tsx (utils/patrimoine/chart.ts:9) / outils/portfolio/chartConstants.tsx |
| Dictionnaire | « mot », « fiche », « Mot du jour », « Voir la fiche », « Définition : X », « Ouvre sa fiche du Dictionnaire », « Maîtrisé / Vu », « Mot suivant / précédent », « Index alphabétique » | dictionary/*, patrimoine/HelpTerm.tsx |
| Cash-flow | « Nouvelle entrée », « Récurrent / Ce mois-ci », « Répartition des dépenses » | outils/cashflow/* |

## 1 D. Logique et données : constants, utils, hooks, state, context, lesson hors discovery

Périmètre lu : src/constants/, src/utils/ (dont patrimoine/), src/hooks/, src/state/, src/context/ (lecture seule), src/lesson/ sauf discovery/. Chaque chaîne a été rapprochée de son usage (grep) ; les chaînes de code mort sont signalées comme telles.

Remarque générale : `src/utils/dictionary.ts` ne contient aucune définition locale. Les définitions viennent du serveur ; le fichier ne porte que les gabarits de questions et deux répliques de Val, et ils sont propres. Le garde-fou anti-indice des quiz du dictionnaire est solide.

### 1 D. Notifications (rappel quotidien)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/utils/reminder.ts:34 | « On continue ? Chaque jour compte pour ta série. » | Pression sur la série (phrase interdite, même famille que « Ta série compte sur toi ») | « On continue ? Une minute suffit pour un nouveau déclic. » | important |
| src/utils/reminder.ts:36 | titre « Ta série t’attend », corps « Garde le rythme : une leçon et c’est réglé. » | Pression sur la série dans le titre, plus une injonction (« Garde le rythme ») | titre « Une minute pour toi ? », corps « Une leçon courte, et c’est fait pour aujourd’hui. » | important |
| src/state/reminder.ts:82 (logique) et src/utils/reminder.ts:63 | (les 14 rappels sont programmés quoi qu’il arrive) | Le rappel du jour part même si la leçon est déjà faite. Les textes « Ta série t’attend » et « Val t’attend » deviennent alors faux et insistants. | Sauter le rappel du jour quand la leçon est faite (reprogrammer à la fin de la leçon), ou n’utiliser que des textes neutres | gênant |
| src/utils/reminder.ts:37 | « Un chiffre qui va te surprendre. Une minute, promis. » | Accroche « piège à clic » : promesse non garantie (la leçon suivante n’a pas forcément de chiffre étonnant) | « La suite est prête. Une minute, et tu en sais plus. » | gênant |
| src/utils/reminder.ts:38 | « Ce que tu apprends aujourd’hui, tu le gardes pour toujours. » | Promesse exagérée (la révision existe justement parce qu’on oublie) | « Ce que tu apprends aujourd’hui, on le révise ensemble demain. » | cosmétique |
| src/utils/reminder.ts:44-48 | titre « Val t’attend » + corps « Ta prochaine leçon sur l’épargne t’attend… » | « t’attend » est répété dans le titre et dans le corps (cinq textes sur six) | titre « Val a préparé la suite » ou « Petite pause argent ? » ; corps inchangé | cosmétique |

### 1 D. Textes de Val et accueil sans compte

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/utils/discoveryHome.ts:304 | « Reviens demain pour garder ta série. » | Pression sur la série (sous-titre de l’accueil, très visible) | « Leçon du jour faite. À demain ! » | important |
| src/utils/discoveryHome.ts:132 | « Six sujets, six déclics. Crée ton compte pour débloquer les vrais modules. » | « vrais modules » laisse entendre que les six leçons étaient fausses | « Six sujets, six déclics. Crée ton compte pour continuer avec les modules complets. » | gênant |
| src/utils/discoveryHome.ts:133 | « … La suite, ce sont les vrais modules : ils t’attendent dès l’ouverture des inscriptions. » | Même problème (« vrais modules ») | « … La suite, ce sont les modules complets : ils arrivent avec l’ouverture des inscriptions. » | gênant |
| src/utils/discoveryHome.ts:129, 136, 144, 149, 156, 161 | « 6 SUR 6 », « CRÉER MON COMPTE », « REJOUER UNE LEÇON », « LEÇON TERMINÉE », « UN AUTRE SUJET », « POUR TOI, 1 MIN », « REPRENDRE », « COMMENCER » | Capitales en dur dans les données (VoiceOver est rattrapé par spokenBadge et spokenLabel, mais le texte source est en capitales) | Écrire « 6 sur 6 », « Créer mon compte »… et mettre les capitales en style (`textTransform: 'uppercase'`) | cosmétique |
| src/utils/lessonPlayer.ts:134 | « ${much} plus que tu pensais » → « Bien plus que tu pensais » / « Un peu moins que tu pensais » | Grammaire : la comparaison demande « que tu ne le pensais » | « Bien plus que tu ne le pensais » / « Un peu moins que tu ne le pensais » | cosmétique |
| src/utils/accuracy.ts:180 | « Nouveau défi : ${c.title} ! » → « Nouveau défi : 10 d’affilée ! » | Ambigu : on comprend « voici un nouveau défi à relever », alors qu’il vient d’être réussi | « Défi relevé : 10 d’affilée ! » | gênant |
| src/utils/levels.ts:145-146 | « Termine les ${left} modules ${blocking.label} pour débloquer » / « Termine le module … pour débloquer » | Il manque le complément de « débloquer » | « Termine les 3 modules Débutant pour débloquer ce niveau » | cosmétique |
| src/utils/notebook.ts:265 | « Bien gardé. Les autres reviendront vite. » | « Les autres » au pluriel alors qu’il ne manque parfois qu’un déclic (1 sur 2, 4 sur 5) | « Bien gardé. Ceux qui manquent reviendront vite. » | cosmétique |
| src/utils/revision.ts:310 | « Bien révisé. Les autres reviendront demain. » | Même pluriel ; « demain » n’est pas garanti (date fixée par la répétition espacée ou par le serveur) | « Bien révisé. Ceux qui manquent reviendront très vite. » | cosmétique |
| src/utils/universes.ts:103 | « La bourse sans jargon : on va comprendre ce que tu achètes vraiment. » | Suppose que la personne achète déjà ou va acheter des actions (petit glissement vers l’incitation) | « La bourse sans jargon : on va comprendre ce qu’on achète vraiment avec une action. » | cosmétique |
| src/utils/universes.ts:116 | « … on apprend à juger une entreprise comme un pro. » | Masculin implicite (« un pro ») | « … on apprend à juger une entreprise avec les bons repères. » | cosmétique |

### 1 D. Conseils patrimoine de Val (valTips)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/utils/patrimoine/valTips.ts:94 | « Tout ton patrimoine est sans risque depuis plus d’un an. C’est rassurant, mais l’inflation, elle, ne s’arrête pas. » | Incitation déguisée à prendre du risque. Inexact pour un LEP à 2,5 % (au-dessus de l’inflation de 2 %). « depuis plus d’un an » est calculé sur la date d’ouverture du plus vieil actif, pas sur la durée réelle du « tout sans risque ». | « Ton patrimoine est entièrement sans risque. Bon à savoir : un taux sous l’inflation (autour de 2 %) grignote un peu ton pouvoir d’achat. » | important |
| src/utils/patrimoine/valTips.ts:80 | « Ta crypto pèse ${pct(crypto)} de ton patrimoine. C’est beaucoup ? » | Question rhétorique qui juge et pousse à vendre ; « Ta crypto » au singulier pour plusieurs actifs | « Les cryptos font ${pct} de ton patrimoine. Leur prix peut varier très fort, dans les deux sens. » | gênant |
| src/utils/patrimoine/valTips.ts:70 (règle l.63-67) | « ${biggest.p.name} pèse ${pct(biggest.share)} de ton patrimoine. Quand un seul actif pèse autant, tout dépend de lui. » | « pèse » répété. La règle compte aussi les biens « autre » (risque null), donc une résidence principale à 80 % déclenche « tout dépend de lui », un constat hors de propos pour un logement. | « ${name} représente ${pct} de ton patrimoine. Quand un seul actif compte autant, tout dépend de lui. » et exclure le type « autre » de la règle | gênant |
| src/utils/patrimoine/valTips.ts:23-28 | « Revoir « Ton coussin de sécurité » », « Revoir « Combien garder de côté ? » », « Revoir « Diversifier » », « Revoir « Choisir son horizon » », « Revoir « Ton premier plan » » | Titres de leçons écrits en dur : le lien va au premier module dont le titre contient un mot clé, sinon à l’univers, sinon à Apprendre (lessonLink.ts:21-30). Le titre annoncé peut donc ne pas exister. « Revoir » suppose une leçon déjà vue. Même libellé « Diversifier » pour la bourse et pour la crypto. | Libellé générique : « Voir la leçon sur le coussin de sécurité », « Voir la leçon sur la diversification »… ou afficher le titre réel du module trouvé | gênant |
| src/utils/patrimoine/valTips.ts:49 | « Tu n’as pas encore d’épargne sans risque. C’est elle qui évite de devoir vendre au mauvais moment. » | « pas encore » sous-entend « tu devrais » (légère morale) | « Aucune épargne sans risque pour l’instant. C’est elle qui évite de devoir vendre au mauvais moment. » | cosmétique |
| src/utils/patrimoine/milestones.ts:12 | « Suis trois types d’actifs différents (livret, ETF, crypto…). » | Étape à collectionner qui récompense la détention d’ETF ou de crypto : incitation déguisée à acheter, en contradiction avec la règle de l’en-tête (« jamais… le nombre d’achats »). Avec seulement de l’épargne, l’étape est presque impossible. | Revoir la règle (par exemple « trois actifs suivis », tous types confondus) et le texte : « Suis trois actifs dans ton patrimoine (livret, compte, bien…). » | gênant |
| src/utils/patrimoine/analysis.ts:36 | `etf: 'modere'` → affiché « Modéré » (RISK_LABELS l.27) | Inexact : un ETF actions (monde, S&P 500…) a un risque de marché proche de celui des actions. La diversification supprime le risque propre à une entreprise, pas les baisses du marché. | Ranger les ETF actions en « Élevé », ou nommer le niveau « Élevé, diversifié » | gênant |

### 1 D. Erreurs, formulaires, libellés

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| src/context/ApiContext.tsx:256 (fichier à ne pas modifier) | « Erreur API » (ou `json.message` brut du serveur) | Message technique, ou message serveur brut parfois en anglais (« Unauthenticated. », « Server Error »). Il arrive tel quel à l’écran via `e.message` (ActifScreen.tsx:117, SettingsScreen.tsx:83 et 120…). | Filtrer côté écran avec `readableMessage()` (authErrors.ts:49) et afficher « Ça n’a pas marché. Réessaie dans un instant. » | gênant |
| src/context/ApiContext.tsx:322, 332 (fichier à ne pas modifier) | « Erreur lors du chargement des articles » | Ton technique, sans point final, et il passe avant le message bienveillant de ArticleScreen.tsx:36 | Côté écran : « Impossible de charger les articles. Réessaie dans un instant. » | cosmétique |
| src/utils/onboarding.ts:237 et src/utils/authErrors.ts:64 | (message du serveur gardé s’il est « lisible ») | Un message français du site peut être vouvoyé ou impersonnel (« Veuillez… ») et s’affiche tel quel | Ajouter `/\bvous\b\|veuillez/i` à NOT_READABLE pour retomber sur les messages de l’app | gênant |
| src/utils/patrimoine/chart.ts:8-9 | `'YTD'` (puce de période affichée) | Anglicisme ou jargon visible, même si VoiceOver lit « année en cours » | « Année » (ou « 2026 ») | gênant |
| src/utils/patrimoine/format.ts:69 | "Mis à jour à l'instant" | Apostrophe droite dans un texte visible | « Mis à jour à l’instant » | cosmétique |
| src/utils/patrimoine/assetIcons.ts:143 et 269 | « Assurance vie » | Graphie usuelle : « assurance-vie » (avec trait d’union), utilisée partout ailleurs | « Assurance-vie » | cosmétique |
| src/utils/patrimoine/goals.ts:73 | « Date invalide. » | Sec, ton machine | « Cette date ne marche pas. Vérifie-la. » | cosmétique |
| src/lesson/formulas.ts:94 | from « Aujourd’hui », to « 20 ans » (axe du simulateur de crédit) | Mélange d’une date et d’une durée : « 20 ans » se lit comme un âge (sur l’autre simulateur, l.74, l’axe porte bien des âges) | to « Dans 20 ans » | cosmétique |
| src/utils/learning.ts:184-198 | `expert: 'Avancé'` ; clés `entree` et `inter` absentes | Incohérent avec levels.ts:19-25. Un module « expert » s’affiche « Avancé » dans ModuleRow (accueil, liste des univers) mais « Expert » dans l’en-tête de niveau de l’univers, et les niveaux réels du serveur `entree` et `inter` sont masqués. | Réutiliser `levelLabel(levelKey(…))` de levels.ts | gênant |
| src/utils/levels.ts:20-24 | « Entrée », « Débutant », « Intermédiaire », « Avancé », « Expert » | « Débutant » et « Expert » désignent des personnes au masculin (lu « tu es Débutant ») | « Premiers pas », « Les bases », « Intermédiaire », « Avancé », « Pour aller loin » | gênant |
| src/utils/notebook.ts:114-130 et 195-213 (test « Mes déclics ») | (mauvaises réponses tirées de NEAR_WORDS : « inflation », « épargne », « valeur »…) | Réponse parfois devinable par la grammaire : distracteurs au singulier et de genre variable, alors que le blanc suit un article (« Le _____ fait plus… » élimine « inflation » et « épargne ») ; le mot deviné par guessKeyword (le plus long) peut être un verbe ou un pluriel | Filtrer les distracteurs par accord avec le mot masqué (pluriel en s, x), ou marquer systématiquement les mots clés entre crochets dans les données | gênant |

### 1 D. Points de l’audit précédent

| Endroit | Texte actuel | État | Proposition | Priorité |
|---|---|---|---|---|
| src/utils/reminder.ts:32 | « Une minute pour une nouvelle leçon ? Ta série compte sur toi. » | Toujours présent (notification réelle) | « Une minute pour une nouvelle leçon ? J’ai un déclic pour toi. » | important |
| src/utils/lessonPlayer.ts:131 | « Tout près : tu étais à ${away} » | Toujours présent (RevealScreen) | « Tout près : à ${away} près ! » | gênant |
| src/utils/discoveryHome.ts:324 | « En attendant, toutes les leçons sont à toi. » | Toujours présent (carte du compte, inscriptions fermées). Faux : seules les six leçons découvertes sont jouables. | « En attendant, les six leçons découvertes sont à toi. » | important |
| src/utils/accuracy.ts:170 et 175 | « Meilleure série : ${run} d’affilée » / « Ta meilleure série : ${run} d’affilée » | Toujours présent (LessonRecap, MedalsCard). « série » désigne aussi la série de jours. | « Record : ${run} bonnes réponses d’affilée » / « Ton record : … » | gênant |
| src/constants/valLines.ts:8 et 11 | « On reprend là où tu t’étais arrêté ? … » / « Prêt pour la suite ? Je suis à côté si besoin. » | Toujours dans le fichier, mais code mort : seul `guestLine` est importé (GuestState.tsx:5). `valLines.general`, `almostDone`, `welcomeLine`, `moduleDoneLine`, `allDoneLine`, `emptyLine` et `pickDailyLine` ne sont utilisés nulle part. | Supprimer ces constantes, ou les corriger avant de les rebrancher : « On reprend là où tu en étais ? » / « On continue ? Je suis à côté si besoin. » | cosmétique |
| (périmètre) | « Tu dois être connecté. », « Presque. », « Tu peux le couper… », « 1660 € », crypto 240 €, « Solana, CW8, LVMH »… | Introuvables dans ce périmètre (grep) : ils relèvent des écrans ou des leçons. | — | — |

### 1 D. Lexique relevé

- **Série** (jours) : reminder.ts:32, 34, 36 ; discoveryHome.ts:304 et 331 (« ta série ») ; valLines.ts:40 ; lessonPlayer.ts:342 (« jours de série ! ») ; streakRewards.ts (« gel de série », médailles). **Même mot pour les bonnes réponses** : accuracy.ts:170 et 175 (« Meilleure série : 7 d’affilée ») → double sens. **Patrimoine** : regularity.ts:61 (« 3 mois d’affilée », « 1 mois de versement »).
- **Gel / gels** (protection de série) : streakRewards.ts:180-182.
- **Flamme** : streakRewards.ts:152-154 (« allumer ta flamme », « Ta flamme est à son maximum »).
- **Médailles** (série) : streakRewards.ts:10-17 ; **Défis** (précision) : accuracy.ts:89-95 et 180 ; **Étapes** (patrimoine) : milestones.ts:10-16 et celebration.ts:31-36. Trois systèmes de récompense, trois noms.
- **Coffre** : lessonPlayer.ts:366-371 (« Coffre commun / rare / épique / légendaire ») ; **Vals** : aucun texte visible dans ce périmètre (seulement `vals_gained` dans LessonResult).
- **XP** : profile.ts:37 (« encore 225 XP avant le niveau 11 ») ; format.ts:110 (« + 20 XP ») ; discoveryHome.ts:15.
- **Niveau** : double sens, à la fois niveau d’XP (profile.ts:37, « Niveau 10 ») et niveau de difficulté (levels.ts : « Débutant », « ce niveau », lockedMessage) ; learning.ts:182-198 (« difficulté »).
- **Leçon / module / univers / sujet** : discoveryHome.ts (les six leçons découvertes sont appelées « sujets » : « Encore 3 sujets à découvrir », « 6 SUR 6 », « Un autre sujet » ; « vrais modules ») ; levels.ts (« modules », « Tous les modules ») ; universes.ts (« univers », familles « Investir », « Gagner de l’argent », « Gérer au quotidien », « Comprendre l’économie », « Autres univers ») ; valLines.ts:35 (« modules », « articles »).
- **Révision** : dailyProgram.ts:113-121 (« Révision faite », « Une petite révision ? ») ; revision.ts:283 et 449 (titre « Révision ») et 468 (« Rien à réviser aujourd’hui. Prochaine révision : … ») ; useDailyRevision.ts:65 et 198 (« Révision du jour faite »).
- **Déclic / carnet** : notebook.ts:256 (« Mes déclics ») et 266 (« Relis ton carnet ») ; reminder.ts:33 (« un nouveau déclic ») ; discoveryHome.ts:132 (« six déclics »).
- **Compte / inscription / connexion** : discoveryHome.ts:323-333 (« Les inscriptions ouvrent très bientôt », « Se connecter », « Garde ta progression », « Créer mon compte ») ; onboarding.ts:234-239 (« Cette adresse a déjà un compte. », « L’inscription n’a pas abouti… ») ; authErrors.ts:64 (« E-mail ou mot de passe incorrect. »). Pour l’adresse : « E-mail » (authErrors.ts) et « adresse » (onboarding.ts) coexistent.
- **Patrimoine / portefeuille** : valTips.ts, chart.ts:273 (« Ton patrimoine »), milestones.ts (« ton patrimoine ») ; l’onglet s’appelle « Outils » (tabs.ts:5) ; « portefeuille » n’apparaît dans ce périmètre que dans du code (PortefeuilleScreen, hors périmètre, affiche « Impossible de charger le portefeuille. »).
- **Objectif** : double sens, à la fois objectif d’apprentissage (onboarding, reminder.ts:43-50, profile.ts:125-136) et objectif d’épargne du patrimoine (goals.ts:71-73, celebration.ts:29-35, milestones.ts:15).
- **Épargne sans risque / de précaution / coussin de sécurité** : valTips.ts:49, 57 et 23 ; milestones.ts:14 (« Épargne de précaution ») ; universes.ts:102 (« coussin de sécurité »). Trois façons de nommer la même notion.
- **Risque** : analysis.ts:25-30 (« Sans risque », « Modéré », « Élevé », « Très élevé ») ; familles d’actifs assetIcons.ts:21-28.
- **Mots du dictionnaire** : wordStates.ts:122-125 et 150 (« Tous », « À découvrir », « Vus », « Maîtrisés », « Pas encore vu ») ; welcome.ts:16 (« mots expliqués ») ; dictionary.ts:1043 (« 1 mot / 2 mots »).

---

# 2. Points de l’audit précédent : état au 17 octobre 2026 et phrase de remplacement

Tableau unique, qui reprend et harmonise les propositions des sections précédentes. Tous les points ont été revérifiés dans le code (grep), sauf mention contraire.

| Point de l’audit | Endroit actuel | Texte actuel | État | Remplacement proposé | Priorité |
|---|---|---|---|---|---|
| « déduit » au lieu de réduction d’impôt | src/lesson/discovery/impots.ts:80 | « Une grande partie du don peut être déduite de ton impôt. » | Présent. En plus, l’écran d’appariement de la même leçon (impots.ts:104-105) définit « Déduction » autrement : la leçon se contredit | « Si tu paies de l’impôt, 66 % du don en sont retirés : c’est une réduction d’impôt, dans la limite de 20 % de ton revenu imposable. » | important |
| « dans ton profil » | src/components/onboarding/ReminderPromise.tsx:16 ; aussi src/screens/onboarding/SignupScreen.tsx:377-378 | « Un seul rappel par jour, jamais plus. Tu peux le couper à tout moment dans ton profil. » ; « …puis choisir ton heure dans ton profil. » | Présent, et à un second endroit. Le réglage est dans Réglages | « Un seul rappel par jour, jamais plus. Tu peux le couper quand tu veux dans les Réglages. » ; « Autorise-les dans les réglages du téléphone, puis choisis ton heure dans les Réglages de l’app. » | important |
| Val se présente plusieurs fois | src/screens/onboarding/WelcomeScreen.tsx:30 ; FirstNameScreen.tsx:18 ; SignupScreen.tsx:280 ; src/lesson/discovery/index.ts:107 | « Salut ! Moi, c’est Val. » / « Salut ! Moi, c’est Val. Et toi, comment je t’appelle ? » / « Moi, c’est Val. Et toi ? » / « … Moi, c’est Val. Et toi ? » | Présent, à 4 endroits (et non 3) | Garder seulement WelcomeScreen. Prénom : « Et toi, comment je t’appelle ? ». Pseudo : « Choisis le pseudo qui te ressemble. ». index.ts:107 : « … on commencera par l’univers {univers}. » | gênant |
| « 1660 € » | src/lesson/discovery/decouvrir.ts:12-46 | « Tu touches 1 660 € net, tu coûtes 3 055 € à ton employeur » | Présent. Ce qui est faux, c’est surtout le coût employeur, qui ignore les allègements (voir Leçons découvertes) | « Tu touches 1 660 € net, tu coûtes environ 2 500 € à ton employeur ; l’écart finance ta protection sociale. » (montant à confirmer avec le simulateur de l’Urssaf) | important |
| « une prime ne fait jamais perdre d’argent » | src/lesson/discovery/impots.ts:12 et 14 | Accroche « Pourquoi une prime ne fait jamais perdre d’argent » ; « Changer de [tranche] ne fait jamais perdre d’argent » | Présent | Accroche : « Pourquoi changer de tranche ne fait pas fondre ta prime ». À retenir : « Changer de [tranche] ne taxe pas plus tout ton revenu : seule la partie au-dessus du [seuil] est taxée plus. » | important |
| « Quand tu revends avec un gain, il est imposé » | src/lesson/discovery/crypto.ts:78 | « Quand tu revends avec un gain, il est imposé. » | Présent | « Quand tu revends contre des euros avec un gain, il est imposé à 31,4 %, sauf si tes ventes de l’année ne dépassent pas 305 €. » | important |
| « Presque. » même si tout est faux | src/lesson/discovery/investir.ts:80 ; logement.ts:72 ; decouvrir.ts:55 | « Presque. Plus ton argent est réparti… » / « Presque. Tout commence par l’apport… » / « Presque. Pense à tout ce qu’on retire… » | Présent | « Pas encore. Plus ton argent est réparti, moins il est risqué. » / « Pas tout à fait. Tout commence par l’apport, et tout finit chez le notaire. » / « Pas tout à fait. Pense à ce qu’on retire à chaque étape. » | gênant |
| « Tout près : tu étais à {X} » | src/utils/lessonPlayer.ts:131 (affiché par RevealScreen.tsx:196, lu en :183) | « Tout près : tu étais à ${away} » | Présent | « Tout près : à ${away} près ! » | gênant |
| QuitSheet « Tu y étais presque » | src/components/apprendre/player/QuitSheet.tsx:29 | « Tu y étais presque. Si tu pars maintenant, tu devras la recommencer depuis le début. » | Présent, affiché même au premier écran | « Si tu pars maintenant, tu reprendras cette leçon depuis le début. » | gênant |
| « toutes les leçons sont à toi » | src/utils/discoveryHome.ts:324 | « En attendant, toutes les leçons sont à toi. » | Présent. Faux : seules les six leçons découvertes sont jouables sans compte | « En attendant, les six leçons découvertes sont à toi. » | important |
| « tu t’étais arrêté » / « Prêt pour la suite ? » | src/constants/valLines.ts:8 et 11 | « On reprend là où tu t’étais arrêté ? Je t’ai gardé ta place. » / « Prêt pour la suite ? Je suis à côté si besoin. » | Présent mais en code mort (seul `guestLine` est importé, GuestState.tsx:5). À corriger avant tout rebranchement | « On reprend là où tu en étais ? Je t’ai gardé ta place. » / « On continue ? Je suis à côté si besoin. » | cosmétique |
| « Tu dois être connecté. » | src/screens/PortefeuilleScreen.tsx:74 ; EpargneScreen.tsx:56 ; CashflowScreen.tsx:69 | « Tu dois être connecté. » | Présent, 3 fois | « Connecte-toi pour retrouver ton portefeuille. » (« … ton budget. », « … tes objectifs. »), avec un bouton « Me connecter » | gênant |
| Notifications « Ta série compte sur toi » | src/utils/reminder.ts:32 ; aussi :34 et :36 | « Une minute pour une nouvelle leçon ? Ta série compte sur toi. » ; « On continue ? Chaque jour compte pour ta série. » ; « Ta série t’attend » / « Garde le rythme : une leçon et c’est réglé. » | Présent, et deux autres notifications de la même veine | « Une minute pour une nouvelle leçon ? J’ai un déclic pour toi. » ; « On continue ? Une minute suffit pour un nouveau déclic. » ; titre « Une minute pour toi ? », corps « Une leçon courte, et c’est fait pour aujourd’hui. » | important |
| crypto.ts:40, 240 € | src/lesson/discovery/crypto.ts:40 | « 1 000 € placés au sommet en valaient un an plus tard environ » 240 € | Présent : calcul fait en dollars, affiché en euros | « 1 000 $ placés au sommet en valaient un an plus tard environ » 240 $ ; ou rester en euros avec « environ 250 € » | gênant |
| « Meilleure série » à double sens | src/utils/accuracy.ts:170 et 175 (LessonRecap.tsx:191, MedalsCard.tsx:70 et 89) ; StreakSheet.tsx:78 | « Meilleure série : 5 d’affilée » (bonnes réponses) / « Meilleure série : 12 jours » (jours) | Présent | Bonnes réponses : « Record : 5 bonnes réponses d’affilée ». Jours : « Record : 12 jours ». Réserver « série » aux jours | gênant |
| « ex. Solana, CW8, LVMH » | src/screens/patrimoine/AssetSearchScreen.tsx:127 ; même problème dans AddPositionForm.tsx:64 et 73 | « Nom, symbole ou ISIN (ex. Solana, CW8, LVMH) » ; « Ticker (ex: AAPL, BTC) » ; « Nom (ex: Apple Inc.) » | Présent, et à deux nouveaux endroits | « Nom, symbole ou code ISIN » ; « Symbole (le code affiché par ta banque) » ; « Nom du placement » | important |

---

# 3. Contenu de production

## 3 A. Leçons publiées (module 182 « Ne jamais être obligé de vendre », leçons n° 100 à 103)

Calculs vérifiés : 900 / 0,8 = 1 125 € (leçon 100) ; 550 + 280 + 75 + 60 + 35 = 1 000 € (leçon 101) ; 1 400 € ≥ 1 100 € (leçon 101) ; 5 000 € à 2,5 % = 125 € contre 85 € à 1,7 % (leçon 102) ; 800 / 200 = 4 mois et 800 / 300 ≈ 3 mois (leçon 103). Plafonds et taux des gabarits {{…}} : conformes au relevé des chiffres (Livret jeune 1 600 €, LEP 10 000 € et 2,5 %, Livret A 22 950 € et 1,7 %, RFR LEP 23 028 €), à condition que le serveur remplace bien les gabarits avant l’envoi (l’app ne les remplace pas : à vérifier une fois en production).

### Problèmes communs aux quatre leçons

| Endroit | Texte actuel | Problème | Remplacement proposé | Priorité |
|---|---|---|---|---|
| src/components/apprendre/screens/RevealScreen.tsx:226-230 (lignes atténuées `dim`) ; leçon n° 100 écran 1, leçon n° 103 écran 2 | Leçon 100 : ligne atténuée « Ce que son appli affiche après la baisse » (valeur 2 400) ; leçon 103 : « Chaque mois » (valeur 200) | Le lecteur n’affiche que le libellé des lignes atténuées et perd leur valeur. Dans la leçon 100, l’écran suivant dit « Compare les deux chiffres : 3 000 au départ, 2 400 aujourd’hui », alors que 2 400 n’a jamais été montré | Côté contenu : retirer `dim` de ces deux lignes. Côté app : afficher la valeur des lignes atténuées quand elle existe | important |
| Leçons n° 100, 101, 103, lignes des révélations | « Ce qu'elle avait investi 3 000 », « Loyer 550 », « À remettre 800 » | Les montants des lignes s’affichent sans unité (seul le grand chiffre a « € » ou « mois ») : dans la leçon 103, « À remettre 800 » est à côté d’un grand chiffre en mois | Ajouter l’unité dans le libellé (« À remettre, en euros ») ou afficher l’unité de la ligne | gênant |
| Toutes les leçons publiées (questions_data) | « Ce qu'elle avait investi », « aujourd'hui », « n'obligent », etc. | Apostrophes droites partout, et normalize.ts ne les convertit pas : elles s’affichent telles quelles, alors que le reste de l’app utilise ’ | Corriger à la source (éditeur du site) ou convertir ' en ’ dans normalize.ts | cosmétique |
| Module n° 182 (titre) | « Ne jamais être obligé de vendre » | Masculin implicite | « Ne jamais devoir vendre au mauvais moment » | gênant |
| Leçons n° 101, 102, 103 ; app (valTips, Objectif) | « coussin », « épargne de sécurité », « argent de sécurité », « filet » ; dans l’app « Épargne de précaution », « coussin de sécurité » | Quatre ou cinq noms pour la même notion | Choisir « coussin de sécurité » dans les leçons, et l’écrire une fois avec son nom officiel : « ton coussin de sécurité (on dit aussi épargne de précaution) » | gênant |
| Leçons n° 101 écran 5 et 102 écran 6 ; leçon découverte impots | Léa : « CDI depuis deux ans, vit à deux » ; « Léa a 19 ans, elle est apprentie et déclare ses revenus seule » ; « Léa gagne 40 000 € » | Le même prénom désigne trois situations incompatibles | Garder Léa pour un seul personnage ; ailleurs « Inès », « Jade »… | cosmétique |
| src/utils/patrimoine/valTips.ts:24 | Lien « Revoir « Combien garder de côté ? » » | Le titre réel de la leçon est « Combien tu dois avoir de côté » | Renommer la leçon (voir plus bas) ou le lien, pour que les deux disent la même chose | gênant |

### Leçon n° 100 « Le mois où tout tombe en même temps »

| Endroit | Texte actuel | Problème | Remplacement proposé | Priorité |
|---|---|---|---|---|
| leçon n° 100 écran 3 (choice, « Laquelle de ces phrases est fausse ? ») | Option a, présentée comme vraie : « Si tu ne vends pas, tu n'as encore rien perdu » | Inexact, et c’est un biais classique : la valeur a bien baissé, la perte existe, elle n’est simplement pas définitive. Il y a donc deux phrases fausses (a et c), et le quiz devient ambigu | « Tant que tu ne vends pas, ta perte n’est pas définitive » | important |
| leçon n° 100 écran 2, réplique d’erreur | « Commission et impôt existent, mais ça se compte en euros. C'est la baisse qui creuse l'écart. » | « ça se compte en euros » ne veut rien dire (tout se compte en euros). Et vendre à perte ne crée pas d’impôt | « Des frais peuvent exister, mais ils pèsent peu. Et une vente à perte ne crée pas d’impôt. C’est la baisse qui creuse l’écart. » | gênant |
| leçon n° 100 écran 2, option correcte | « Tout ce qu'elle a vaut 20 % de moins, elle doit donc en sortir davantage » | Seule réponse longue et argumentée : se devine | Allonger une mauvaise réponse : « Sa banque prélève une commission sur chaque vente, en plus des frais de garde » | cosmétique |
| leçon n° 100 écran 6, option d et réplique d’erreur | Option « Tu demandes un délai et tu paies après la paie » ; erreur : « Le reste ajoute un coût à un imprévu déjà payé. » | Demander un délai au dentiste ne coûte rien : la réplique est fausse pour cette option, et la question devient discutable | Remplacer l’option d par « Tu passes à découvert jusqu’à la paie » (qui, elle, coûte des agios) | gênant |
| leçon n° 100 écran 4, réplique juste | « Le marché ne force jamais personne à vendre. Le manque d'argent, si. » | « jamais » est faux avec un crédit ou un effet de levier, mais acceptable pour des débutants | « Une baisse ne force personne à vendre. Le manque d’argent, si. » | cosmétique |

### Leçon n° 101 « Combien tu dois avoir de côté »

| Endroit | Texte actuel | Problème | Remplacement proposé | Priorité |
|---|---|---|---|---|
| leçon n° 101 (titre) | « Combien tu dois avoir de côté » | « tu dois » sonne comme une injonction ; interrogation orale | « Combien garder de côté » (et le lien de valTips.ts:24 devient juste) | gênant |
| leçon n° 101 écran 6, réplique juste | « 1 400 € : tu passes le premier mois complet. À partir de là, tu peux investir. » | Contredit l’écran 4 (le coussin complet, c’est 3 à 6 mois) et pousse à investir dès un mois couvert | « 1 400 € : ton premier mois est couvert. Prochaine étape : viser trois mois. » | important |
| leçon n° 101 écran 4, réplique d’erreur | « C'est trois à six mois. Au-delà, c'est de l'argent qui dort pour rien. » | Affichée aussi si l’on choisit « 1 à 2 mois » (en dessous) ; « qui dort pour rien » juge, et c’est inexact (un livret rapporte) | « C’est trois à six mois. Moins, c’est fragile ; beaucoup plus, c’est de l’argent qui pourrait servir à d’autres projets. » | gênant |
| leçon n° 101 écran 5 (question) | « Lequel des deux doit viser six mois plutôt que trois ? » | « doit » : ton d’injonction ; deux options seulement, réponse évidente | « Lequel des deux a intérêt à viser six mois plutôt que trois ? » | cosmétique |
| leçon n° 101 écran 6, explication | « Tant que le premier mois n'est pas couvert, tout le reste attend. » | Ton de règle absolue (le prêt à 1 % peut aussi attendre, mais pas une dette chère) | « Tant que le premier mois n’est pas couvert, c’est la priorité. » | cosmétique |

### Leçon n° 102 « Où mettre ce coussin »

| Endroit | Texte actuel | Problème | Remplacement proposé | Priorité |
|---|---|---|---|---|
| leçon n° 102 écran 7 (« 2 000 € de coussin, éligible au LEP ») | Bonne réponse : « 1 600 € sur le Livret jeune, le reste sur le LEP » ; explication : « On remplit d'abord le livret au plafond le plus bas et au meilleur taux » | Faux en 2026 : le LEP paie 2,5 %, le Livret jeune au moins 1,7 % (souvent moins que le LEP). Avec 2 000 €, « Tout sur le LEP » (présenté comme faux) rapporte autant ou plus. La réplique juste dit elle-même que le LEP est « le mieux payé » | Bonne réponse : « Tout sur le LEP ». Réplique : « Le LEP est garanti, disponible, et c’est le mieux payé, à {{lep_taux}}. Le Livret jeune ne vaut le coup que si ta banque le paie plus. » | important |
| leçon n° 102 écran 2 (« Coche les endroits où un coussin est vraiment à sa place ») | Option fausse « Livret bancaire « boosté » pendant trois mois » ; explication « Seuls les livrets réglementés cochent les deux cases : disponibles à tout moment et garantis. » | Un livret bancaire est lui aussi disponible et garanti (fonds de garantie des dépôts, 100 000 €) : il coche les deux critères annoncés. Il est seulement moins intéressant | Remplacer l’option par « Compte courant » (ce qui rend juste la réplique sur le « faux ami »), ou accepter le livret boosté avec : « Possible, mais après la promo son taux retombe et ses intérêts sont imposés. » | important |
| leçon n° 102 écran 2, réplique juste | « Le compte courant est le faux ami : disponible, mais tu le dépenses sans t'en rendre compte. » | Le compte courant ne figure pas parmi les options | Ajouter l’option « Compte courant » (voir ligne précédente), ou réplique : « Livret A, LEP, Livret jeune : disponibles et jamais en baisse. » | gênant |
| leçon n° 102 écran 2, réplique d’erreur | « …quelques mois de promotion, puis un taux dérisoire et des intérêts imposés. » | « dérisoire » juge ; affichée aussi si l’erreur porte sur l’ETF ou l’assurance-vie | « Un ETF ou des unités de compte peuvent baisser au mauvais moment. Un livret boosté, lui, retombe vite à un taux bas, et ses intérêts sont imposés. » | gênant |
| leçon n° 102 écran 4 | Deux options : « Le Livret A, à {{livret_a_taux}} » / « Le LEP, à {{lep_taux}} » | Les taux sont dans les options : la réponse se lit directement | « Pour 5 000 € laissés un an, combien de plus rapporte le LEP que le Livret A ? » (options : 0 €, 40 €, 125 €, 250 €) | cosmétique |

### Leçon n° 103 « Quand tu l'as entamé »

| Endroit | Texte actuel | Problème | Remplacement proposé | Priorité |
|---|---|---|---|---|
| leçon n° 103 (titre) | « Quand tu l'as entamé » | « l' » ne renvoie à rien hors contexte (sur la carte de la leçon) | « Quand ton coussin a fondu » | gênant |
| leçon n° 103 écran 2, explication et libellé | « Pendant cette fenêtre, un deuxième imprévu t'oblige à vendre. » ; « Quatre mois pendant lesquels rien ne te protège. » | Trop absolu : un second imprévu peut obliger à vendre ; et il reste 200 € de coussin | « Pendant cette fenêtre, un deuxième imprévu pourrait t’obliger à vendre. » ; « Quatre mois avec un filet plus mince. » (formulation neutre, sans « protégé ») | gênant |
| leçon n° 103 écran 3, réplique d’erreur | « Couper en deux double la durée de la fenêtre sans filet. » | Affichée aussi pour « Sur ton ETF » et « Sur ton compte courant » | « Tant que le coussin n’est pas refait, chaque euro placé ailleurs allonge la fenêtre sans filet. » | gênant |
| leçon n° 103 écran 3, réplique juste | « …Ensuite, tu recommences à investir. » | Suppose que la personne investit, et l’y renvoie | « …Ensuite, tu fais ce que tu veux de ton épargne. » | cosmétique |
| leçon n° 103 écran 4, explication | « Pendant la reconstitution, on ne bloque aucun euro, même pour un placement prometteur. » | Un ETF ou une crypto ne sont pas « bloqués » : ils sont exposés à la baisse ; « placement prometteur » peut se lire comme une recommandation | « Pendant la reconstitution, aucun euro ne part là où il peut baisser ou être immobilisé. » | cosmétique |

### Compléments sur les leçons publiées (relecture croisée)

| Endroit | Texte actuel | Problème | Remplacement proposé | Priorité |
|---|---|---|---|---|
| leçon n° 103 (Quand tu l'as entamé) écran 2 (reveal) | label « Quatre mois pendant lesquels rien ne te protège. » ; intro « Quatre mois sur un calendrier, c'est court. Sans filet, c'est long. » | L’intitulé et la bulle de Val donnent la réponse (4) avant l’animation de révélation, qui perd son effet. | Label : « Le temps pendant lequel rien ne te protège ». Intro : « Sur un calendrier, ça paraît court. Sans filet, c’est long. » | gênant |
| leçon n° 102 (Où mettre ce coussin) écran 6 (choice) | wrong « Ne pas être imposable n'empêche rien, au contraire : c'est même ce qui ouvre le LEP. » | Imprécis : c’est un revenu fiscal de référence sous le plafond (23 028 € pour une part) qui ouvre le LEP, pas la non-imposition. On peut être imposable et avoir droit au LEP. | « Ne pas être imposable n’empêche rien. Ce qui compte pour le LEP, c’est un revenu fiscal sous {{lep_rfr_plafond_1part}}. » | gênant |
| leçon n° 100 (Le mois où tout tombe en même temps) écran 1 (reveal) | label « Ce que Nora doit vendre pour récupérer 900 €. » ; explication « elle doit vendre 1 125 € de ce qu'elle avait investi » | Ambigu : Nora vend 900 € de placements au prix du jour. Les 1 125 €, c’est ce que ces placements lui avaient coûté. Lu vite, on croit qu’elle vend pour 1 125 €. L’intitulé en capitales garde un point final. | Label : « Ce que ces 900 € lui avaient coûté ». Explication : « … elle doit céder des placements qu’elle avait payés 1 125 € pour récupérer 900 €. » | gênant |
| leçon n° 101 (Combien tu dois avoir de côté) écran 3 (choice) | question « Son premier palier d'épargne de sécurité : » ; bonne réponse « Un mois de dépenses, soit 1 000 € » | Le « premier palier » n’a pas été défini avant cet écran, et « Trois mois de dépenses » (option d) correspond à la règle courante, reprise par le dictionnaire. Deux réponses défendables. | Intro : « Le premier palier, le plus urgent, c’est un mois. Attention au mot qui suit le chiffre. » | gênant |
| leçon n° 101 (Combien tu dois avoir de côté) écran 1 (document) | wrong « Ce qui revient tous les mois compte, même ce que tu as oublié avoir souscrit. » ; explication « … pas sur ce qu'on peut couper le mois prochain. » | Contradiction : un abonnement oublié est justement une charge qu’on peut couper le mois prochain. | Explication : « Un coussin se calcule sur ce qui tombe tous les mois, abonnements oubliés compris. » | gênant |
| leçon n° 102 (Où mettre ce coussin) écran 3 (choice) | intro « Celui-ci paie bien, mais il se remplit vite. » | Le Livret jeune rapporte au minimum le taux du Livret A (1,7 %) : « paie bien » contredit l’écran 4, selon lequel le LEP est le mieux payé. | « Celui-ci est réservé aux 12-25 ans, et il se remplit vite. » | gênant |
| leçon n° 100 (Le mois où tout tombe en même temps) écran 5 (choice) | « Tes placements ont perdu 20 % et tu as besoin de 900 €. Combien de ce que tu avais investi part ? » (bonne réponse 1 125 €) | Mêmes chiffres que l’écran 1, qui vient d’afficher 1 125 € en grand. L’intro « Les chiffres sont donnés. » le confirme. La question est en outre mal tournée (« Combien de ce que tu avais investi part ? »). | Changer les chiffres : « Tes placements ont perdu 25 % et tu as besoin de 600 €. Combien de ta mise de départ y passe ? » (bonne réponse 800 €, leurres 450 €, 600 €, 750 €). | gênant |
| leçon n° 100 (Le mois où tout tombe en même temps) écran 4 (choice multiple) | bonnes réponses « … et tu n'as rien de côté », « … sans épargne », « … sans aucune réserve » | Les trois bonnes réponses sont exactement celles qui disent « sans épargne » : il suffit de repérer la formule. | Ajouter un leurre avec la même formule, par exemple « Le marché baisse et tu n’as rien de côté » (faux). Ou retirer la précision d’une des bonnes réponses. | gênant |
| leçon n° 102 (Où mettre ce coussin) écran 5 (choice) | intro « Ce n'est ni ton âge, ni ce que tu déposes. » | L’intro élimine deux options sur quatre (a et c). | « Ça se lit sur un papier que tu reçois chaque été. » | gênant |
| leçon n° 100 (Le mois où tout tombe en même temps) écran 6 (choice) | intro « Tout est là : ce que tu as, ce que tu dois, et quand tu es payé. » | Masculin implicite (« payé »). | « Tout est là : ce que tu as, ce que tu dois, et quand tombe ta paie. » | gênant |
| leçon n° 100 (Le mois où tout tombe en même temps) écran 6 (choice) | correct « … il te reste 200 € pour tenir. » ; option d « Tu demandes un délai et tu paies après la paie » | Il reste 280 € (200 € sur le livret et 80 € sur le compte). « paies après la paie » se répète. | « … il te reste 200 € sur le livret, plus tes 80 €, pour tenir. » ; option d : « Tu demandes au dentiste d’attendre ta paie » | cosmétique |
| leçon n° 102 (Où mettre ce coussin) écran 1 (choice) | wrong « Un coussin placé en bourse fond exactement le mois où tu en as besoin. » | « exactement » est trop catégorique. | « Un coussin placé en bourse peut fondre pile le mois où tu en as besoin. » | cosmétique |
| leçon n° 102 (Où mettre ce coussin) écran 3 (choice) | correct « {{livret_jeune_plafond}}, et pas un euro de plus. » | Les intérêts capitalisés peuvent faire dépasser le plafond : c’est l’argent versé qui est plafonné. | « {{livret_jeune_plafond}} de versements, pas un de plus. » | cosmétique |
| leçon n° 102 (Où mettre ce coussin) écran 2 (choice) | « Livret bancaire « boosté » pendant trois mois » | Anglicisme (« boosté »), même entre guillemets. | « Livret bancaire « à taux promo » pendant trois mois » | cosmétique |

Non vérifié : le relevé bancaire généré de la leçon 101 écran 1 (`artifact: releve_bancaire`, `variant: random`), absent de l’extrait. Donnée : le module 182 a `status: draft` alors que `is_published` vaut 1.

## 3 B. Dictionnaire (203 définitions, toutes relues)

### 3 B.1 Chiffres faux ou périmés en 2026 (fiscalité, réglementation)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| définition Flat tax | « Prélèvement Forfaitaire Unique (PFU) de 30% … 12.8% d'impôt sur le revenu + 17.2% de prélèvements sociaux. » | 31,4 % en 2026 (12,8 % + 18,6 %). | « Prélèvement forfaitaire unique (PFU) de 31,4 % sur les revenus du capital : 12,8 % d’impôt sur le revenu et 18,6 % de prélèvements sociaux. » | important |
| définition complète Flat tax | « La flat tax prend 30% = 1 500€ d'impôts. Il te reste 3 500€ nets. Sauf si tu êtes dans une tranche basse d'IR. » | 31,4 %, soit 1 570 € et 3 430 €. « tu êtes » est une faute de conjugaison. | « La flat tax prend 31,4 %, soit 1 570 €. Il te reste 3 430 €. Si ta tranche d’impôt est basse, tu peux choisir le barème à la place. » | important |
| définition Prélèvements sociaux | « Cotisations de 17.2% prélevées sur les revenus du patrimoine (dividendes, loyers, plus-values). Composés de la CSG (9.2%)… » | 18,6 % en cas général (dividendes, plus-values, PEA) ; 17,2 % seulement pour l’assurance-vie, le PEL et les revenus fonciers. La CSG sur les revenus du capital passe à 10,6 %. Ce sont des contributions, pas des « cotisations ». | « Contributions prélevées sur les revenus du patrimoine : 18,6 % en général (dividendes, plus-values, PEA), 17,2 % pour l’assurance-vie, le PEL et les loyers. La plus grosse part, c’est la CSG. » | important |
| définition complète Prélèvements sociaux | « Même exonéré d'impôt sur le revenu (PEA de +5 ans), tu paies quand même 17.2% de prélèvements sociaux sur tes retraits de PEA. » | 18,6 %. Ils portent sur les gains, pas sur tout le retrait. Masculin implicite (« exonéré »). | « Même sans impôt sur le revenu (PEA de plus de 5 ans), tu paies 18,6 % de prélèvements sociaux sur les gains que tu retires. » | important |
| définition PEA | « Après 5 ans, les gains sont exonérés d'impôts (seulement 17.2% de prélèvements sociaux). » | 18,6 % pour le PEA en 2026. | « Après 5 ans, tes gains ne paient plus d’impôt sur le revenu, seulement 18,6 % de prélèvements sociaux. Plafond : 150 000 €. » | important |
| définition complète PEA | « Ta plus-value de 40 000€ est exonérée d'impôts (30% économisés = 12 000€). » | Calcul faux : les prélèvements sociaux restent dus. L’économie réelle est de 12,8 %, soit 5 120 € (7 440 € de prélèvements sociaux au lieu de 12 560 € de flat tax). | « Ta plus-value de 40 000 € ne paie pas d’impôt sur le revenu : tu verses 7 440 € de prélèvements sociaux au lieu de 12 560 € avec la flat tax, soit 5 120 € d’économie. » | important |
| définition Plus-value | « La plus-value est imposable en France à 30% (flat tax). » | 31,4 %. En plus, l’immobilier, cité dans la même phrase, ne relève pas de la flat tax (19 % + 17,2 %). | « Sur les actions ou la crypto, elle est imposée à 31,4 % (flat tax). L’immobilier a ses propres règles. » | important |
| définition complète Plus-value | « Avec la flat tax à 30%, tu paies 15€ d'impôts et gardes 35€ de gain net. » | 31,4 % : 15,70 € et 34,30 €. | « Avec la flat tax à 31,4 %, tu paies 15,70 € et gardes 34,30 €. » | important |
| définition complète CTO | « Les gains sont soumis au PFU à 30 %. » | 31,4 %. | « Les gains sont soumis à la flat tax de 31,4 %. » | important |
| définition complète Intéressement | « En le plaçant sur ton PEE, tu évites les 30% de flat tax — tu gagnes 600€ d'impôts. » | Faux : l’intéressement non placé est imposé au barème comme un salaire, pas à la flat tax. L’économie dépend de ta tranche (220 € à 11 %, 600 € à 30 %). « gagnes … d'impôts » est mal dit. | « En le plaçant sur ton PEE, il échappe à l’impôt sur le revenu : à 30 % de tranche, tu économises 600 €. » | important |
| définition Assurance-vie | « abattement de 4 600€/an sur les gains » | Il manque le cas du couple (9 200 €) et la précision : sur les gains retirés. | « … abattement de 4 600 € par an (9 200 € pour un couple) sur les gains que tu retires. » | gênant |
| définition complète Assurance-vie | « Ces 3 000€ sont sous l'abattement de 4 600€ → tu ne paies aucun impôt sur ces gains. » | Faux : les prélèvements sociaux de 17,2 % restent dus, soit 516 €. | « … tu ne paies pas d’impôt sur le revenu, seulement les prélèvements sociaux de 17,2 % (516 €). » | important |
| définition complète Abattement fiscal | « si tes gains retirés sont de 4 000€, tu paies 0€ d'impôts. » | Même erreur : 17,2 % de prélèvements sociaux restent dus. | « … tu ne paies pas d’impôt sur le revenu dessus, seulement les prélèvements sociaux. » | important |
| définition Loi Pinel | « Dispositif de défiscalisation permettant de réduire ses impôts en achetant un appartement neuf … Réduction allant jusqu'à 21%. » | Le dispositif est fermé : plus aucun investissement possible depuis le 1er janvier 2025. Le texte le présente comme actuel. | « Ancien dispositif de réduction d’impôt pour l’achat d’un logement neuf à louer. Fermé depuis le 1er janvier 2025 : il ne concerne plus que les achats d’avant. » | important |
| définition complète LMNP | « tu peux amortir le bien sur 25 ans → 6 000€/an de charges déductibles. Tes loyers sont quasi non imposés pendant des années. » | Promesse, et l’information manque : depuis la loi de finances 2025, les amortissements sont réintégrés dans la plus-value à la revente. Le terrain ne s’amortit pas. | « … l’amortissement réduit l’impôt sur tes loyers pendant des années. Mais depuis 2025, il est repris dans le calcul de la plus-value à la revente. » | important |
| définition PEL | « Compte d'épargne bloqué 4 ans minimum … Permet d'obtenir un prêt immobilier à taux préférentiel. » | Le PEL n’est pas bloqué : un retrait le clôture. Les 4 ans conditionnent le droit au prêt. Le prêt d’un PEL ouvert depuis 2018 n’a rien de « préférentiel » (taux du PEL + 1,2 point). | « … Tu peux le fermer quand tu veux, mais tout retrait le clôture. Après 4 ans, il ouvre droit à un prêt immobilier à taux connu d’avance. » | gênant |
| définition Plan d'Épargne Retraite | « Bloqué jusqu'à la retraite (sauf accidents de la vie). » | Il manque l’achat de la résidence principale, autre cas de déblocage anticipé. | « Bloqué jusqu’à la retraite, sauf accidents de la vie ou achat de ta résidence principale. » | gênant |
| définition complète Plan d'Épargne Retraite | « te rapporte 1 500€ de réduction d'impôts immédiate. Tes 5 000€ ne t'ont « coûté » que 3 500€ nets. » | Confusion entre déduction et réduction d’impôt, une distinction que le projet tient à garder. L’économie n’arrive que l’année suivante, et la sortie est imposée. | « … ta déduction te fait économiser 1 500 € d’impôt l’année suivante. Attention : à la sortie, cet argent sera imposé. » | important |
| définition complète Salaire net imposable | « salaire brut 2 500€ → net imposable 2 050€ (après cotisations) → net à payer 1 850€ (après prélèvement à la source si taux 10%). » | Calcul faux : 10 % de 2 050 font 205 €, et le prélèvement se retire du net avant impôt (environ 1 950 €), pas du net imposable. Net à payer : environ 1 745 €. | « Brut 2 500 € → net avant impôt environ 1 950 € → net imposable environ 2 050 € (il inclut une part de CSG). Avec un taux de 10 %, 205 € sont prélevés : il te reste environ 1 745 €. » | important |
| définition complète Prélèvement à la source | « Sur un salaire brut de 2 500€, ton employeur prélève l'impôt à la source à 8% = 200€. Tu reçois 2 050€ - 200€ = 1 850€ net à payer. Plus de surprise en septembre. » | Le taux s’applique au net imposable, pas au brut. Même erreur de soustraction que ci-dessus. L’exemple contredit Salaire net imposable (10 % ici, 8 % là). Des régularisations en septembre existent toujours. | « Net imposable 2 050 €, taux 8 % : ton employeur retient 164 €. Sur ton net avant impôt d’environ 1 950 €, il te reste environ 1 786 €. Les écarts se régularisent à la fin de l’été. » | important |
| définition complète Plus-value immobilière | « Plus-value de 80 000€ taxée à ~36% après abattements = ~28 000€ d'impôts. » | Calcul faux : 36,2 % est le taux avant abattements. Après 10 ans (30 % d’abattement sur l’impôt, 8,25 % sur les prélèvements sociaux), on arrive à environ 23 000 € (10 640 € + 12 625 €), et moins avec le forfait de frais d’acquisition. | « … après 10 ans, les abattements réduisent la base : environ 23 000 € d’impôt et de prélèvements sociaux. » | important |
| définition complète Crédit revolving | « Tu rembourses 50€/mois mais le taux est à 18%/an. Tu mets 5 ans à rembourser 1 500€ utilisés. » | Calcul faux : à 18 % et 50 € par mois, il faut 41 mois (environ 3 ans et demi) et environ 2 010 € versés. | « … tu mets presque 3 ans et demi à rembourser, et tu verses environ 2 000 € pour 1 500 € empruntés. » | important |
| définition Dette publique | « La France est à ~110% du PIB, soit ~3 100 milliards€. » | Chiffre périmé : en 2025, plus de 115 % du PIB et environ 3 400 milliards €. | « La dette de la France dépasse 115 % du PIB, soit plus de 3 400 milliards d’euros. » | important |
| définition complète Notation crédit | « L'Allemagne est notée AAA (emprunte à 2%). La Grèce est notée BB (doit payer 4-5%). » | Faux en 2026 : la Grèce a retrouvé une note BBB dès 2023-2024 et emprunte à peine plus cher que la France. | Rester générique : « Un État noté AAA emprunte moins cher qu’un État noté BB, parce que le risque qu’il ne rembourse pas est plus faible. » | important |
| définition complète Action préférentielle | « Berkshire Hathaway possède des actions préférentielles d'Apple » | Faux : Apple n’a pas d’actions de préférence. Berkshire détenait des actions ordinaires. | « Une entreprise émet des actions de préférence : leurs détenteurs touchent leur dividende avant les autres, mais ne votent pas en assemblée. » | important |
| définition complète Réplication synthétique | « L'ETF Amundi S&P 500 eligible PEA utilise la réplication synthétique … via un compte-titre européen éligible au PEA. » | Faux : il ne passe pas par un « compte-titre ». Il détient un panier d’actions européennes et échange leur performance contre celle du S&P 500 (swap). Il manque l’accent sur « éligible ». Nom de produit précis. | « Un ETF S&P 500 éligible au PEA détient en réalité des actions européennes, et un contrat d’échange (swap) lui verse la performance du S&P 500. » | important |
| définition Réplication synthétique | « Moins transparent mais souvent plus fiscal sur PEA. » | « plus fiscal » ne veut rien dire. | « Moins transparente, mais elle permet de loger des indices non européens dans un PEA. » | gênant |
| définition complète Stop-loss | « Si l'action chute à 90€, elle se vend automatiquement — tu perds 10% maximum. » | Faux : le stop devient un ordre au marché, qui peut s’exécuter bien plus bas, par exemple à l’ouverture après une mauvaise nouvelle. | « … elle se vend automatiquement, en général autour de 90 €. Si le cours chute d’un coup, la vente peut se faire plus bas. » | important |
| définition complète Stablecoin | « L'USDC vaut toujours ~1$. Tu peux convertir tes Bitcoin en USDC pendant une correction de marché pour « sécuriser » tes gains » | « toujours » est faux : l’USDC est tombé à 0,87 $ en mars 2023. La suite est un conseil de trading sur des actifs précis. | « Un stablecoin vise à valoir 1 $ en permanence. Il a déjà décroché : en 2023, l’un des plus connus est tombé à 0,87 $. » | important |
| définition Taux d'usure ; définition complète Taux d'usure | « Taux d'intérêt maximum légal… » ; « Si le taux d'usure pour un crédit immobilier est de 4.5%, ta banque ne peut pas te prêter à 5%. » | Le taux d’usure s’applique au TAEG, pas au taux nominal. Exemple déconnecté de la valeur 2026 (5,29 % sur 20 ans et plus). | « Coût total maximum légal (TAEG) d’un crédit. Exemple : sur 20 ans et plus, le plafond est de 5,29 % ; une banque ne peut pas te prêter à 5,5 % tout compris. » | gênant |
| définition complète Prélèvement automatique | « Si un prélèvement passe alors que ton compte est vide, tu paies des frais d'incident (généralement 20€). » | Confus : si le prélèvement est rejeté, les frais vont jusqu’à 20 € (sans dépasser le montant) ; s’il passe, ce sont une commission d’intervention (8 €) et des agios. | « Si ton compte est vide, la banque peut rejeter le prélèvement (jusqu’à 20 € de frais) ou le payer quand même (8 € de commission, plus des agios). » | gênant |
| définition complète Déclaration fiscale | « tu dois déclarer ta plus-value chaque mai. Les courtiers comme Boursorama fournissent un IFU » | La déclaration se fait au printemps (avril à juin). Marque citée, et renommée BoursoBank en 2024. | « … tu la déclares l’année suivante, au printemps. Ton courtier t’envoie un IFU qui récapitule tout. » | gênant |
| définition Participation | « (entreprises >50 salariés) » | La participation est obligatoire à partir de 50 salariés. | « (entreprises d’au moins 50 salariés) » | cosmétique |
| définition Virement SEPA | « Instantané ou en 24h selon les banques. » | Depuis 2025, toutes les banques de la zone euro doivent proposer le virement instantané au même prix que le virement classique. | « Instantané ou en un jour ouvré ; depuis 2025, l’instantané ne peut pas coûter plus cher que le classique. » | cosmétique |
| définition Taux de remplacement ; définition complète Taux de remplacement | « ta retraite de base 1 500€ … Tu dois trouver 1 500€/mois d'autres sources » | Le taux de remplacement inclut la complémentaire : « de base » induit en erreur, et « Tu dois » est injonctif. | « … si ta retraite totale est de 1 500 €, ton taux de remplacement est de 50 % : il manque 1 500 € par mois pour garder ton niveau de vie. » | gênant |

### 3 B.2 Exemples de titres, de marques ou de cryptos précis, qui ressemblent à un conseil ou promettent un gain

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| définition complète Action | « Si Apple vaut 3 000 milliards$ et émet 16 milliards d'actions, chaque action vaut environ 187$. Acheter 10 actions = posséder une infime partie d'Apple. » | Titre précis et cours en dur, périmés dès maintenant. Unités mal écrites. | « Si une entreprise vaut 100 millions d’euros et compte 1 million d’actions, chaque action vaut environ 100 €. En acheter 10, c’est posséder une toute petite part de l’entreprise. » | important |
| définition complète ETF | « Acheter 1 part de l'ETF CW8 à 400€, c'est investir dans 1 500 entreprises … avec seulement 0.38% de frais annuels. » | Produit précis présenté comme une évidence (conseil implicite). Prix périmé (plus de 500 € en 2026). Environ 1 350 entreprises aujourd’hui. | « Une seule part d’un ETF monde, c’est un morceau de plus de 1 000 entreprises, avec des frais de l’ordre de 0,2 à 0,4 % par an. » | important |
| définition complète ETF à capitalisation ; définition ETF à capitalisation | « L'ETF CW8 est à capitalisation… » ; « Recommandé pour les investisseurs long terme… » | Produit précis et recommandation. | « Un ETF monde à capitalisation réinvestit les dividendes à ta place. Utile si tu n’as pas besoin de revenus tout de suite. » | important |
| définition complète DCA | « Investir 50€ en Bitcoin chaque semaine, peu importe le cours. » | Exemple crypto précis qui sonne comme un conseil d’achat. | « Investir 50 € chaque mois dans un ETF, quel que soit le cours… » ou rester neutre : « dans le même placement ». | important |
| définition complète DeFi | « Sur Aave (DeFi), tu peux prêter tes USDC et recevoir 5% d'intérêts/an automatiquement, sans banque. » | Protocole et taux précis, promesse de gain sans un mot sur le risque (piratage, faillite du protocole). | « Sur une plateforme DeFi, tu peux prêter des stablecoins contre des intérêts, sans banque, mais aussi sans garantie ni recours en cas de piratage. » | important |
| définition complète Staking | « En stakant de l'Ethereum, tu peux gagner ~4%/an en ETH. » | Promesse de gain, taux périmé (environ 3 %), anglicisme « stakant ». | « En immobilisant de l’ether, tu reçois des récompenses en ether (quelques % par an), dont la valeur en euros peut fondre. » | important |
| définition complète Altcoin | « Seuls quelques-uns (Ethereum, Solana...) ont prouvé leur utilité et survie dans le temps. » | Caution donnée à des cryptos précises (le même cas que « ex. Solana… » de l’audit précédent, ailleurs). | « La plupart perdent de la valeur avec le temps, et même les plus connues restent très volatiles. » | important |
| définition complète Bitcoin | « En 2024, environ 19.5 millions sont déjà minés. Cette rareté est un argument pour sa valeur à long terme. » | Chiffre périmé (près de 20 millions en 2026). L’argument de valeur sonne promotionnel. | « Près de 20 millions ont déjà été créés. Ses partisans voient dans cette rareté un argument, mais elle ne garantit rien. » | important |
| définition complète Halving | « Moins de nouveaux BTC créés = potentiellement plus de rareté et hausse des prix. » ; définition « Historiquement associé à des bull markets. » | Promesse implicite de hausse. | « Moins de bitcoins créés chaque jour. Certains y voient un signal de hausse, mais le passé ne prédit pas la suite. » | gênant |
| définition complète SCPI | « Tu touches ~4-5%/an de rendement (400-500€/an) sans gérer aucun locataire. » | Promesse de gain : les revenus ne sont pas garantis, des parts ont perdu jusqu’à 20 à 40 % en 2023-2024, et les frais d’entrée tournent autour de 10 %. | « Les SCPI versent souvent 4 à 5 % par an, sans garantie : les revenus et la valeur des parts peuvent baisser, et les frais d’entrée tournent autour de 10 %. » | important |
| définition complète Crowdfunding | « Sur la plateforme October, tu prêtes 500€ à une PME française à 6%/an … puis tu récupères les 500€. » | Plateforme précise (dont l’activité est peut-être arrêtée, à vérifier). Promesse de remboursement sans un mot sur le risque de défaut. | « Sur une plateforme de financement participatif, tu prêtes 500 € à une PME à 6 % par an. Si elle fait faillite, tu peux tout perdre. » | important |
| définition complète Frais bancaires | « Une banque en ligne comme Boursorama propose la gratuité totale. » | Publicité pour une marque, renommée BoursoBank, et « totale » est faux (conditions). | « Beaucoup de banques en ligne ne facturent ni carte ni tenue de compte, sous conditions. » | important |
| définition complète Wallet | « Si tu gardes tes cryptos sur un exchange (comme Binance)… Un Ledger te donne le contrôle total. » ; définition « Un wallet « froid » (Ledger) » | Marques précises recommandées. Citation anglaise non traduite (« Not your keys, not your coins. »). | « « Pas tes clés, pas tes cryptos. » Sur une plateforme, c’est elle qui garde les clés. Un portefeuille matériel, hors ligne, te les laisse. » | gênant |
| définition complète Bear market | « C'était un bear market — une opportunité d'achat pour les investisseurs à long terme. » | Incitation à acheter. | « C’était un bear market. Ceux qui ont gardé leurs placements ont retrouvé leur niveau en 2024. » | gênant |
| définition complète Gestion passive | « Acheter un ETF MSCI World et le garder 30 ans sans rien faire … Pas de stress, frais minimes, performance historique de ~8%/an. » | Promesse (« Pas de stress ») et chiffre présenté comme acquis. | « … C’est de la gestion passive. Par le passé, ce type d’indice a rapporté autour de 7 à 8 % par an en moyenne, avec des années à −30 %. » | gênant |
| définition complète Benchmark | « Il a sous-performé de 17% — mieux vaut un ETF passif. » | Conseil, et c’est 17 points, pas 17 %. | « Il a fait 17 points de moins que son indice de référence. » | gênant |
| définition complète Dividende | « TotalEnergies verse ~3€ de dividende par action par an. … tu reçois 300€/an juste pour les détenir. » | Titre précis, montant périmé, montant brut alors que 31,4 % de flat tax s’applique, et « juste pour les détenir » sonne comme une promesse. | « Une entreprise verse 3 € par action et par an. Avec 100 actions, tu touches 300 € bruts, soit environ 206 € après la flat tax. » | gênant |
| définition complète Portefeuille ; définition complète Allocation d'actifs | « Le portefeuille de Quentin : 60% ETF monde, 20% obligations, 10% or, 10% crypto. » ; « À 25 ans, tu peux avoir 90% actions / 10% obligataires. À 55 ans, 50/50. » | Allocations modèles qui ressemblent à un conseil personnalisé. | Les présenter comme des illustrations : « Par exemple, un portefeuille peut mélanger… Chaque répartition dépend de ton horizon et de ta tolérance aux baisses. » | gênant |
| définition complète Fonds monétaire | « les fonds monétaires ont rapporté ~3.8%/an sans risque. Une opportunité rare qui ne se représente pas souvent. » | « sans risque » est trop fort (très peu risqué, mais pas garanti). Le ton d’urgence est périmé : environ 2 % en 2026. | « … ont rapporté près de 4 % en 2023, avec très peu de risque. Leur rendement suit les taux de la BCE, autour de 2 % en 2026. » | gênant |
| définition complète Effet latte | « Ton café quotidien a une « vraie » valeur de 165 000€ sur une vie active. » ; définition « Un café à 5€/jour = 1 825€/an. » | Culpabilisation (le ressort même de « l’effet latte »). 8 % présentés comme acquis. La définition parle de 5 €, l’exemple de 4 €. | « 4 € par jour, c’est 1 460 € par an. Placés à 8 % pendant 30 ans, ça pourrait faire 165 000 €. À toi de voir si ce café vaut ça pour toi, et il peut tout à fait le valoir. » | gênant |
| définition complète Capacité d'épargne ; définition complète Retraite par capitalisation | « Sur 10 ans à 7% de rendement, ça devient ~58 000€. » ; « Tes versements sont investis et fructifient. » | Rendement présenté comme acquis. | « … si tes placements rapportent 7 % par an en moyenne, ce qui n’est pas garanti, ça peut devenir environ 58 000 €. » | gênant |
| définition Private equity | « Rendements potentiels élevés (15-20%) » | Fourchette chiffrée qui sonne comme une promesse. | « Rendements parfois élevés, pertes possibles, argent bloqué 5 à 10 ans. » | cosmétique |
| définition complète Vente à découvert ; définition complète Options ; définition complète Warrants | « Tu « empruntes » 100 actions Tesla à 200$… » ; « Tu achètes un call option Apple à 200$… » ; « Un warrant call sur Apple… » | Titres précis et spéculation présentée à la deuxième personne, sans dire que la perte d’une vente à découvert est illimitée. | Exemples génériques (« une action à 200 € »). Ajouter, pour la vente à découvert : « Si le cours monte, ta perte n’a pas de limite. » | gênant |
| définitions complètes Ordre de marché, Ordre limite, Carnet d'ordres, Séance boursière, Liquidité, IFI, Marché secondaire, ROE, Bilan, Marge brute, Buyback, Stock-options | « acheter 10 actions Apple … par exemple 182.50$ », « Apple est à 185$ », « Dans le carnet d'ordres d'Apple… », etc. | Douze exemples tournent autour d’Apple, souvent avec un cours en dur (182 à 187 $, très loin du cours de 2026). L’accumulation donne l’impression d’une valeur mise en avant. | Remplacer par « une action à 50 € » ou par des entreprises fictives. Supprimer partout les cours en dur. | gênant |

### 3 B.3 Chiffres de marché en dur, exemples datés, incohérences entre termes

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| définition Market cap | « Capitalisation boursière — voir Capitalisation. » | Mauvais renvoi : le terme « Capitalisation » parle du réinvestissement des intérêts, pas de la valeur en bourse. | « Capitalisation boursière : voir ce terme. » | gênant |
| définition PER ; définition Plan d'Épargne Retraite | « PER (Bourse) : Price Earning Ratio… » / « Plan d'Épargne Retraite : PER — … » | Homonymes : qui cherche « PER » tombe sur le ratio boursier plutôt que sur le plan retraite. | Renommer le premier « PER (ratio cours/bénéfice) » et le second « PER (plan d’épargne retraite) ». | gênant |
| définition complète Carnet d'ordres ; définition complète Spread | « Le spread (écart) est de 1$. » (Apple) / « Une action Apple se vend à 182.50$ et s'achète à 182.52$. Le spread de 0.02$… » | Contradiction : 1 $ d’écart sur Apple d’un côté, 0,02 $ de l’autre. Le carnet montre des quantités, pas un nombre d’« acheteurs ». | Carnet d’ordres : « 500 actions demandées à 49,98 €, 300 offertes à 50,00 € : l’écart est de 2 centimes. » | gênant |
| définition complète Chiffre d'affaires ; définition complète Marge nette | « Amazon a 500 milliards$ de CA mais une marge nette de seulement 3-4%. Hermès … une marge de 40%. » / « Hermès a une marge nette de 30% » | Marge d’Hermès incohérente entre les deux termes (40 % et 30 %). Les chiffres d’Amazon sont périmés (plus de 600 milliards $ et environ 9 % de marge en 2024). | Exemples génériques : « un supermarché garde 1 à 2 % de ce qu’il vend, une maison de luxe 30 % ». | gênant |
| définition complète Taux directeur ; définition complète BCE | « Ton taux immobilier passe de 2% à 4.5%. » / « les crédits immobiliers ont bondi de 1% à 4% » | Incohérence entre les deux termes. Le taux immobilier ne suit pas le taux directeur point pour point. | Taux directeur : « … les taux des crédits immobiliers montent souvent dans la foulée, comme en 2022-2023 (de 1 % à 4 % environ). » | gênant |
| définition complète Prélèvement à la source ; définition complète Salaire net imposable | « 8% = 200€ » / « si taux 10% » | Même salaire, mêmes chiffres, deux taux différents (voir 2.1). | Harmoniser sur un seul exemple. | gênant |
| définition Épargne de précaution | « Doit représenter 3 à 6 mois de charges fixes » | Incohérent avec la leçon 101, qui raisonne en mois de dépenses courses comprises, avec un premier palier à 1 mois. Or « Charges fixes » exclut les courses (définition Charges variables). « Doit » est injonctif. | « Argent de côté pour les imprévus. Premier palier : un mois de dépenses ; ensuite, 3 à 6 mois selon ta situation. » | gênant |
| définition Épargne | « Fonds mis de côté en sécurité, disponibles rapidement, à faible rendement. » | Trop étroite : c’est la définition de l’épargne de précaution. L’épargne recouvre aussi les placements de long terme. | « Part de tes revenus que tu ne dépenses pas, qu’elle dorme sur un livret ou qu’elle soit placée. » | gênant |
| définition Levier immobilier | « ton rendement réel est de 25%. » | « réel » a un sens précis dans le dictionnaire (taux réel = après inflation). Le calcul oublie aussi les intérêts et les frais. | « … ton gain sur ton apport est de 25 %, avant intérêts et frais. » | gênant |
| définition complète Gestion active | « Un fonds actif facture 2%/an et fait +6%. Son benchmark ETF facture 0.3% et fait +8%. Après frais, l'ETF donne +7.7% vs +6% » | Mélange de brut et de net : si le fonds fait +6 % avant frais, il donne +4 % après. | « Avant frais, les deux font +8 %. Après frais, le fonds actif donne +6 %, l’ETF +7,7 %. » | gênant |
| définition complète Tracking error | « la tracking error est de 0.3% — principalement due aux frais de gestion de 0.38%. » | Des frais (0,38 %) supérieurs à l’écart expliqué (0,3 %). En toute rigueur, il s’agit de l’écart de suivi. | « … un écart de 0,3 %, dû surtout aux frais de 0,2 à 0,3 % par an. » | cosmétique |
| définition complète Courbe des taux | « En 2022-2023, la courbe des taux américaine s'est inversée. Historiquement, cela précède une récession de 12-18 mois. » | Vu de 2026, l’exemple dit le contraire : aucune récession américaine n’a suivi. | « … Cette fois, la récession attendue n’est pas venue : c’est un signal, pas une certitude. » | gênant |
| définition complète Récession | « Des millions d'emplois ont été détruits. » | Pour la France, c’est faux (quelques centaines de milliers d’emplois). La phrase suit une mention du PIB français. | « Des centaines de milliers d’emplois ont disparu en France. » | gênant |
| définition Or | « Protège contre l'inflation et les crises. … conserve son pouvoir d'achat. » ; définition complète « ~2 300$ en 2024 » | Trop catégorique : l’or a perdu environ deux tiers de sa valeur réelle entre 1980 et 2001. Cours périmé (plus de 4 000 $ fin 2025). | « Souvent recherché pendant les crises, il suit l’inflation sur très longue période, avec de longues baisses. » Retirer le cours. | gênant |
| définition Taux nominal ; définition Taux réel | « Un livret à 3% … inflation à 2% » ; « livret à 3% et une inflation à 3.5% » | En 2026, aucun livret réglementé ne rapporte 3 %. Le cas réel est plus parlant. | « Le Livret A rapporte 1,7 % et l’inflation tourne autour de 2 % : ton taux réel est d’environ −0,3 %. » | cosmétique |
| définition complète Déficit budgétaire ; définition complète PIB ; définition complète CAPE ; définition complète Hedge fund ; définition complète Support et résistance | « En 2023, la France a un déficit de 5.5% … », « environ 2 800 milliards€ », « Le CAPE américain est à 33 en 2024 », « 150 milliards$ gérés », « rebondi plusieurs fois sur 25 000$ » | Chiffres datés, au présent, qui vieillissent mal (PIB d’environ 3 000 milliards € en 2025 ; bitcoin très loin de 25 000 $). | Mettre au passé avec la date, ou passer à des exemples génériques. | cosmétique |
| définition complète Gas fees ; définition complète Layer 2 | « tu peux payer 5-50$ de gas fees selon l'heure » ; « Arbitrum (Layer 2) en traite 40 000/seconde » | Frais d’Ethereum périmés (souvent moins de 1 $ depuis 2024), capacité d’Arbitrum théorique, présentée comme un fait. | « … les frais varient, de quelques centimes à plusieurs dollars quand le réseau est saturé. » | cosmétique |
| définition complète Tracker | « Le tracker Lyxor S&P 500… » | Gamme Lyxor absorbée par Amundi : nom de produit précis et périmé. | « Un tracker S&P 500 suit l’indice… » | cosmétique |
| définition complète Euronext ; définition Euronext | « LVMH, Total, Airbus... » ; « Paris, Amsterdam, Bruxelles, Lisbonne, Oslo, Milan » | « Total » s’appelle TotalEnergies depuis 2021, nom bien utilisé ailleurs dans le dictionnaire. Il manque Dublin (et Athènes). | « LVMH, TotalEnergies, Airbus… » ; ajouter Dublin. | cosmétique |
| définition Indice boursier ; définition complète Indice boursier | « Le CAC 40 regroupe les 40 plus grandes entreprises françaises » ; « ont en moyenne gagné 1% de valeur » | Ce sont des valeurs cotées à Paris, pas toutes françaises, et la moyenne est pondérée par la taille. | « … 40 grandes valeurs cotées à Paris … ont gagné 1 % en moyenne, les plus grosses pesant le plus. » | cosmétique |
| définition complète Capitalisation boursière ; définition Capitalisation boursière | « LVMH avec 500 millions d'actions à 700€… » ; « C'est ce que le marché accepte de payer pour acheter 100% de la société. » | Cours en dur périmé. Un rachat total coûte plus cher (prime, dette). | « Une entreprise de 500 millions d’actions à 100 € vaut 50 milliards d’euros en bourse. » ; « C’est ce que vaut l’entreprise au cours du jour. » | cosmétique |
| définition complète Bilan ; définition Bilan | « 280 milliards$ de passif (dettes), 70 milliards$ de capitaux propres » | En comptabilité française, le passif comprend les capitaux propres. Chiffres d’Apple datés. | « … à droite, ce qu’elle doit (dettes) et ce qui revient aux actionnaires (capitaux propres) ; les deux forment le passif. » | cosmétique |
| définition Buyback | « augmentant mécaniquement la valeur des actions restantes. » | Imprécis : c’est le bénéfice par action qui augmente, pas la valeur (de la trésorerie sort de l’entreprise). | « … chaque action restante représente une plus grosse part des bénéfices. » | cosmétique |
| définition complète Fusion-acquisition | « c'est une acquisition. Les deux entités fusionnent » | Contradiction dans la même phrase. | « … c’est une acquisition : la biotech devient une filiale de Sanofi. » (ou une entreprise fictive) | cosmétique |
| définition complète Renégociation | « Renégocier te fait économiser 50 000€ d'intérêts sur 20 ans » | Le montant emprunté manque, donc le chiffre ne se vérifie pas (il faut environ 300 000 €). | « Pour 300 000 € empruntés sur 20 ans, passer de 4 % à 2,5 % fait économiser environ 50 000 € d’intérêts. » | cosmétique |
| définition complète Venture capital | « sa participation vaut 5 milliards$. Un seul jackpot couvre 100 échecs. » | Multiplication par 10 000, alors que la définition parle de « 100x la mise ». Chiffre sur Uber approximatif. | Exemple générique : « Sur 20 start-up, 18 échouent, une rapporte sa mise, une la multiplie par 100. » | cosmétique |

### 3 B.4 Langue, jargon, anglicismes, typographie

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| définition complète Inflation | « si tu n'investis pas, tu t'appauris automatiquement. » | Faute d’orthographe (« t'appauvris ») et ton culpabilisant. | « Un argent qui ne rapporte rien perd un peu de sa valeur chaque année. » | important |
| définition complète Flat tax | « Sauf si tu êtes dans une tranche basse d'IR. » | Faute de conjugaison (« tu es »). Déjà comptée en 2.1. | voir 2.1 | important |
| définition Plus-value latente ; définition complète Prélèvements sociaux | « Tant que tu ne vends pas, tu n'es pas imposé. » ; « Même exonéré d'impôt… » | Masculin implicite. | « Tant que tu ne vends pas, tu ne paies pas d’impôt. » ; « Même sans impôt sur le revenu… » | gênant |
| définition complète Marge nette | « Hermès vend du désir, Carrefour vend des commodités. » | Faux ami : en français, « commodités » veut dire confort, voire toilettes. | « … un supermarché vend des produits de tous les jours. » | gênant |
| définition Caisse populaire | « Caisse populaire (Banque) : Banque coopérative… » | Terme québécois (Desjardins). En France, on dit « banque mutualiste » ou « coopérative ». | Renommer en « Banque mutualiste ». | gênant |
| définition complète Currency peg | « Le dirham émirati est peggé au dollar à 3.67. » | Franglais (« peggé »), et l’entrée elle-même est en anglais. | « … est arrimé au dollar (3,67 dirhams pour 1 dollar). » Renommer l’entrée en « Change fixe ». | cosmétique |
| définitions Rebalancement, Stablecoin, Staking, Mining, Wallet, Yield, Buyback, Market cap, Tracking error, Futures, Phrase de récupération, KYC, Capitalisation, ETF à distribution | « Rebalancement », « Tu rebalances », « stakant », « offline », « brokers, exchanges crypto », « en cash »… | Anglicismes en série. Les entrées pourraient porter le mot français, avec l’anglais en sous-titre. | « Rééquilibrage », « hors ligne », « courtiers, plateformes crypto », « en argent »… | cosmétique |
| définitions Frais de gestion, Mining, Staking, Ethereum, Layer 2, EBITDA, Analyse technique, Spread, LBO, Sharpe ratio | « Exprimé en TER », « proof of work », « proof of stake », « smart contracts … (DApps) », « Layer 1 », « tête-épaules », « bid / ask », « cash-flows », « taux sans risque » | Jargon jamais expliqué. | Une incise à chaque fois : « TER (frais courants annuels) », « preuve de travail », « contrats automatiques (smart contracts) », etc. | gênant |
| définition Risque ; définition complète Risque | « risque ne veut pas dire 'danger' mais 'volatilité'. … Le bon arbitrage dépend de ton horizon » | Guillemets simples droits au lieu de « ». Réduire le risque à la volatilité tait la perte en capital. « arbitrage » a un autre sens dans le dictionnaire. | « En finance, le risque, c’est surtout l’ampleur des variations, et la possibilité de perdre une partie de ta mise. Le bon dosage dépend de ton horizon. » | gênant |
| définition FED ; définitions Quantitative Easing, Banque centrale | « FED (Économie) » / « la Fed » | Graphie incohérente. | « Fed » partout. | cosmétique |
| définition Trading | « Activité d'achat-vente fréquent » | Accord. | « Achats et ventes fréquents… » | cosmétique |
| définition complète ETF à distribution | « si reinvestis automatiquement » | Accent manquant (« réinvestis »). | « s’ils avaient été réinvestis automatiquement » | cosmétique |
| définition complète Budget base zéro | « 200€ fonds urgence » | « fonds d'urgence ». C’est aussi un nouveau synonyme de « coussin » (voir le lexique). | « 200 € pour ton coussin » | cosmétique |
| définition complète Foncière cotée | « Klepierre … Tu peux acheter et revendre tes parts » | « Klépierre » prend un accent. Ce sont des actions, pas des parts. | « … tu achètes et revends ses actions en quelques secondes. » | cosmétique |
| définition complète Duration | « Les obligations longues duration » | Tournure fautive. | « Les obligations à longue duration » | cosmétique |
| définition complète Quotient familial | « 80 000/3 = 26 666€/part » | L’arrondi correct est 26 667. Les revenus bruts sont confondus avec le revenu imposable (après abattement de 10 %). | « 72 000 € de revenu imposable ÷ 3 = 24 000 € par part » | cosmétique |
| définition Unité de compte, Crowdfunding, PEE, S&P 500, CAC 40, MSCI World | « Unité de compte (Fiscalité) », « Crowdfunding (Bourse) », « PEE (Retraite) », « S&P 500 (ETF) »… | Catégories incohérentes : des indices rangés sous « ETF », une épargne salariale sous « Retraite ». | Ranger les indices dans « Bourse », le PEE dans une catégorie « Entreprise » ou « Épargne salariale ». | cosmétique |
| les 203 termes (systématique) | « 0.38% », « 17.2% », « 3.125 BTC », « 7.58M$ » (37 décimales à point) | Séparateur décimal anglais, alors que les gabarits affichent « 1,7 % ». Très visible. | Virgule décimale partout : « 0,38 % », « 3,125 BTC ». | gênant |
| les 203 termes (systématique) | « 20% » (198 fois), « 4 600€ » (202 fois), « 187$ », « milliards$ » (60 fois), « 2M€ », « 86Md€ », « 9h-17h30 », « 30j » | Unités collées au nombre, abréviations hétérogènes (« Md€ », « M€ », « milliards€ »). | « 20 % », « 4 600 € », « 187 $ », « 3 000 milliards de dollars », « 2 millions d’euros », « 9 h-17 h 30 », « 30 jours » (espace insécable). | cosmétique |
| les 203 termes (systématique) | « ... » (24 fois), « ~4% », « +8 ans », « x5 », « vs » | Points de suspension en trois points, symboles à la place des mots. | « … », « environ 4 % », « plus de 8 ans », « ×5 », « contre ». | cosmétique |
| les 203 termes (systématique) | apostrophe droite dans tous les termes (aucune ’) | Typographie du projet non respectée. | Remplacer ' par ’. | cosmétique |
| 12 termes sans définition complète (Bourse, Diversification, Épargne, FED, Fonds indiciel, Market cap, Rendement, ROI, Token, Trading, Unité de compte, Yield) | FULL: None | Pas forcément visible (le champ est null), mais ces termes n’ont aucun exemple. | Ajouter un exemple court, ou vérifier que la fiche n’affiche pas de bloc vide. | cosmétique |

### 3 B.5 Manques par rapport aux leçons publiées

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| dictionnaire (termes absents) | (aucun terme) | La leçon 102 s’appuie sur « Livret jeune » et sur « revenu fiscal de référence », qui ne sont pas dans le dictionnaire. « Garantie des dépôts » et « Moins-value latente » (leçon 100) n’y sont pas non plus. | Ajouter « Livret jeune » ({{livret_jeune_taux}} minimum, {{livret_jeune_plafond}}, de 12 à 25 ans), « Revenu fiscal de référence » et « Garantie des dépôts » (100 000 €). | gênant |
| définition Caution vs leçon n° 100 écran 4 | « Caution (Immobilier) : Alternative à l'hypothèque… » / « Tu dois avancer 1 800 € de caution, sans épargne » | Dans la leçon, « caution » veut dire dépôt de garantie d’un logement. Dans le dictionnaire, c’est la garantie d’un prêt. | Leçon : « Tu dois avancer 1 800 € de dépôt de garantie ». | cosmétique |

---

### 3 B. Lexique relevé (leçons publiées et dictionnaire)

- **coussin** : module 182 (description), leçons 101 (écrans 1 et 2 : « calculer un coussin », « base au coussin » ; écran 5 : « le coussin doit être épais »), 102 (titre, écrans 1, 2, 7), 103 (écrans 1, 3, 5) ; c’est le terme principal du module.
- **épargne de sécurité** : leçon 101 écran 3 (« premier palier d'épargne de sécurité »).
- **argent de sécurité** : leçon 102 écran 1.
- **filet / fenêtre sans filet** : leçon 103 écrans 2, 3, 4 et 5.
- **réserve** : leçon 100 écran 4 (« sans aucune réserve »).
- **argent de côté / rien de côté** : leçon 100 écrans 1, 3, 4, 5 ; leçon 101 (titre).
- **épargne de précaution** : définition Épargne de précaution. Le module ne l’emploie jamais : il faudrait que le dictionnaire mentionne « coussin » (ou l’inverse).
- **fonds urgence** : définition complète Budget base zéro.
- **placements / investi / investir** : leçon 100 (tous les écrans), leçon 101 écran 6, leçon 103 écrans 3 et 4.
- **portefeuille** : leçon 100 écran 5 (« un portefeuille en baisse de 20 % ») au sens de l’ensemble des placements ; définition Portefeuille (même sens) ; définition Wallet (« Portefeuille numérique », autre sens).
- **livret** (sans précision) : leçons 100 (écrans 1 et 6), 101 (écran 6), 103 (écrans 3, 4 et 5).
- **Livret jeune** (j minuscule) : leçon 102, partout. Absent du dictionnaire.
- **Fed / FED** : définitions FED, Quantitative Easing, Banque centrale.
- **PER** : deux sens (définition PER = ratio ; définition Plan d’Épargne Retraite).
- **leçon / module** : module 182 « Ne jamais être obligé de vendre » ; leçons 100 à 103. Les écrans n’emploient jamais ces mots, sauf « L'écran suivant » (leçon 101 écran 4).
- **série, Vals, XP, inscription, compte, révision, univers, chapitre** : jamais employés dans ce périmètre.
- **paie / salaire** : leçon 100 écran 6 (« ta paie »), leçon 101 écrans 2 et 3 (« salaire »).
- **prime** : leçon 101 écran 6, leçon 103 écran 4.
- **Prénoms** : Nora et Tom (100), Sacha, Léa et Karim (101), Léa (102, une autre personne), Marie, Lucas, Clara, Thomas, Sophie et Quentin (dictionnaire).

---

# 4. Articles (échantillon de 50 articles : les 25 plus récents et 25 evergreen)

> **Mise au point de l'audit.** L'API ne sert que 38 articles (scope `Article::published()` : `is_published`, statut `approved` ou `published`, et `published_at`). Les 226 brouillons marqués `is_published = 1` mais au statut `draft` ne sont **pas visibles dans l'app** aujourd'hui. Les remarques ci-dessous sur les articles « draft » (4 A, articles 3 à 25, et 4 B. C) concernent donc la base du site, pas l'app ; seuls les articles 1 et 2 de 4 A et ceux de 4 B. B sont servis.

Sur 264 articles avec `is_published = 1`, seuls 32 ont `status = published` ; les autres sont des brouillons générés automatiquement, mais affichés. Vérifié à la source (prod-contenu.json) : leur contenu s’arrête en plein mot, ce n’est pas un effet de l’extraction.

## 4 A. Les 25 articles les plus récents

Source : `extraits/articles.txt` (264 articles avec is_published=1). J'ai relu en entier les 25 premiers, du 19/09/2026 au 06/09/2026. J'ai refait tous les calculs d'intérêts composés et de mensualités (versements mensuels, capitalisation mensuelle).

### 4 A. Les 25 slugs relus

1. bitcoin-ether-solana-ce-qui-a-porte-le-rebond-du-18-septembre (19/09, published)
2. bitcoin-un-signal-lie-aux-fins-de-marche-baissier-reapparait (18/09, published)
3. la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-sa-residence-principale-devient-presque-impossible (17/09, draft)
4. le-taux-dinteret-compose-larme-secrete-pour-faire-fructifier-ton-epargne-sans-effort (17/09, draft)
5. la-generation-z-face-a-la-crise-du-logement-pourquoi-devenir-proprietaire-semble-impossible-et-ce-qui-change-vraiment-en-2025 (16/09, draft)
6. le-taux-dinteret-compose-larme-secrete-de-ceux-qui-commencent-tot-7 (16/09, draft)
7. la-fin-du-fonds-euros-garanti-ce-que-les-assureurs-preparent-vraiment-pour-ton-epargne-2 (15/09, draft)
8. le-taux-dinteret-compose-comment-ton-epargne-semballe-avec-le-temps (15/09, draft)
9. la-generation-z-face-a-lexplosion-des-loyers-comment-survivre-et-investir-dans-un-marche-immobilier-qui-vous-ecrase (14/09, draft)
10. leffet-boule-de-neige-des-interets-composes-pourquoi-commencer-tot-change-tout (14/09, draft)
11. la-generation-z-face-au-credit-a-la-consommation-entre-seduction-algorithmique-et-spirale-de-dettes (13/09, draft)
12. le-taux-dinteret-compose-larme-secrete-de-ceux-qui-commencent-tot-6 (13/09, draft)
13. la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-un-appartement-devient-une-mission-impossible-2 (12/09, draft)
14. leffet-boule-de-neige-des-interets-composes-pourquoi-commencer-a-epargner-a-20-ans-change-tout-11 (12/09, draft)
15. la-fin-du-quiet-quitting-financier-pourquoi-les-jeunes-francais-redecouvrent-linvestissement-en-2025-2 (11/09, draft)
16. le-taux-dinteret-compose-larme-secrete-de-ceux-qui-commencent-tot-5 (11/09, draft)
17. la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-devient-une-utopie-pour-des-millions-de-jeunes-francais (10/09, draft)
18. leffet-de-levier-du-temps-pourquoi-commencer-a-epargner-a-22-ans-vaut-mieux-quattendre-32-ans (10/09, draft)
19. la-fin-du-quiet-quitting-financier-pourquoi-les-jeunes-francais-redecouvrent-linvestissement-en-2025 (09/09, draft)
20. le-taux-dinteret-compose-comment-ton-epargne-peut-travailler-seule-pendant-que-tu-dors-3 (09/09, draft)
21. la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-un-bien-immobilier-devient-une-mission-impossible (08/09, draft)
22. le-taux-dinteret-compose-comment-ton-argent-peut-travailler-pour-toi-sans-que-tu-fasses-quoi-que-ce-soit (08/09, draft)
23. la-fin-du-livret-a-a-3-ce-que-le-retour-a-24-va-vraiment-changer-pour-ton-epargne-6 (07/09, draft)
24. leffet-des-frais-caches-sur-ton-epargne-comment-quelques-pourcentages-peuvent-te-couter-des-milliers-deuros (07/09, draft)
25. la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-est-devenu-presque-impossible-et-ce-que-tu-peux-faire (06/09, draft)

---

### 4 A. A. Problèmes transversaux (articles 3 à 25)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| 23 articles sur 25 (tous sauf les deux bitcoin) : ligne d'en-tête | « status=draft » alors que is_published=1 | Statut éditorial « brouillon » pour un article publié. Soit ces brouillons générés automatiquement sont visibles dans l'app par erreur, soit l'un des deux champs est faux. À vérifier en base avant tout. | Dépublier (is_published=0) tout ce qui est « draft » tant qu'un humain ne l'a pas validé. | important |
| 23 articles « draft » : fin du corps | voir la sous-table A1 ci-dessous | Le texte s'arrête en plein mot ou en pleine phrase. Les longueurs se regroupent autour de 5 000 et 9 000 caractères, ce qui fait penser à une génération coupée par une limite de jetons. Il faut confirmer en base que l'extraction n'a pas elle-même tronqué le texte. | Ne pas publier un texte incomplet. Le régénérer ou le terminer à la main. | important |
| 23 articles « draft » : CHAPO | ex. « Entre taux d'emprunt encore élevés, apport impossible à constituer et s... » | Chapô coupé automatiquement en plein mot, suivi de « ... » (trois points au lieu de « … »). | Écrire un vrai chapô de 1 ou 2 phrases complètes. | gênant |
| 23 articles « draft » : 1re ligne du corps | ex. « Le taux d'intérêt composé : l'arme secrète pour faire fructifier ton épargne sans effort » | Le titre est répété au début du corps, puis le chapô est répété aussi. | Supprimer ces deux répétitions dans le corps. | gênant |
| 23 articles « draft » : format | « ## … », « --- », « **…** », tableau « \| \|---\| » | Markdown brut, alors que les articles publiés utilisent des blocs ([heading], [paragraph], [val_recap]…). Il faut vérifier le rendu (titres, filets « --- », tableau de l'article 24). | Convertir au format blocs, avec un [val_recap] final. | gênant |
| Les 25 articles | « L'ether », « d'intérêt », « "huitième merveille du monde" », « 50 €... » | Apostrophe droite ' partout, guillemets droits "…" à la place de « … », « ... » à la place de « … ». C'est systématique. | Remplacer par ’, « … » et …. | cosmétique |
| 9 articles (4, 6, 8, 12, 14, 16, 18, 20, 22) | « Albert Einstein aurait qualifié les intérêts composés de "huitième merveille du monde" » | Citation apocryphe répétée dans presque chaque article sur les intérêts composés. Les articles 18 et 20 font en plus d'Einstein un « mathématicien » (il était physicien). | Supprimer la citation. Sinon : « Une phrase attribuée à tort à Einstein… ». | cosmétique |
| Articles d'intérêts composés (4, 6, 8, 10, 12, 14, 16, 18, 20, 22) | « un rendement réaliste », « rendement historique raisonnable », « un niveau atteignable » | Un rendement de 6 à 7 % par an est présenté comme acquis, souvent sans dire qu'il peut y avoir des années de baisse ni que rien n'est garanti (seul l'article 14 le précise). Cela se rapproche d'une promesse de gain. | « On prend 6 % par an comme hypothèse : c'est un ordre de grandeur historique des actions mondiales, avec des années de baisse et aucune garantie. » | important |

#### A1. Dernières lignes des 23 textes tronqués

| Article | Fin actuelle du texte |
|---|---|
| 3 …residence-principale-devient-presque-impossible | « Si rien ne change structurellement — ni du côté de l » |
| 4 …fructifier-ton-epargne-sans-effort | « La flat tax (ou prélèvement forfaitaire unique) s'élève à **30 %** sur les revenus du » |
| 5 …ce-qui-change-vraiment-en-2025 | « ## Une génération qui » |
| 6 …commencent-tot-7 | « ## La règle des 72 : l'astuce pour calculer » (s'arrête sur un intertitre) |
| 7 …fonds-euros…-2 | « Un portefeuille diversifié » |
| 8 …semballe-avec-le-temps | s'arrête sur un filet « --- » après la règle des 72 |
| 9 …qui-vous-ecrase | « négociation d'une augmentation salariale » |
| 10 …pourquoi-commencer-tot-change-tout | « - En » |
| 11 …credit-a-la-consommation… | « accepter parfois de » |
| 12 …commencent-tot-6 | « parce qu'on par » |
| 13 …mission-impossible-2 | « ni la nécess » |
| 14 …change-tout-11 | s'arrête sur la liste « ETF à **10 %** → 72 ÷ 10 = **7,2 ans** » |
| 15 …en-2025-2 | « C'est » |
| 16 …commencent-tot-5 | « contre 30 % sur un compte-titres » |
| 17 …utopie… | s'arrête à la fin de « Une crise structurelle… », sans conclusion |
| 18 …effet-de-levier-du-temps… | « et après 5 » |
| 19 …en-2025 | « devient de plus en plus diffic » |
| 20 …pendant-que-tu-dors-3 | « c'est sans risque, c'est » |
| 21 …bien-immobilier…mission-impossible | « un jeune qui ne » |
| 22 …sans-que-tu-fasses-quoi-que-ce-soit | « La leç » |
| 23 …livret-a-a-3…-6 | « PEA pour le » |
| 24 …frais-caches… | « C'est l'effet cumulatif des » |
| 25 …ce-que-tu-peux-faire | « Résultat : des décotes de 20 » |

---

### 4 A. B. Tableaux article par article

#### 1. article bitcoin-ether-solana-ce-qui-a-porte-le-rebond-du-18-septembre

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article bitcoin-ether-solana… § « Pourquoi le solana a fait presque le double », 2e paragraphe | « Sur 1 000 euros placés, la séance représentait environ 119 euros de gain en solana, contre 64 euros en bitcoin. » | Gain chiffré associé à une crypto nommée : on peut le lire comme « le solana rapporte plus ». La phrase suivante nuance, mais le chiffre de gain arrive en premier. | « Sur 1 000 €, la séance a fait bouger le solana d'environ 119 € et le bitcoin d'environ 64 €. Les mêmes écarts jouent aussi à la baisse. » | gênant |
| article bitcoin-ether-solana… § « Des parieurs à la baisse… » et § « Les fonds bitcoin achètent… » | « Selon les estimations reprises par CoinGape » ; « selon CoinGape » ; « Selon Reuters, cité par Crypto Times » | Sources secondaires spécialisées crypto, peu fiables. Reuters est cité de seconde main. | Citer la source primaire : Reuters directement, les données de flux des émetteurs d'ETF, un agrégateur de liquidations reconnu. | gênant |
| article bitcoin-ether-solana… § 2 et § « L'humeur a changé… » | « la Réserve fédérale américaine a relevé ses taux d'un quart de point, à une fourchette de 3,75 % à 4 % » ; « remontait vers 5 % » | Faits de septembre 2026 que je ne peux pas vérifier. Ils sont présentés comme certains. | Vérifier chaque chiffre à la source avant de garder l'article. | gênant |
| article bitcoin-ether-solana… § « Des parieurs à la baisse… » | « Des traders avaient parié sur la baisse » | Anglicisme. | « Des spéculateurs avaient parié sur la baisse » | cosmétique |

#### 2. article bitcoin-un-signal-lie-aux-fins-de-marche-baissier-reapparait

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article bitcoin-un-signal… titre | « Bitcoin : un signal lié aux fins de marché baissier réapparaît » | Titre orienté vers la hausse : on peut le lire comme « c'est le moment d'acheter ». La dernière partie de l'article le dément. | « Bitcoin : les acheteurs récents repassent en profit, un signal fragile » | gênant |
| article bitcoin-un-signal… § « Pourquoi CryptoQuant y voit une fin de cycle » | « [quote] The bear market trend only truly reverses once profits settle in for good » | Citation en anglais, non traduite et sans auteur. | « La tendance baissière ne s'inverse vraiment qu'une fois les profits installés pour de bon », selon l'analyste de CryptoQuant (à nommer). | gênant |
| article bitcoin-un-signal… § « Un cours proche du prix moyen d'achat » | « BeInCrypto situe un support, c'est-à-dire un niveau où les acheteurs ont tendance à revenir, vers 76 500 dollars. » | Analyse technique (notion de « support ») qui suggère un niveau où acheter. | Supprimer, ou : « Certains analystes surveillent le seuil des 76 500 $, mais ce genre de repère ne permet pas de prévoir le cours. » | gênant |
| article bitcoin-un-signal… § « Trente jours de profit… », 2e paragraphe | « le sommet du marché, atteint fin 2025 autour de 122 000 dollars » | Imprécis : le record historique date de début octobre 2025, vers 126 000 $. La même imprécision revient plus bas : « Lors du record de fin 2025 ». | « le sommet du marché, atteint début octobre 2025 vers 126 000 dollars » | gênant |
| article bitcoin-un-signal… § « Ce que ce signal ne permet pas de prédire » | « Un indicateur on-chain décrit l'état des portefeuilles » | Anglicisme non expliqué. | « Un indicateur tiré des données de la blockchain décrit… » | cosmétique |

#### 3. article la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-sa-residence-principale-devient-presque-impossible

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …residence-principale-devient-presque-impossible, chapô | « L'immobilier résidentiel s'effondre hors de portée pour des millions de jeunes Français. » | Formule bancale (« s'effondre hors de portée ») et alarmiste. | « Acheter un premier logement s'éloigne pour beaucoup de jeunes. » | gênant |
| idem § « Une équation devenue insoluble… », 3e paragraphe | « (le taux moyen constaté début 2025 selon l'Observatoire Crédit Logement) » | Donnée périmée pour un article daté de septembre 2026. | Mettre le taux moyen de l'Observatoire Crédit Logement en vigueur au moment de la publication. | important |
| idem § « Le piège des taux… » | « ramenant son taux directeur de 4 % à 2,65 % entre juin 2024 et le printemps 2025 » | Mélange deux taux : 4 % est le taux de dépôt, 2,65 % le taux de refinancement. La donnée est aussi périmée. | « La BCE a baissé ses taux à partir de juin 2024 (taux de dépôt de 4 % à 2 % en 2025). » Puis actualiser pour 2026. | important |
| idem § « Une équation… », 2e paragraphe | « les primo-accédants représentaient encore 37 % des transactions immobilières en 2019. En 2024, cette part a reculé à moins de 28 %. » | Chiffres FNAIM invérifiables, présentés comme certains. | Citer la publication précise ou supprimer. | gênant |
| idem § « Le piège des taux… », dernier paragraphe | « Une étude du Crédit Agricole publiée début 2025 estime… » | Source vague, impossible à retrouver. | Donner la référence exacte ou supprimer. | gênant |
| idem § « Pourquoi les salaires… » | « certaines revalorizations sectorielles » | Faute d'orthographe. | « certaines revalorisations sectorielles » | cosmétique |
| idem § « Ce que ça change… », PTZ | « le PTZ 2024-2027 a été légèrement élargi » | Imprécis : depuis le 1er avril 2025, le PTZ couvre tout le neuf (appartements et maisons) sur toute la France. | « Depuis avril 2025, le PTZ finance le neuf partout en France, et l'ancien avec travaux en zones B2 et C. » | gênant |
| idem § « Louer n'est pas forcément… » | « Ce mythe doit être déconstruit. » ; « sur des supports d'épargne performants (PEA, assurance-vie en unités de compte, etc.) » | Ton injonctif. « Performants » sonne comme une promesse, sans mention du risque. | « Louer n'est pas forcément perdre de l'argent : tout dépend de ta ville et du temps que tu y restes. Tu peux placer la différence sur un PEA ou une assurance-vie, en acceptant un risque de perte. » | gênant |
| idem § « Une équation… » 3e paragraphe, à comparer avec l'article 5 | « À Lyon, le prix moyen au mètre carré avoisine les 4 800 euros. » | Contredit l'article du 16/09 (« Un appartement de 45 m² à Lyon coûte en moyenne 270 000 euros », soit 6 000 €/m²). | Un seul chiffre, sourcé et daté. | gênant |

#### 4. article le-taux-dinteret-compose-larme-secrete-pour-faire-fructifier-ton-epargne-sans-effort

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …fructifier-ton-epargne-sans-effort, titre (et slug) | « Le taux d'intérêt composé : l'arme secrète pour faire fructifier ton épargne sans effort » | Promesse de gain interdite (« fructifier sans effort », « arme secrète »). | « Les intérêts composés : pourquoi le temps compte autant que la somme » | important |
| idem chapô | « Comprends comment l'argent peut littéralement travailler à ta place pendant que tu dors, et pourquoi commencer tôt change absolument tout » | Promesse de gain, emphase. | « Comment les intérêts s'ajoutent aux intérêts, et pourquoi le temps pèse autant. » | important |
| idem § « L'exemple concret de Mathieu » | « (un niveau atteignable sur un PEA investi en ETF monde sur le long terme, par exemple) » | Rendement présenté comme atteignable, produit cité, risque absent. | « (une hypothèse proche de la moyenne historique des actions mondiales, avec des années de baisse et sans garantie) » | important |
| idem § « La règle des 72 » | « Livret A à **3 %** : 72 ÷ 3 = **24 ans** pour doubler ton capital » | Faux en 2026 : le Livret A est à 1,7 % depuis le 1er août 2026. | « Livret A à 1,7 % : 72 ÷ 1,7 ≈ 42 ans pour doubler » | important |
| idem § « La fiscalité » | « La flat tax (ou prélèvement forfaitaire unique) s'élève à **30 %** » | Faux en 2026 : 31,4 % (12,8 % d'impôt + 18,6 % de prélèvements sociaux). | « La flat tax est de 31,4 % en 2026 : 12,8 % d'impôt et 18,6 % de prélèvements sociaux. » | important |
| idem § « Les ennemis silencieux… » | « Deux ennemis principaux menacent le bon fonctionnement de la magie des intérêts composés. » | Vocabulaire de la « magie », qui revient tout au long de l'article. | « Deux choses freinent l'effet des intérêts composés : l'inflation et les impôts. » | cosmétique |

#### 5. article la-generation-z-face-a-la-crise-du-logement-pourquoi-devenir-proprietaire-semble-impossible-et-ce-qui-change-vraiment-en-2025

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …ce-qui-change-vraiment-en-2025, titre, chapô et § « Ce qui change concrètement en 2025 » | « et ce qui change vraiment en 2025 » ; « Pourtant, 2025 apporte quelques évolutions réelles à connaître absolument. » | Périmé : l'article est daté du 16/09/2026. | Retirer l'article, ou le réécrire pour 2026 sans année dans le titre. | important |
| idem § « Le Prêt à Taux Zéro (PTZ) élargi » | « Le gouvernement a élargi le PTZ à partir du 1er janvier 2024 » | Faux : 2024 a recentré le PTZ (neuf collectif en zones tendues). L'élargissement à tout le neuf date du 1er avril 2025. | « Depuis le 1er avril 2025, le PTZ finance tout achat neuf, partout en France. » | important |
| idem § « Deuxième point… » | « Le Livret A (taux à 3 % jusqu'en début 2025, ramené à 2,4 % en février 2025) » | Périmé : 1,7 % depuis le 1er août 2026. | « Le Livret A (1,7 % depuis août 2026, plafond 22 950 €) » | important |
| idem § « Deuxième point… » | « ouvert depuis janvier 2024, il offre un taux de rémunération de **2,25 %** et surtout un droit à prêt à taux avantageux plafonné à 3,45 % » | Périmé : un PEL ouvert en 2026 rapporte 2 %, et le taux du prêt associé est de 3,20 % (taux du PEL + 1,2 point). | « Un PEL ouvert en 2026 rapporte 2 % brut et donne droit à un prêt à 3,20 % au plus. » | important |
| idem § « La douche froide des taux… » | « En mai 2025, les taux moyens des crédits immobiliers en France se stabilisent autour de **3,2 à 3,5 %** » | Périmé. | Taux 2026 sourcé. | gênant |
| idem § « Un marché… » 2e paragraphe | « l'âge moyen du primo-accédant en France est passé à **34,5 ans en 2024**, contre 31 ans au début des années 2010 » | Chiffre invérifiable, présenté comme certain. | Sourcer précisément ou supprimer. | gênant |
| idem § « Premier point… » | « Selon une étude du cabinet Meilleurtaux publiée en 2024, … il faut souvent **rester plus de 15 ans dans un bien acheté** » | Source douteuse et durée très supérieure aux estimations courantes. | « Selon les villes, il faut parfois rester de nombreuses années pour que l'achat devienne plus rentable que la location. » | gênant |
| idem § « Un marché… » 3e paragraphe | « Un appartement de 45 m² à Lyon coûte en moyenne 270 000 euros. » | 6 000 €/m², ce qui contredit l'article 3 (4 800 €/m²). | Un chiffre sourcé et cohérent. | gênant |
| idem § « Quatrième point… » | « avec un taux à 1 % pour des montants allant jusqu'à 40 000 euros » | Plafond du prêt Action Logement à vérifier : il a souvent été de 30 000 €. | Vérifier sur actionlogement.fr, sinon « jusqu'à un plafond fixé par Action Logement ». | gênant |
| idem § « Premier point… » | « Cette idée reçue colporte depuis des décennies l'idée qu'un loyer est de l'argent perdu. » | Tournure fautive (une idée reçue ne « colporte » rien) et répétition « idée ». | « On entend depuis longtemps qu'un loyer, c'est de l'argent perdu. » | cosmétique |
| idem § « La douche froide… » | « représente **plus de 50 000 euros d'intérêts supplémentaires** » | Calcul : environ 48 000 € (25 000 € à 1,2 % contre 73 500 € à 3,3 %). | « près de 50 000 € d'intérêts en plus » | cosmétique |

#### 6. article le-taux-dinteret-compose-larme-secrete-de-ceux-qui-commencent-tot-7

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …commencent-tot-7 § « Le temps est ta ressource… » | « Un investisseur qui commence à 25 ans avec 50 euros par mois aura souvent un meilleur résultat à 60 ans qu'un autre qui commence à 40 ans avec 200 euros par mois. » | Faux. À 5 % : environ 56 800 € contre environ 82 200 €. À 7 % : environ 90 000 € contre environ 104 000 €. La conclusion « La précocité bat l'intensité » ne tient pas avec ces chiffres. | « Commencer à 25 ans avec 50 € par mois t'amène à 60 ans à environ 57 000 € (à 5 %). Pour faire mieux en commençant à 40 ans, il faut verser environ 150 € par mois. » | important |
| idem titre | « l'arme secrète de ceux qui commencent tôt » | Formule promotionnelle. | « Les intérêts composés : ce que le temps change » | gênant |
| idem § « L'exemple de Lucas » | « (un ETF monde sur un PEA, par exemple — on y reviendra) » | Produit cité, risque absent. | « (par exemple des actions mondiales, dont la valeur peut baisser) » | gênant |
| idem § « L'exemple de Lucas », fin | « mais parce qu'il a laissé passer les années pendant lesquelles la magie aurait dû opérer » | Culpabilisant. | « simplement parce que son argent a eu dix ans de moins pour grossir » | gênant |
| idem § « Pourquoi les intérêts composés changent tout » | « mais en version boostée » | Anglicisme. | « mais en plus fort » | cosmétique |

#### 7. article la-fin-du-fonds-euros-garanti-ce-que-les-assureurs-preparent-vraiment-pour-ton-epargne-2

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …fonds-euros…-2 § « Le retour en grâce trompeur… » | « les rendements moyens sont passés de 1,28 % en 2021 à 2,50 % en 2022, puis à environ 2,60 % en 2023 » | Le taux de 2022 est faux (environ 1,9 à 2 % selon l'ACPR et France Assureurs) et les données s'arrêtent à 2023. | Série à jour jusqu'à 2025, sourcée (ACPR). | important |
| idem titre | « La fin du fonds euros garanti » | Titre alarmiste et trompeur : l'article dit seulement que l'accès au fonds euros se restreint. | « Fonds euros : ce qui change dans les contrats d'assurance-vie » | gênant |
| idem § « L'offensive silencieuse… » | « Chez Axa, Generali, Allianz ou encore Spirica, ces conditions existent… et elles se resserrent progressivement. » | Assureurs nommés, affirmation non sourcée. | « Beaucoup de contrats imposent une part minimale d'unités de compte. » | gênant |
| idem § « L'offensive silencieuse… », dernier paragraphe | « le fonds euros représente au maximum 30 % à 40 % des encours autorisés » | Chiffre non sourcé, présenté comme une règle. | « certains contrats plafonnent la part du fonds euros : lis les conditions. » | gênant |
| idem § « Ce que l'Europe vient changer… » | « la transposition nationale, attendue pour 2025-2026 » | Périmé. | Mettre à jour l'état de la Retail Investment Strategy en 2026. | gênant |
| idem § « Implications… », dernier point | « Remettre en question l'obsession de la garantie est un exercice difficile culturellement, mais intellectuellement nécessaire. » | Ton moralisateur. | « La garantie a un prix : sur 10 ans ou plus, elle rapporte en général moins qu'un placement en actions, qui peut lui baisser. » | gênant |
| idem § « Implications… » | « Si tu es entre 18 et 30 ans » | Tournure incorrecte. | « Si tu as entre 18 et 30 ans » | cosmétique |
| idem § « Ce que l'Europe… » | « les produits "value for money" » | Anglicisme. | « les produits au bon rapport frais-performance » | cosmétique |

#### 8. article le-taux-dinteret-compose-comment-ton-epargne-semballe-avec-le-temps

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …semballe-avec-le-temps, chapô | « Comprends pourquoi attendre coûte cher et agir tôt rapporte gros » | Promesse de gain (« rapporte gros »). | « Pourquoi quelques années d'avance changent beaucoup le résultat, chiffres à l'appui. » | important |
| idem § « L'exemple de Camille » | « **7 % par an** — un rendement réaliste sur long terme pour un investissement diversifié en bourse via un Plan d'Épargne en Actions (PEA), par exemple » | Rendement présenté comme acquis, sans mention du risque. | « 7 % par an, une hypothèse optimiste mais plausible pour des actions sur très longue période, sans garantie » | important |
| idem § « La règle des 72 » | « **Livret A à 3 % :** 72 ÷ 3 = **24 ans** pour doubler » | Faux en 2026 (1,7 %). | « Livret A à 1,7 % : environ 42 ans pour doubler » | important |
| idem § « La règle des 72 » | « pour comparer des [options](/dictionnaire/options) de placement » | Le lien renvoie à la définition « Options (Trading) », un produit dérivé : contresens. | Retirer le lien : « pour comparer des placements ». | gênant |
| idem titre de section | « Pourquoi l'intérêt composé est le secret le mieux gardé de la finance personnelle » | Sensationnaliste. | « Pourquoi l'intérêt composé compte autant » | gênant |
| idem § « L'exemple de Camille » | « Son argent a plus de **triplé**, sans qu'elle ait rien fait de particulier. » | Promesse « sans effort ». | « Son épargne a plus que triplé, à condition que les marchés suivent cette moyenne. » | gênant |

#### 9. article la-generation-z-face-a-lexplosion-des-loyers-comment-survivre-et-investir-dans-un-marche-immobilier-qui-vous-ecrase

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …qui-vous-ecrase, titre, slug et 1re ligne du corps | « comment survivre (et investir) dans un marché immobilier qui vous écrase » | Vouvoiement et ton alarmiste (« survivre », « écrase »). | « La génération Z face à la hausse des loyers : comment t'organiser quand le logement coûte cher » (slug à changer) | important |
| idem § « Des pistes concrètes… », PEL | « Le Plan d'Épargne Logement (PEL) a retrouvé un peu d'attrait avec un taux à 2,25 % depuis 2024… la prime d'État pour les primo-accédants » | Taux périmé (2 % en 2026). Surtout, la prime d'État est supprimée pour les PEL ouverts depuis le 1er janvier 2018 : c'est faux. | « Un PEL ouvert en 2026 rapporte 2 % brut, sans prime d'État, et donne droit à un prêt à taux connu d'avance. » | important |
| idem § « Des pistes concrètes… », PEL | « le Livret A (3 % actuellement, mais susceptible de baisser en 2025) » | Périmé (1,7 %). | « le Livret A (1,7 % depuis août 2026) » | important |
| idem § « Le crédit immobilier… » | « se contracte désormais autour de 3,5 à 3,8 % (données Banque de France, mars 2025) » | Périmé, et plus haut que les taux réellement constatés début 2025 (environ 3,2 à 3,3 %). | Taux 2026 sourcé. | important |
| idem chapô | « La flambée des prix immobiliers en France » | Contredit la baisse des prix de 2022 à 2024 citée ailleurs ; le sujet de l'article, ce sont les loyers. | « La hausse des loyers… » | gênant |
| idem § « Un marché… » | « À Paris, le loyer médian dépasse désormais 30 euros par mètre carré » | Chiffre invérifiable, probablement surévalué. | Sourcer (OLAP) ou supprimer. | gênant |
| idem § « Des pistes… », colocation | « placée intelligemment sur un PEA ou une assurance-vie, peut constituer en 5 à 7 ans l'apport » | Placer un apport à 5-7 ans en actions expose à une baisse au mauvais moment, et « intelligemment » sonne comme une promesse. | « mise de côté sur un support adapté à ton horizon (livrets si l'achat est proche) » | gênant |
| idem § « Ce que les politiques publiques… » | « Le projet de loi logement annoncé pour 2025 » | Périmé. | À actualiser ou supprimer. | gênant |
| idem § « Un marché… » | « selon une étude de la Fondation Abbé Pierre publiée début 2024 » | La fondation a été renommée en 2025 (Fondation pour le logement des défavorisés). Étude de 2024. | Nom actuel, donnée récente. | cosmétique |
| idem § « Ce que tu peux faire… » | « à mettre en oeuvre » | Il manque la ligature. | « à mettre en œuvre » | cosmétique |

#### 10. article leffet-boule-de-neige-des-interets-composes-pourquoi-commencer-tot-change-tout

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …pourquoi-commencer-tot-change-tout § « La règle des 72 » | « Livret A à **3 %** → 72 ÷ 3 = **24 ans** pour doubler ton capital » | Faux en 2026 (1,7 %). | « Livret A à 1,7 % → environ 42 ans » | important |
| idem § « L'histoire de Lucas » | « Il vise un rendement annuel moyen de 7 % — ce qui est réaliste sur le long terme » ; « Les intérêts composés lui ont rapporté **107 000 € supplémentaires**, qu'il n'a jamais eu à sortir de sa poche. » | Rendement présenté comme acquis : promesse implicite. Les calculs, eux, sont justes. | « Avec une hypothèse de 7 % par an, non garantie, son épargne atteindrait environ 131 000 €. » | gênant |
| idem § « L'histoire de Lucas », fin | « Ces dix années où Lucas épargnait et Théo ne faisait rien » | Culpabilisant. | « Ces dix années d'avance ont fait la différence. » | gênant |

#### 11. article la-generation-z-face-au-credit-a-la-consommation-entre-seduction-algorithmique-et-spirale-de-dettes

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …credit-a-la-consommation… § « Les implications concrètes… » | « Un [tracker](/dictionnaire/tracker) de dépenses » | Anglicisme. Le lien renvoie à « Tracker (ETF) » : contresens. | « Un suivi de dépenses » (sans lien) | gênant |
| idem § « Les implications… », avant-dernier paragraphe | « l'application Bankin', le module Budget de certaines néobanques comme Lydia ou Revolut » | Recommandation de produits nommés. | « une appli de budget ou le suivi intégré à ta banque » | gênant |
| idem § « Troisièmement… » | « l'impact sur ton score bancaire futur » | Il n'existe pas de score de crédit en France. Notion trompeuse. | « l'impression que tes relevés donnent à une banque » | gênant |
| idem § « Le "payer plus tard"… » | « selon les estimations de l'observatoire du crédit à la consommation de la Banque de France » | Organisme douteux : la Banque de France ne publie pas sous ce nom. | Citer la source exacte ou supprimer. | gênant |
| idem § « Un produit financier… » | « Des chercheurs de l'Université de Groningue ont montré en 2022 que les utilisateurs réguliers du BNPL sous-estiment en moyenne de 30 à 40 % » | Étude invérifiable, chiffre présenté comme certain. | Référence précise ou formulation prudente. | gênant |
| idem § « Ce que les régulateurs… » | « qui entrera en vigueur dans les États membres d'ici 2026 » ; « En attendant 2026 et l'entrée en vigueur pleine de CCD2 » ; « Statista projette… d'ici 2026 » | Périmé : on est en 2026. La directive CCD2 s'applique au 20 novembre 2026. | « La directive CCD2 s'applique à partir du 20 novembre 2026. » | gênant |
| idem chapô et tout l'article | « Le "buy now, pay later" explose » ; « BNPL » ; « *dark patterns* » ; « *pain of paying* » ; « staffées de data scientists » | Nombreux anglicismes. | « paiement fractionné », « interfaces trompeuses », « la douleur de payer », « dotées d'équipes de spécialistes des données » | gênant |
| idem § « Premièrement… » | « qui s't'échappent » | Faute de frappe. | « qui t'échappent » | cosmétique |
| idem chapô | « une réalité bien plus complexe se dessine — et les régulateurs commencent à tirer la sonnette d'alarme » ; titre « spirale de dettes » | Ton alarmiste. | « Derrière le paiement en plusieurs fois, des frais et un cumul à surveiller. » | gênant |

#### 12. article le-taux-dinteret-compose-larme-secrete-de-ceux-qui-commencent-tot-6

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …commencent-tot-6 § « L'exemple de Camille et Théo » | « Son capital à 62 ans (soit 40 ans de capitalisation) : environ **197 000 €** » ; « se retrouve pourtant avec **76 000 € de plus** au final » | Faux. 100 €/mois pendant 10 ans à 7 % donnent environ 17 300 €, puis environ 132 000 à 141 000 € après 30 ans. Théo a environ 122 000 €. L'écart est d'environ 10 000 à 20 000 €, pas de 76 000 €. | « Son capital à 62 ans : environ 135 000 €, un peu plus que Théo (environ 122 000 €), alors qu'elle a versé trois fois moins. » | important |
| idem chapô | « peut te faire gagner des dizaines de milliers d'euros sans effort supplémentaire — et comment en profiter dès ce mois-ci » | Promesse de gain et pression. | « Pourquoi commencer à 22 ans plutôt qu'à 32 ans change beaucoup le résultat. » | important |
| idem titre de section | « une histoire chiffrée qui fait mal » | Ton dramatisant. | « L'exemple de Camille et Théo » | cosmétique |
| idem § Camille | « (rendement historique raisonnable des marchés actions sur le long terme) » | Risque absent. | Ajouter : « non garanti, avec des années de baisse ». | gênant |

#### 13. article la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-un-appartement-devient-une-mission-impossible-2

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …mission-impossible-2 § « Un marché… », 3e paragraphe | « les taux immobiliers ont légèrement reflué pour se situer autour de 3,5 % à 3,7 % début 2025 » ; « en coûte désormais plus de 1 200 » | Périmé. La mensualité est calculée au taux de 2023 (4,2 %). | Taux et mensualité de 2026. | important |
| idem § « L'apport personnel… », dernier paragraphe | « Le dispositif a été recentré fin 2023 sur les logements neufs en zones tendues et sur l'acquisition en zone rurale » | Imprécis et périmé : le PTZ est élargi à tout le neuf depuis avril 2025. | « Depuis avril 2025, le PTZ couvre tout le neuf partout en France. » | important |
| idem chapô | « Le prix de l'immobilier s'effondre dans certaines villes » ; « n'a jamais été aussi faible depuis trente ans » | Contradictoire avec le titre (« mission impossible ») et invérifiable. | Chapô factuel et sourcé. | gênant |
| idem § « Pourquoi les prix ne baissent pas… » | « les mises en chantier ont atteint leur plus bas niveau depuis trente ans en 2024 » | Contradiction entre articles : « 40 ans » dans l'article 17, « 50 ans » dans l'article 21. | Un seul chiffre sourcé (SDES). | gênant |
| idem § « L'impact psychologique… » | « une enquête de l'Ipsos pour le Crédit Foncier (avant sa dissolution) indiquait que plus de 70 % » | Source invérifiable et non datée. | Supprimer ou sourcer. | gênant |
| idem § « La mobilité professionnelle… » | « les agences de garantie locative (type Visale, Action Logement) » | Visale est la garantie d'Action Logement, pas une agence. | « la garantie Visale d'Action Logement » | cosmétique |
| idem § « Un marché… » | « contre plus d'1,1 million » | Élision fautive. | « contre plus de 1,1 million » | cosmétique |

#### 14. article leffet-boule-de-neige-des-interets-composes-pourquoi-commencer-a-epargner-a-20-ans-change-tout-11

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …change-tout-11 § « La règle des 72 » | « ETF à **10 %** → 72 ÷ 10 = **7,2 ans** » | Un rendement de 10 % est associé à un ETF comme s'il était normal : promesse irréaliste. | « Placement à 10 % (rare et risqué) → 7,2 ans » | important |
| idem § « La règle des 72 » | « Livret A à **3 %** → 72 ÷ 3 = **24 ans** » | Faux en 2026 (1,7 %). | « Livret A à 1,7 % → environ 42 ans » | important |
| idem § « L'exemple de Lucas » | « un rendement annuel moyen d'environ **7 % après inflation** » | Optimiste : les actions mondiales tournent plutôt autour de 5 % par an après inflation. Le calcul mélange en plus euros constants et euros courants. | « environ 7 % par an avant inflation, ce qui reste une estimation, pas une garantie » | gênant |
| idem § « Ce que personne… » | « pourquoi ouvrir un livret A à 20 ans plutôt qu'à 30 ans fait une différence colossale » | Exagéré à 1,7 %. | « pourquoi commencer à épargner tôt fait une vraie différence » | gênant |
| idem § « L'exemple de Lucas » | « Soit plus de 4 fois sa mise initiale qui est "offerte" par le temps et les marchés. » | Promesse de gain. | « Si les marchés suivent cette moyenne, les gains dépassent 4 fois ses versements. » | gênant |
| idem § « Ce que personne… » | « que tu peux mettre en place cette semaine » | Pression. | « que tu peux comprendre en cinq minutes » | cosmétique |

#### 15. article la-fin-du-quiet-quitting-financier-pourquoi-les-jeunes-francais-redecouvrent-linvestissement-en-2025-2

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …en-2025-2, titre | « La fin du "quiet quitting" financier : pourquoi les jeunes Français redécouvrent l'investissement en 2025 » | Anglicisme, et date périmée (article de 2026). Doublon de l'article 19. | Dépublier (doublon). Voir la section C. | important |
| idem § « Les instruments privilégiés… », PEA | « (seuls les [prélèvements sociaux](/dictionnaire/prelevements-sociaux) de 17,2 % s'appliquent) » | Faux en 2026 : 18,6 % sur les gains du PEA. | « seuls les prélèvements sociaux de 18,6 % restent dus » | important |
| idem § « 2024-2025 : le tournant… » | « Des plateformes comme Trade Republic, Scalable Capital ou encore Bourse Direct ont démocratisé… Trade Republic revendiquait en France plus de 500 000 utilisateurs actifs » | Courtiers nommés et mis en avant ; chiffre invérifiable. | « Des courtiers en ligne ont fait baisser les frais… » (sans marque) | gênant |
| idem § « Un désengagement… » | « Cette tendance avait même un nom dans les cercles de la fintech : le "quiet quitting" financier » | Affirmation douteuse (l'expression semble inventée), anglicismes. | Supprimer. | gênant |
| idem § « Un désengagement… » et § « 2024-2025… » | « selon les données de l'Autorité des marchés financiers (AMF), en 2022, moins de 20 % » ; « La Banque de France a relevé dans son rapport 2024 sur le financement de l'économie » | Sources invérifiables. | Références précises ou suppression. | gênant |
| idem § « Les instruments privilégiés… » | « **Les ETF (fonds indiciels côtés)** » | Faute. | « fonds indiciels cotés » | cosmétique |
| idem § « Ce que cela change… » | « ce qu'on appelle le "DCA" (Dollar Cost Averaging) » | Anglicisme. | « l'investissement programmé (un montant fixe chaque mois) » | cosmétique |

#### 16. article le-taux-dinteret-compose-larme-secrete-de-ceux-qui-commencent-tot-5

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …commencent-tot-5 § « L'exemple de Lucas » | « **Lucas à 62 ans : environ 168 000 €** » ; « **Théo à 62 ans : environ 182 000 €** » ; « Théo finit légèrement devant » | Faux. 150 €/mois pendant 10 ans à 7 % donnent environ 26 000 €, puis environ 198 000 à 211 000 € à 62 ans : Lucas finit devant Théo (environ 183 000 €). La conclusion de l'exemple s'inverse. | « Lucas : environ 200 000 €. Théo : environ 183 000 €. Lucas a versé trois fois moins et finit pourtant devant. » | important |
| idem § « Le PEA » | « (17,2 % de prélèvements sociaux seulement, contre 30 % sur un compte-titres » | Faux en 2026 : 18,6 % et 31,4 %. | « 18,6 % de prélèvements sociaux seulement, contre 31,4 % sur un compte-titres » | important |
| idem § « La règle des 72 » | « Livret A à **3 %** → 72 ÷ 3 = **24 ans** » | Faux en 2026 (1,7 %). | « Livret A à 1,7 % → environ 42 ans » | important |
| idem § « Le PEA » | « C'est probablement **le meilleur outil pour un jeune adulte en France**. » | Conseil d'investissement. | « C'est une enveloppe fiscale souvent adaptée au long terme. » | gênant |
| idem § « L'exemple de Lucas », fin | « Chaque année que tu attends, c'est une année de croissance exponentielle que tu sacrifies définitivement. » | Culpabilisant. | « Chaque année d'avance laisse plus de temps à ton épargne pour grossir. » | gênant |
| idem § « L'exemple de Lucas » | « c'est là que beaucoup de gens prennent une claque » | Registre familier. | « c'est là que tout s'éclaire » | cosmétique |

#### 17. article la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-devient-une-utopie-pour-des-millions-de-jeunes-francais

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …utopie… § « Un marché… », 2e paragraphe | « a dépassé 4,5 % courant 2023 avant de redescendre progressivement aux alentours de 3,5 % début 2025 » | Pic surestimé (environ 4,2 à 4,3 % fin 2023 selon l'Observatoire Crédit Logement), et donnée périmée. | Chiffres sourcés jusqu'en 2026. | gênant |
| idem § « Implications… » | « **Le PTZ renforcé, une fenêtre à saisir.** Le Prêt à Taux Zéro a été assoupli et élargi dans le cadre du budget 2024-2025. » | Pression (« fenêtre à saisir ») et imprécis : élargissement au 1er avril 2025, loi de finances 2025. | « Le PTZ, à vérifier : depuis avril 2025, il couvre tout le neuf partout en France. » | gênant |
| idem § « L'apport personnel… », dernier paragraphe | « Être propriétaire avant 30 ans en 2025 dépend moins de ton travail que de la situation financière de tes parents. » | Périmé, ton militant. | « L'aide familiale pèse lourd dans l'achat avant 30 ans. » | gênant |
| idem § « Implications… » | « un [arbitrage](/dictionnaire/arbitrage) à calculer » | Le lien renvoie à « Arbitrage (Trading) » : contresens. | « un choix à calculer » (sans lien) | gênant |
| idem § « Un marché… », 1er paragraphe | « la part des primo-accédants de moins de 30 ans … a chuté de près de 40 % entre 2021 et 2024 » | Chiffre FNAIM invérifiable. | Sourcer ou supprimer. | gênant |
| idem § « Une crise structurelle… » | « les mises en chantier… ont chuté à leur plus bas niveau depuis 40 ans en 2024 » | Contradiction entre articles (30, 40 ou 50 ans). | Un chiffre unique sourcé. | gênant |
| idem § « Le double effet ciseau… » | « cela lui permet d'emprunter environ 140 000 euros — assurance comprise » | Calcul : environ 133 000 € hors assurance, donc moins avec l'assurance. | « environ 130 000 € » | cosmétique |
| idem § « Implications… » | « parfois appelée "rentvesting" » | Anglicisme. | « appelée "louer ici, investir ailleurs" » | cosmétique |

#### 18. article leffet-de-levier-du-temps-pourquoi-commencer-a-epargner-a-22-ans-vaut-mieux-quattendre-32-ans

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …effet-de-levier-du-temps… § « Ce que ça veut dire… » | « Voici pourquoi attendre est la pire décision financière que tu puisses prendre quand tu es jeune » ; « Ce qu'il te faut, c'est **commencer maintenant** » | Morale et pression, interdites. | « Voici pourquoi le temps joue autant : » | important |
| idem § « Ce que ça veut dire… » | « 50 € par mois pendant 40 ans, c'est bien plus puissant que 500 € par mois pendant 5 ans. » | Faux si les 30 000 € restent placés : à 5 %, environ 187 000 € contre environ 76 000 €. | « 50 € par mois pendant 40 ans donnent environ 76 000 € à 5 % : de petites sommes régulières finissent par peser. » | important |
| idem § « Le Livret A » | « et depuis 2023 le taux est à 3 % (susceptible d'évoluer) » ; « Mais à 3 %, les intérêts composés seront limités » | Faux en 2026 (1,7 %). | « Le taux est de 1,7 % depuis août 2026. » | important |
| idem § « L'exemple de Léa… » | « Son capital à 62 ans : environ **75 000 €** » ; « son capital dépasserait les **160 000 €** » | Calculs surévalués : environ 67 000 à 69 000 €, et environ 152 600 €. | « environ 68 000 € » ; « environ 150 000 € » | gênant |
| idem titre et 1re ligne du corps | « L'[effet de levier](/dictionnaire/effet-de-levier) du temps » | « Effet de levier » désigne l'emprunt pour amplifier un gain, et le lien renvoie à « Effet de levier (Trading) » : contresens. | « Le temps, ton meilleur allié : pourquoi commencer à 22 ans change le résultat » | gênant |
| idem chapô | « c'est le secret le mieux gardé de la finance personnelle… un mécanisme que même les plus grands investisseurs considèrent comme magique » | Sensationnaliste. | « Quelques années d'avance peuvent faire une grande différence, chiffres à l'appui. » | gênant |
| idem § « Le PEA » | « Le PEA est l'arme secrète du jeune épargnant français. » | Formule promotionnelle. | « Le PEA est une enveloppe fiscale intéressante sur le long terme. » | gênant |
| idem § « Les intérêts composés… » | « Le mathématicien Albert Einstein » | Erreur : il était physicien. Citation apocryphe. | Supprimer. | cosmétique |
| idem § « Le Livret A » | « 0 risque » ; « l'équivalent de 2 à 3 mois de dépenses » | Chiffre en début de phrase. Incohérent avec les autres articles (3 à 6 mois). | « Aucun risque » ; « 3 à 6 mois de dépenses » | cosmétique |

#### 19. article la-fin-du-quiet-quitting-financier-pourquoi-les-jeunes-francais-redecouvrent-linvestissement-en-2025

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …redecouvrent-linvestissement-en-2025, titre | « La fin du "quiet quitting" financier : … en 2025 » | Anglicisme, et date périmée. | « Pourquoi de plus en plus de jeunes se mettent à investir » | important |
| idem § « Implications… », PEA | « (seuls les [prélèvements sociaux](/dictionnaire/prelevements-sociaux) de 17,2 % restent dus) » | Faux en 2026 : 18,6 %. | « seuls les prélèvements sociaux de 18,6 % restent dus » | important |
| idem § « Le catalyseur technologique… » | « Des plateformes comme **Trade Republic**, **Scalable Capital** ou encore le vétéran **Bourse Direct** » | Courtiers nommés, en gras : publicité implicite. | « Des courtiers en ligne… » | gênant |
| idem § « Ce que les chiffres disent… » | « Selon **Euronext** et plusieurs études de marché agrégées par le cabinet **Broadridge Financial Solutions**, … **60 % entre 2021 et 2024** » | Source douteuse et invérifiable. | Supprimer ou sourcer. | gênant |
| idem § « Une génération… » | « Selon une étude de l'AMF publiée fin 2023, … près de **35 % des nouveaux investisseurs** » | Chiffre à vérifier. | Référence précise (baromètre AMF). | gênant |
| idem § « Implications… » | « deviennent environ **1 497 euros à 60 ans**, sans que tu n'aies rien fait de plus » | Rendement de 7 % présenté comme acquis (promesse). Le « ne » est fautif après « sans que ». | « pourraient devenir environ 1 500 € à 60 ans si les marchés suivent cette moyenne, sans garantie » | gênant |
| idem § « Implications… » | « **DCA (Dollar Cost Averaging)** » ; « market timing » ; « success story » ; « "tips" » ; « actions mèmes » | Anglicismes. | « investissement programmé », « chercher le bon moment », « réussite », « tuyaux », « actions à la mode sur les réseaux » | cosmétique |
| idem § « Ce que les chiffres… » | « Les jeunes investisseurs français de 2025 » | Périmé. | « Beaucoup de jeunes investisseurs » | cosmétique |

#### 20. article le-taux-dinteret-compose-comment-ton-epargne-peut-travailler-seule-pendant-que-tu-dors-3

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …pendant-que-tu-dors-3 § « Le temps est ton meilleur allié… » | « **Lucie** dispose d'environ **218 000 €** » ; « elle finit avec presque le double » | Faux. 100 €/mois pendant 10 ans à 7 %, puis 30 ans sans versement, donnent environ 132 000 à 141 000 €, contre environ 122 000 € pour Thomas. Elle finit un peu devant, pas avec le double. | « Lucie : environ 135 000 €. Thomas : environ 122 000 €. Elle a versé trois fois moins et finit quand même devant. » | important |
| idem titre et chapô | « comment ton épargne peut travailler seule pendant que tu dors » ; « peut te faire gagner des dizaines de milliers d'euros sans effort supplémentaire » | Promesse de gain sans effort. | « Les intérêts composés : ce que dix ans d'avance changent » | important |
| idem § « Le PEA » | « tu payes seulement les [prélèvements sociaux](/dictionnaire/prelevements-sociaux) (17,2 %) » | Faux en 2026 : 18,6 %. | « seulement les prélèvements sociaux (18,6 %) » | important |
| idem § « Le PEA » | « Un ETF monde (comme le [MSCI World](/dictionnaire/msci-world)) a historiquement rapporté autour de 7 à 9 % par an sur des périodes de 15-20 ans. » | Fourchette haute ; un fonds précis est cité comme référence. | « Les actions mondiales ont rapporté en moyenne 6 à 7 % par an sur longue période, avec de fortes baisses certaines années. » | gênant |
| idem § « L'argent qui fait des petits » / § suivant | « le mathématicien Albert Einstein » | Erreur : il était physicien. | Supprimer. | cosmétique |

#### 21. article la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-un-bien-immobilier-devient-une-mission-impossible

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …bien-immobilier…mission-impossible § « Ce que cette crise change… », apport | « Le Plan Épargne Logement (PEL), malgré un taux peu enthousiasmant (2,25 % depuis janvier 2024) » ; « Le Livret A (3 % jusqu'à récemment, ramené à 2,4 % en février 2025) » | Faux en 2026 : PEL 2 %, Livret A 1,7 %. | « Le PEL ouvert en 2026 rapporte 2 % brut ; le Livret A rapporte 1,7 % depuis août 2026. » | important |
| idem § « Les dispositifs d'aide… » | « Le Prêt à Taux Zéro (PTZ) a été recentré et élargi par la loi de finances 2024 » | Contradictoire et inexact : la loi de 2024 a recentré le PTZ, celle de 2025 l'a élargi (1er avril 2025). | « Depuis avril 2025, le PTZ finance le neuf partout en France. » | important |
| idem § « Une barrière… », 3e paragraphe | « le taux de dépôt est redescendu à 2,5 % en mars 2025… Début 2025, les meilleurs profils peuvent espérer emprunter autour de 3,3 à 3,5 % » | Périmé. | Données 2026. | important |
| idem § « Une barrière… », 1er paragraphe | « l'âge moyen du primo-accédant en France a progressivement reculé » | Contresens : l'âge a augmenté, l'achat a été repoussé. | « on achète son premier logement de plus en plus tard » | gênant |
| idem titre de section | « Des prix qui résistent, une offre qui se tari » | Faute de conjugaison dans un intertitre visible. | « une offre qui se tarit » | cosmétique |
| idem § « Des prix… », 3e paragraphe | « Les mises en chantier sont tombées à leur niveau le plus bas depuis 50 ans en 2024, selon les données du ministère du Logement. » | Contradiction entre articles (30, 40 ou 50 ans). | Chiffre unique sourcé. | gênant |
| idem § « Des prix… », 2e paragraphe | « avec un salaire médian autour de 2 000 à 2 500 euros nets mensuels » | Incohérent avec l'article 17 (« salaire médian des 25-29 ans … 1 900 euros nets »). | Un seul chiffre INSEE. | cosmétique |

#### 22. article le-taux-dinteret-compose-comment-ton-argent-peut-travailler-pour-toi-sans-que-tu-fasses-quoi-que-ce-soit

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …sans-que-tu-fasses-quoi-que-ce-soit § « Pourquoi "attendre…" » | « Son capital à 60 ans ? Environ **230 000 €**. » ; « il se retrouve avec **110 000 € de moins** » | Faux. 150 €/mois pendant 28 ans à 7 % donnent environ 156 000 €. L'écart avec Léa (environ 340 000 €) est d'environ 184 000 €. | « Son capital à 60 ans : environ 156 000 €, soit environ 184 000 € de moins que Léa. » | important |
| idem titre | « comment ton argent peut travailler pour toi sans que tu fasses quoi que ce soit » | Promesse de gain sans effort. | « Les intérêts composés : comment tes intérêts produisent des intérêts » | important |
| idem chapô | « c'est découvrir le secret que les banques préfèrent garder pour elles. Voici pourquoi commencer à épargner à 20 ans peut te rendre riche à 60. » | Ton complotiste et promesse de richesse. | « Comprendre les intérêts composés, c'est comprendre pourquoi le temps compte autant. » | important |
| idem § « Pourquoi "attendre…" » | « C'est une erreur qui peut littéralement te coûter des dizaines de milliers d'euros. » | Culpabilisant. | « Même 150 €, avec le temps, ça finit par compter. » | gênant |
| idem § « L'exemple de Léa » | « (rendement souvent cité pour un portefeuille diversifié sur les marchés actions européens sur le long terme) » ; « Léa n'a pas eu besoin… de prendre des risques fous » | 7 % optimiste pour les actions européennes, et le risque est passé sous silence. | « (hypothèse de 7 % par an, non garantie : les actions peuvent baisser fortement) » | gênant |

#### 23. article la-fin-du-livret-a-a-3-ce-que-le-retour-a-24-va-vraiment-changer-pour-ton-epargne-6

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …livret-a-a-3…-6, titre et chapô | « La fin du livret A à 3% : ce que le retour à 2,4% va vraiment changer » ; « Le taux du livret A vient de redescendre à 2,4% au 1er février 2025 » | Article entièrement périmé, publié le 07/09/2026 : le Livret A est à 1,7 % depuis le 1er août 2026. | Dépublier, puis réécrire un seul article « Livret A à 1,7 % : ce que ça change ». | important |
| idem § « Un taux qui chute… » | « Depuis août 2023, le livret A affichait un taux de 3% » | Faux : 3 % depuis le 1er février 2023. | « Depuis février 2023… » | important |
| idem § « Le livret A face à la concurrence » | « soumis au **prélèvement forfaitaire unique (PFU) de 30%**. Autrement dit, un taux affiché à 4% devient environ 2,8% net. » | Faux en 2026 : 31,4 %, donc environ 2,74 % net. | « soumis à la flat tax de 31,4 % : 4 % brut deviennent environ 2,7 % net » | important |
| idem § « Le LDDS » | « il passe lui aussi à 2,4% … Si tu ne l'as pas encore ouvert, c'est une erreur à corriger. » | Taux périmé (1,7 %) et morale interdite. | « Il rapporte 1,7 %, plafond 12 000 €, et peut s'ajouter à ton Livret A. » | important |
| idem § « Le LEP » | « reste à **3,5% jusqu'au 31 juillet 2025** … 7 700 euros maximum de plafond … c'est clairement la priorité absolue » | Faux en 2026 : 2,5 %, plafond 10 000 €. La phrase met en plus la pression. | « Le LEP rapporte 2,5 % (plafond 10 000 €) si tes revenus le permettent : ça vaut le coup de vérifier. » | important |
| idem § « Le PEL » | « ouvert depuis 2024, il rapporte 2,25% brut » | Périmé : 2 % en 2026. | « ouvert en 2026, il rapporte 2 % brut » | important |
| idem § « Cinquième chose » | « le livret A pourrait redescendre à **2% ou moins** d'ici août 2025 » | Périmé. | Supprimer. | important |
| idem § « Un taux qui chute… » | « l'encours total du livret A a dépassé les **500 milliards d'euros** » | Inexact : environ 440 à 450 Md€ pour le Livret A seul fin 2024. On ne dépasse les 600 Md€ qu'en ajoutant le LDDS. | « Livret A et LDDS réunis dépassent 600 milliards d'euros » (chiffre à sourcer et dater) | gênant |
| idem § « Un taux qui chute… », 3e paragraphe | « La formule de calcul du taux du livret A, gérée par la Banque de France, tient compte de l'inflation sous-jacente » | Inexact : la formule retient l'inflation hors tabac et l'€STR. La Banque de France propose le taux, le ministre décide. | « La Banque de France calcule le taux à partir de l'inflation et des taux courts ; le ministre de l'Économie le fixe. » | gênant |
| idem § « Le livret A face à la concurrence » | « des établissements comme Boursobank, Fortuneo ou Hello bank! » | Banques nommées. | « certaines banques en ligne » | gênant |
| idem § « Deuxième chose » | « C'est le conseil numéro un de tout conseiller financier indépendant … tu laisses de l'argent sur la table chaque mois » | Affirmation invérifiable, calque de l'anglais et pression. | « Si tu y as droit, c'est le livret sans risque le mieux rémunéré. » | gênant |
| idem § « Quatrième chose » | « Les super-livrets à 5% font de beaux vitrines » | Faute d'accord. | « font de belles vitrines » | cosmétique |
| idem tout l'article | « 3% », « 2,4% », « 5% » | Pas d'espace avant %, systématique. | « 3 % », « 2,4 % » | cosmétique |

#### 24. article leffet-des-frais-caches-sur-ton-epargne-comment-quelques-pourcentages-peuvent-te-couter-des-milliers-deuros

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …frais-caches…, chapô et 1re ligne du corps | « et tu te sens fier de toi » | Masculin implicite. | « et c'est déjà une belle étape » | gênant |
| idem § « Les frais d'arbitrage » | « Les frais d'[arbitrage](/dictionnaire/arbitrage) » | Le lien renvoie à « Arbitrage (Trading) » (écarts de prix entre marchés) et non à l'arbitrage en assurance-vie : contresens. | Retirer le lien, ou créer une définition « Arbitrage (assurance-vie) ». | gênant |
| idem § « L'exemple de Théo » | « Il vise une croissance annuelle brute de 6 % (un objectif réaliste sur un horizon long terme avec une allocation diversifiée actions/obligations) » | Optimiste pour un mélange actions et obligations, présenté comme réaliste. Les calculs, eux, sont justes (environ 85 000 € contre environ 115 000 €). | « Prenons 6 % brut par an comme hypothèse, sans garantie » | gênant |
| idem § « L'exemple de Théo » | « Voilà le cas concret que j'ai envie de te mettre sous les yeux » | Narrateur « je » non identifié (Val ?). Incohérent avec les autres articles. | « Voici un cas concret » | cosmétique |
| idem § « Les frais d'entrée » / § « Ce que personne… » / § « Les trois grandes catégories… » | « les courtiers digitaux » ; « par ci » ; « Avant de rentrer dans le vif du sujet » | Anglicisme, trait d'union manquant, verbe impropre. | « les courtiers en ligne » ; « par-ci » ; « Avant d'entrer dans le vif du sujet » | cosmétique |
| idem tableau Markdown | « \| Capital versé total \| ~58 000 € \| ~58 000 € \| » | Tableau Markdown, à vérifier au rendu. Le symbole « ~ » est utilisé à la place de « environ ». | Tableau au format bloc, « environ 58 000 € ». | cosmétique |

#### 25. article la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-est-devenu-presque-impossible-et-ce-que-tu-peux-faire

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article …ce-que-tu-peux-faire § « Un marché… », 3e paragraphe | « Le taux d'effort maximal (33 % des revenus nets consacrés au remboursement) imposé par le Haut Conseil de Stabilité Financière (HCSF) » | Faux : la limite du HCSF est 35 %, assurance comprise. | « Le taux d'endettement maximal fixé par le HCSF (35 % des revenus, assurance comprise) » | important |
| idem § « Maximiser ton apport… » | « le **Plan d'Épargne Logement (PEL)** ouvert après janvier 2024 offre un taux de 2,25 % brut et une prime d'État si tu passes à l'acte » | Faux : plus de prime d'État pour les PEL ouverts depuis 2018. Taux 2026 : 2 %. | « Un PEL ouvert en 2026 rapporte 2 % brut, sans prime d'État, et donne droit à un prêt à taux connu d'avance. » | important |
| idem § « Maximiser ton apport… » | « Le Livret A (taux à 3 % jusqu'en début 2025) » | Périmé (1,7 %). | « Le Livret A (1,7 % depuis août 2026) » | important |
| idem § « Un marché… », 2e paragraphe | « cela représente environ 500 euros de mensualité supplémentaire par rapport à ce qu'on aurait payé en 2021. Le coût total du crédit a littéralement doublé » | Faux : sur 200 000 € à 20 ans, environ 920 € à 1 % contre environ 1 230 € à 4,2 %, soit environ 300 € de plus. Ce sont les intérêts qui ont été multipliés par plus de 4, pas le coût total qui a « doublé ». | « environ 300 € de plus par mois » | important |
| idem § « Maximiser ton apport… » | « Si ton horizon est de 5 à 10 ans, investir une partie de ton épargne en bourse via un **PEA** peut significativement booster la constitution de ton apport. Historiquement, … entre 6 et 8 % » | Promesse de gain sur un horizon court, anglicisme. | « Sur 5 à 10 ans, la bourse peut aider comme faire perdre : si ton achat a une date, garde l'essentiel sur des supports sans risque. » | important |
| idem § « Repenser la géographie… » | « Rennes, Angers, Reims, Clermont-Ferrand ou Le Mans, tu peux encore trouver des biens de qualité entre 1 500 et 2 500 euros le m² » | Faux pour Rennes (environ 3 500 à 4 000 €/m²) et Angers (environ 3 000 €/m²). | Liste de villes vérifiée (ex. Le Mans, Limoges, Saint-Étienne). | gênant |
| idem § « Implications concrètes… » | « dans ta situation de jeune actif ou étudiante avancée » | Mélange bancal du masculin et du féminin. | « que tu travailles déjà ou que tu finisses tes études » | gênant |
| idem § « Ce que les politiques publiques… » | « Le Prêt à Taux Zéro (PTZ) a été reconduit et élargi en 2024 pour les primo-accédants dans les zones tendues » | Imprécis et périmé : élargissement au 1er avril 2025, sur tout le territoire. | « Depuis avril 2025, le PTZ finance le neuf partout en France. » | gênant |
| idem § « Les prix… » et § « La double peine… » | « **14 à 16 années de salaire médian brut** » ; « Selon une étude de l'INSEE publiée en 2023, le taux de propriétaires chez les moins de 30 ans est tombé à environ 16 % » | Chiffres invérifiables, présentés comme certains. | Sourcer ou supprimer. | gênant |
| idem § « Les prix… », 1er paragraphe | « les prix, eux, n'ont pas effondré les espoirs autant qu'on aurait pu l'espérer » | Phrase incohérente. | « les prix, eux, ont peu baissé » | cosmétique |
| idem § « Les prix… », 3e paragraphe | « Selon la Fondation Abbé Pierre » | Fondation renommée en 2025. | « Selon la Fondation pour le logement des défavorisés (ex-Fondation Abbé Pierre) » | cosmétique |

---

### 4 A. C. Doublons (sur tout l'index : 264 articles avec is_published=1)

- **73 slugs** se terminent par un suffixe numérique (-2 à -11).
- **226 articles sur 264** sont en status=draft, 32 en published, 6 en approved.
- En regroupant les sujets quasi identiques, environ **120 articles** sont redondants.
- Tous les doublons détectés, sauf les quatre familles de la fin, sont des « draft » générés entre juillet et septembre 2026.

| Famille (sujet) | Nombre | Slugs concernés | À garder | À faire |
|---|---|---|---|---|
| Intérêts composés / boule de neige / « arme secrète » / « pendant que tu dors » | **49** | 11 × « leffet-boule-de-neige-des-interets-composes-pourquoi-commencer-a-epargner-a-20-ans-change-tout » (sans suffixe et -2 à -11) ; 7 × « le-taux-dinteret-compose-larme-secrete-de-ceux-qui-commencent-tot » (sans suffixe et -2 à -7) ; 3 × « …larme-secrete-pour-faire-grossir-ton-epargne-sans-effort » (sans suffixe, -2, -3) ; 3 × « …comment-ton-epargne-peut-travailler-seule-pendant-que-tu-dors » (sans suffixe, -2, -3) ; 2 × « …comment-ton-argent-travaille-pour-toi-sans-que-tu-leves-le-petit-doigt » ; 2 × « …comment-ton-argent-travaille-pour-toi-pendant-que-tu-dors » ; et 21 variantes de titre (…fructifier-ton-epargne-sans-effort, …semballe-avec-le-temps, …pourquoi-commencer-tot-change-tout, …effet-de-levier-du-temps…, …sans-que-tu-fasses-quoi-que-ce-soit, leffet-des-interets-composes-* ×5, leffet-boule-de-neige-comment-transformer-tes-petites-economies-en-fortune, etc.) | **les-interets-composes-pourquoi-ton-argent-travaille-en-dormant** (le seul en status=published, du 10/05/2026, que je n'ai pas relu : vérifier ses calculs). À défaut, **leffet-boule-de-neige-des-interets-composes-pourquoi-commencer-tot-change-tout** (14/09) : calculs justes et volet « dette revolving » utile, à corriger (Livret A 1,7 %, rendement présenté comme hypothèse) et à terminer. | Dépublier les 48 autres. Calculs faux dans -5, -6, -7, …pendant-que-tu-dors-3, …sans-que-tu-fasses… et …effet-de-levier-du-temps (section B). |
| Génération Z et logement (« mission impossible », « chimère », « utopie », « ce qui change en 2025 »…) | **28** | dont « …pourquoi-acheter-devient-une-chimere-pour-des-millions-de-jeunes-francais » (sans suffixe, -2, -3), « …pourquoi-acheter-est-devenu-presque-impossible-et-ce-qui-change-en-2025 » (sans suffixe, -2, -3), « …pourquoi-acheter-un-appartement-devient-une-mission-impossible » (sans suffixe, -2), « …louer-acheter-ou-investir-autrement » (sans suffixe, -2), « …qui-vous-ecrase », etc. Il faut y ajouter 10 articles immobilier proches (« limmobilier-locatif-face-a-la-hausse-des-taux-faut-il-encore-investir-en-2024 » et son -2, « …-en-2024 » ×2 variantes, « limmobilier-francais-seffondre-faut-il-acheter-maintenant-ou-attendre »…) | **la-generation-z-face-a-la-crise-du-logement-pourquoi-acheter-sa-residence-principale-devient-presque-impossible** (17/09) : le plus nuancé (frais de notaire justes, BRS, location). À mettre à jour pour 2026 et à terminer. | Dépublier les 27 autres, en priorité « …qui-vous-ecrase » (vouvoiement), tous les « …en-2025 » et les deux qui annoncent une prime d'État sur le PEL (articles 9 et 25). |
| Livret A à 3 % puis 2,4 % | **18** | 11 × « la-fin-du-livret-a-a-3-… » (« …va-vraiment-changer-pour-ton-epargne » sans suffixe et -2 à -6 ; « …change-vraiment-pour-ton-epargne » sans suffixe, -2, -3 ; « …le-passage-a-24-change-vraiment… » ; « …va-vraiment-couter-a-ta-generation ») + 7 autres (« le-livret-a-passe-a-3-en-fevrier-2025-une-aubaine… », « comment-maximiser-tes-3-dinterets-sur-ton-livret-a-en-2024 », « livret-a-a-3-pourquoi-ton-epargne-de-precaution-merite-mieux »…) | **Aucun en l'état** : tous reposent sur 3 % ou 2,4 %, alors que le taux est de 1,7 % depuis le 1er août 2026. | Dépublier les 18, puis rédiger un seul article à jour (Livret A, LDDS 1,7 %, LEP 2,5 %, plafonds). |
| Frais cachés (épargne) | **6** | « leffet-des-frais-caches-sur-ton-epargne-pourquoi-1-peut-te-couter-des-milliers-deuros » (sans suffixe, -2) ; « …long-terme » (sans suffixe, -2) ; « …le-cout-invisible-qui-ronge-ton-capital » ; « …comment-quelques-pourcentages-peuvent-te-couter-des-milliers-deuros » | **leffet-des-frais-caches-sur-ton-epargne-comment-quelques-pourcentages-peuvent-te-couter-des-milliers-deuros** (07/09) : calculs vérifiés. À corriger (« fier de toi », lien « arbitrage ») et à terminer. | Dépublier les 5 autres. |
| Frais cachés (néobanques et plateformes) | **2** | « la-generation-z-face-a-lexplosion-des-frais-caches-dans-les-neobanques… » ; « …comment-les-plateformes-numeriques-grappillent… » | Un seul (le plus récent, du 27/08), non relu. | Fusionner. |
| Fonds euros | **5** | « la-fin-du-fonds-euros-garanti-ce-que-les-assureurs-preparent-vraiment-pour-ton-epargne » (sans suffixe, -2) ; « …preparent-en-silence… » ; « …ne-te-disent-pas-vraiment » ; « …ne-te-disent-pas-sur-ton-assurance-vie » | **…preparent-vraiment-pour-ton-epargne-2** (relu), sous un titre moins alarmiste, avec les rendements corrigés. | Dépublier les 4 autres. |
| « Quiet quitting » financier | **3** | « …redecouvrent-linvestissement-en-2025 » (sans suffixe, -2) ; « …reprennent-enfin-le-controle-de-leur-argent » | **…redecouvrent-linvestissement-en-2025** (sans suffixe) : plus complet (épargne de précaution, mise en garde de l'AMF). À retitrer sans « quiet quitting » ni « 2025 ». | Dépublier les 2 autres. |
| Krach obligataire (génération Z) | **4** | « …krach-obligataire-silencieux-pourquoi-les-taux-longs-menacent-ton-epargne-en-2025 » (sans suffixe, -2) ; « …ton-futur-financier » ; « …krach-obligataire-pourquoi-les-taux-longs-menacent-ton-avenir-financier » | 1, non relu (éviter les « en-2025 »). | Dépublier 3. |
| Mur de la retraite | **2** | « …pourquoi-lepargne-longue-devient-une-urgence-silencieuse » ; « …pourquoi-cotiser-aujourdhui-ne-suffira-plus » | 1, non relu. | Dépublier 1. |
| Inflation alimentaire | **10** | « linflation-alimentaire-frappe-fort-comment-adapter-ton-budget-courses-en-2024 » (sans suffixe, -2) et 8 variantes (« …frappe-fort-comment-les-jeunes-… » ×5, « …atteint-des-records… », « …30-plus-cher… », « pourquoi-linflation-alimentaire-reste-elevee… ») | 1, non relu (éviter les « en-2024 »). | Dépublier 9. |
| Taux d'endettement | **3** | « comment-calculer-ton-taux-dendettement-et-pourquoi-cest-crucial-pour-tes-projets » (sans suffixe, -2, -3) | Celui sans suffixe. | Dépublier -2 et -3. |
| PEA (published) | **6** | « pea » ; « pea-le-compte-bourse-qui-te-fait-payer-moins-d-impots » ; « pea-le-compte-bourse-qui-te-fait-payer-presque-zero-impot » ; « pea-l-enveloppe-fiscale-qui-te-fait-economiser-des-milliers-d-euros-en-bourse » ; « pea-quel-type-choisir-selon-ta-situation-en-2026 » ; « pea-ou-assurance-vie-le-match-fiscal-qui-change-tout » | Au moins les trois « pea-le-compte-bourse… » et « pea-l-enveloppe… » font doublon : garder « pea-quel-type-choisir-selon-ta-situation-en-2026 » et « pea-ou-assurance-vie… ». Aucun relu par moi. | À arbitrer. Attention aussi à deux brouillons contradictoires : « le-gouvernement-supprime-lavantage-fiscal-du-pea-pour-les-jeunes… » et « le-pea-jeunes-la-nouvelle-arme-fiscale… ». |
| Bitcoin pédagogique (published, 04/05) | **4** | « bitcoin-pourquoi-tout-le-monde-en-parle-en-2026 » ; « bitcoin-decrypte-comprendre-la-cryptomonnaie-qui-revolutionne-l-argent » ; « bitcoin-2026-l-age-de-maturite-pour-l-or-numerique » ; « bitcoin-comprendre-la-star-des-cryptos-en-2026 » | 1, non relu. | Dépublier 3. |
| 2008 (published) | **2** | « 2008-comment-une-maison-americaine-a-failli-detruire-l-economie-mondiale » ; « …a-failli-faire-tomber-le-monde » | 1, non relu. | Dépublier 1. |
| Trump, volte-face | **2** | « les-volte-face-de-donald-trump-strategie-calculee-ou-imprevisibilite-politique » (published) ; « vas-et-vient-decisions-donald-trump-strategie-ou-imprevisibilite » (approved) | Celui en published. | Retirer l'approved, dont le slug contient aussi une faute (« vas-et-vient » au lieu de « va-et-vient »). |
| Détroit d'Ormuz | **2** | « guerre-au-moyen-orient-le-detroit-dormuz-rouvre-mais-la-paix-reste-fragile-1d193e » et « …-d37843 » (approved, même titre) | L'un des deux. | Retirer l'autre. |

À noter en passant : le slug de l'article approved « ce-qui-change-pour-votre-portefeuille-en-avril-2026 » contient un vouvoiement. Je ne l'ai pas relu.

---

### 4 A. Points de l'audit précédent

Aucun des points de la liste (« déduit », « 1660 € », « ex. Solana, CW8, LVMH », etc.) n'apparaît dans les 25 articles relus. L'article 1 cite le solana, mais dans un compte rendu de marché, pas comme exemple d'achat.

---

### 4 A. Lexique relevé

| Notion | Appellations rencontrées | Endroits |
|---|---|---|
| Série | « cette série atteignait 30 jours consécutifs » ; « la plus longue série de l'année » (série de jours en profit) | article bitcoin-un-signal… § 1 et [val_recap]. Le sens est différent de la « série » de l'app (jours d'activité) : risque de confusion faible mais réel. |
| Capitalisation | sens 1 : « capitalisation, c'est-à-dire en valeur totale de toutes les unités en circulation » ; sens 2 : « [capitalisation](/dictionnaire/capitalisation) » = réinvestissement des intérêts | sens 1 : article bitcoin-ether-solana… § « Pourquoi le solana… » ; sens 2 : articles 12, 16, 18, 23. Deux sens, et le lien du dictionnaire pointe toujours vers « Capitalisation (Épargne) ». |
| Portefeuille | « portefeuille numérique » (crypto) ; « portefeuilles qui détiennent du bitcoin » ; « [portefeuille](/dictionnaire/portefeuille) actions diversifié » ; « portefeuille obligataire » (assureur) | articles 1 et 2 (crypto) ; articles 7, 10, 20, 22, 25 (placements) |
| Patrimoine | « patrimoine futur », « constitution de patrimoine », « patrimoine net » | articles 4, 13, 17, 21 |
| Épargne / investissement | « épargne », « épargne investie », « épargne de précaution » (dictionnaire), « fonds d'urgence » (article 15), « épargne d'urgence » (article 19) | Trois termes pour la même notion : précaution, urgence, fonds d'urgence. |
| Épargne de précaution, durée | « 2 à 3 mois de dépenses » (article 18) ; « trois à six mois » (articles 15, 19, 23) | Incohérence de durée entre articles. |
| Flat tax | « flat tax », « prélèvement forfaitaire unique », « PFU » | articles 4, 16, 23. La définition du dictionnaire liée (« Flat tax ») indique elle-même 30 % et 17,2 % : à corriger (31,4 %, 18,6 %). |
| Leçon | « C'est ça la leçon fondamentale des intérêts composés » ; « la vraie leçon » ; « La leç » (tronqué) | articles 4, 8, 22. Sens courant, pas l'unité « leçon » de l'app. |
| Val | bloc [val_recap] présent seulement dans les articles 1 et 2 ; ailleurs, narrateur « on » ou « je » (article 24 : « j'ai envie de te mettre sous les yeux ») | voix narrative incohérente entre articles |
| Liens du dictionnaire à contresens | « tracker » → Tracker (ETF) ; « options » → Options (Trading) ; « arbitrage » → Arbitrage (Trading) ; « effet de levier du temps » → Effet de levier (Trading) | articles 11, 8, 17, 24, 18. La liaison automatique ne tient pas compte du sens. |
| Prénoms des exemples | Mathieu, Lucas (×4), Théo (×5), Camille (×3), Léa (×3), Lucie, Thomas (×2) | articles d'intérêts composés : mêmes prénoms et mêmes scénarios d'un doublon à l'autre |

## 4 B. 25 articles evergreen

### 4 B. Articles relus en entier (25)

Statut published (15) :
1. budget-etudiant-comment-ne-plus-finir-a-sec-avant-le-20
2. etf-le-placement-que-2-6-millions-de-francais-ont-adopte-et-pourquoi-tu-devrais
3. epargner-avec-un-petit-salaire-la-methode-qui-marche-vraiment
4. pea-ou-assurance-vie-le-match-fiscal-qui-change-tout
5. les-interets-composes-pourquoi-ton-argent-travaille-en-dormant
6. la-regle-des-50-30-20-reprends-le-controle-de-ton-budget
7. pea-le-compte-bourse-qui-te-fait-payer-moins-d-impots
8. pea-le-compte-bourse-qui-te-fait-payer-presque-zero-impot
9. etf-pour-debutants-comment-investir-dans-1-500-entreprises-avec-50
10. pea-l-enveloppe-fiscale-qui-te-fait-economiser-des-milliers-d-euros-en-bourse
11. la-crypto-en-clair-ce-que-tout-le-monde-devrait-savoir
12. l-or-ne-baisse-jamais-la-realite-est-plus-nuancee
13. pea-quel-type-choisir-selon-ta-situation-en-2026
14. bitcoin-decrypte-comprendre-la-cryptomonnaie-qui-revolutionne-l-argent
15. pea

Statut draft mais is_published=1 (10) :

16. lepargne-de-precaution-ton-filet-de-securite-financier
17. comment-calculer-ton-taux-dendettement-et-pourquoi-cest-crucial-pour-tes-projets
18. comprendre-le-taux-dusure-la-protection-qui-peut-limiter-tes-emprunts
19. comprendre-le-cout-reel-dun-credit-consommation-ne-tombe-pas-dans-le-piege-des-mensualites-attractives
20. les-frais-bancaires-caches-comment-les-detecter-et-les-eviter
21. le-taux-deffort-comment-savoir-si-ton-loyer-te-ruine-vraiment
22. les-frais-de-courtage-pourquoi-ils-peuvent-ruiner-ta-rentabilite-et-comment-les-eviter
23. leffet-boule-de-neige-des-interets-composes-pourquoi-commencer-a-epargner-a-20-ans-change-tout
24. le-livret-a-pourquoi-cest-ton-meilleur-ami-pour-debuter-meme-si-ce-nest-pas-le-plus-rentable
25. leffet-des-frais-sur-ton-epargne-a-long-terme-le-detail-qui-peut-te-couter-des-milliers-deuros

Thèmes couverts : budget (1, 6), épargne et livrets (3, 16, 24), PEA (4, 7, 8, 10, 13, 15), ETF et intérêts composés (2, 5, 9, 23), frais (20, 22, 25), crédit (17, 18, 19, 21), crypto (11, 14), or (12).

Les calculs cités ont été refaits (versements mensuels, capitalisation mensuelle).

---

### 4 B. A. Problèmes transversaux (plusieurs articles)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| 9 brouillons (n° 17 à 25) | ex. taux-dendettement : « Si tu es en début de carrière » ; taux-dusure : « les taux d'usure ont été » ; credit-consommation : « un paiement en plusieurs fois sans » ; frais-bancaires : « Mathieu, 26 ans, a fait ses comp » ; frais-de-courtage : « Coût mensuel : » ; boule-de-neige : « un indice bours » ; livret-a : « c'est pour ton épargne de » ; effet-des-frais : « Lis-le avant d'investir, » | Le texte stocké s'arrête au milieu d'une phrase, vers 5 000 caractères. Ce n'est pas une limite de l'extraction : d'autres brouillons font 9 500 caractères. Ces articles sont is_published=1, donc lisibles tels quels. | Dépublier, ou régénérer la fin de chaque article et ajouter une conclusion. | important |
| les 25 articles | « l'épargne », « d'impôt », « c'est »… (12 772 apostrophes droites ' contre 42 typographiques dans tout le fichier) | Apostrophe droite partout, alors que le projet utilise ’. | Remplacer automatiquement ' par ’ dans le texte affiché, sans toucher aux URL ni au JSON. | cosmétique |
| les 25 articles | « "commencer tôt" », « "paye-toi d'abord" », « 'quand le moment sera venu' », « 'synthétiques' » | Guillemets droits doubles ou simples au lieu de « … ». | « commencer tôt », « paye-toi d'abord », etc. | cosmétique |
| brouillons et crypto/bitcoin | « 1 200€ », « 24% », « 30% en une semaine », « 3% par an » | Pas d'espace (insécable) avant € et %, de façon systématique. | « 1 200 € », « 24 % ». | cosmétique |
| pea-ou-assurance-vie (Sources) ; les-interets-composes (Sources) ; la-regle-des-50-30-20 (Sources) ; pea-le-compte-bourse-qui-te-fait-payer-moins-d-impots (Sources) | « (https://nexipa.com/[bourse](/dictionnaire/bourse)/pea-ou-assurance-vie-comparatif-fiscal/) » ; « …adaptation-[inflation](/dictionnaire/inflation)-et-pouvoir-dachat/) » ; « …plan-depargne-en-actions-[pea](/dictionnaire/pea)) » ; « [DEGIRO — [Intérêts composés](/dictionnaire/interets-composes) : …] » | Le lien automatique vers le dictionnaire a été inséré dans les URL et dans le texte des liens de sources. Les liens sont cassés et le crochet s'affiche. | Exclure du lien automatique le contenu des liens Markdown et des URL, puis réparer ces 4 blocs de sources. | important |
| etf-pour-debutants (« PEA ou compte-titres ») ; credit-consommation (« Prenons un exemple concret avec Sophie ») ; taux-deffort (« L'exemple de Théo ») ; frais-de-courtage (« L'exemple concret de Thomas ») | « deux [options](/dictionnaire/options) », « trois [options](/dictionnaire/options) » | Le mot courant « options » (« choix ») renvoie vers la définition des options financières (produits dérivés). C'est un contresens. | Ne pas lier « options » au sens courant (liste d'exclusion), ou écrire « deux choix ». | gênant |
| les-interets-composes (« Le temps est ton seul vrai avantage ») | « tu es assis sur une mine d'[or](/dictionnaire/or) sans le savoir » | Le lien automatique transforme l'expression « mine d'or » en lien vers la définition de l'or. S'y ajoute un masculin implicite (« assis »). | « à 25 ans, tu as entre les mains un atout énorme : le temps. » (sans lien) | gênant |
| pea-quel-type (« Le PEA-PME : pas pour tout le monde ») ; pea (« L'accès à une diversification européenne ») | « le MSCI World ou le S&amp;P 500 » ; « (MSCI World, S&amp;P 500...) » | L'entité HTML s'affiche telle quelle (« S&amp;P »). | « S&P 500 » | important |
| pea-ou-assurance-vie, pea-l-enveloppe-fiscale, etf-pour-debutants, interets-composes, budget-etudiant, epargner-avec-un-petit-salaire, etc. | « Lucas, 26 ans… », « Lucas — oui, encore lui — », « Lucas, 27 ans… », « Luca, 24 ans… » | Le même prénom « Lucas » sert d'exemple dans presque tous les articles, avec des âges et des situations différents ; il apparaît même en « Luca ». L'effet est répétitif et peu crédible. | Varier les prénoms (Inès, Yanis, Camille…) et retirer « oui, encore lui ». | cosmétique |
| plusieurs articles PEA/ETF | « Ouvre ton PEA… », « Ouvre un PEA chez un courtier en ligne (Fortuneo, Boursorama, Trade Republic) », « Commence par un seul ETF MSCI World » | Chaque article prescrit un parcours d'achat précis : enveloppe, courtier nommé et ETF nommé. C'est un conseil d'investissement implicite, répété partout. | Décrire les possibilités (« Beaucoup de débutants regardent d'abord… ») sans impératif, sans nom de courtier ni de produit, et ajouter la mention « Ce n'est pas un conseil personnalisé ; investir comporte un risque de perte en capital. » (présente seulement dans pea-quel-type). | important |
| articles PEA (7, 8, 10, 13) | « Ouvre ton PEA aujourd'hui avec 1 € », « 10 € », « 50 € », « même à vide », « même sans un centime à investir » | Le montant minimal se contredit d'un article à l'autre. « À vide » et « sans un centime » sont faux, puisqu'il faut un premier versement pour ouvrir le plan. | « Le compteur des 5 ans démarre au premier versement, même petit (le minimum dépend de l'établissement). » | gênant |
| 50-30-20 vs lepargne-de-precaution vs epargner-avec-un-petit-salaire | « 3 à 6 mois de dépenses » / « 1 à 3 mois de dépenses » / « 3 mois de dépenses » | Le matelas recommandé n'est pas le même d'un article à l'autre. | Harmoniser : « en général 3 à 6 mois de dépenses ; commence par 1 mois, c'est déjà un vrai filet. » | gênant |
| taux-dendettement / credit-consommation / taux-deffort | « au-delà de 35% » / « au-delà de 33% d'endettement » / « ne pas dépasser 33 % de taux d'effort » | Le seuil bancaire varie. La norme du HCSF est de 35 % (assurance comprise) ; 33 % est l'ancien repère. | Partout : « 35 % (norme du HCSF, assurance comprise) ». | gênant |

---

### 4 B. B. Articles « published »

#### 1. budget-etudiant-comment-ne-plus-finir-a-sec-avant-le-20

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article budget-etudiant…, paragraphe « La bonne nouvelle ? » | « 87 € par mois en livraison Uber Eats — soit le prix d'un mois de nourriture au CROUS » | Calcul faux : l'article chiffre lui-même 20 repas CROUS à 66 €. Un mois complet de repas coûte bien plus que 87 €. | « 87 € par mois en livraison, soit plus de 25 repas au CROUS. » | gênant |
| article budget-etudiant…, chapô et premier bloc | « des loyers qui explosent » ; « La vie étudiante coûte cher — et ça empire. » | Ton alarmiste. Les chiffres datent de l'enquête Unef d'août 2025, alors qu'on est fin 2026. | « Les prix ont encore grimpé ces dernières années. » Et mettre à jour la source (enquête 2026). | gênant |
| article budget-etudiant…, « La règle des 50/30/20 adaptée » | « en tant qu'étudiant dans une grande ville » | Masculin implicite. | « si tu fais tes études dans une grande ville » | gênant |
| article budget-etudiant…, « Les outils qui font le boulot à ta place » | « tu n'auras plus jamais de mauvaise surprise en regardant ton solde » | Promesse absolue. | « tu auras beaucoup moins de mauvaises surprises en regardant ton solde » | cosmétique |

#### 2. etf-le-placement-que-2-6-millions-de-francais-ont-adopte-et-pourquoi-tu-devrais

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article etf-le-placement…, titre (et slug) | « ETF : le placement que 2,6 millions de Français ont adopté (et pourquoi tu devrais) » | Formule interdite (« tu devrais ») et incitation directe à investir. | « ETF : le placement que 2,6 millions de Français ont adopté (et comment il marche) » | important |
| article etf-le-placement…, chapô | « une seule action qui en cache des centaines » | Inexact : une part d'ETF n'est pas une action. | « une seule part qui en contient des centaines » | cosmétique |
| article etf-le-placement…, titre de bloc et « Lucas, 27 ans » | « Un seul ticket pour 1 500 entreprises mondiales » / « plus de 1 400 entreprises dans 23 pays » / « Le MSCI World regroupe les 1 400+ » | Le nombre change dans le même article (1 500, puis 1 400). Le MSCI World compte environ 1 300 à 1 400 titres. | « Environ 1 400 entreprises » partout. | gênant |
| article etf-le-placement…, « Le vrai avantage : les frais » | « avec une performance brute de 8 % par an » + calculateur « taux »: 8 | Un rendement de 8 % pris comme hypothèse par défaut, sans réserve. | « Avec une hypothèse de 6 % par an (rien n'est garanti, ça peut être moins ou négatif)… » et calculateur réglé par défaut à 4 ou 5 %. | gênant |
| article etf-le-placement…, quiz « columns_quiz » | « Ce n'est pas la composition du portefeuille, ni la réputation du gestionnaire — c'est quelque chose de bien plus mécanique et mesurable dès le premier euro investi. » | Le texte d'introduction donne la réponse du quiz (les frais). | Retirer cette phrase et garder la question seule. | gênant |
| article etf-le-placement…, « Par où commencer concrètement ? » | « Ouvre un PEA chez un courtier en ligne (Fortuneo, Boursorama, Trade Republic) » ; « Commence par un seul ETF MSCI World ou S&P 500 … un ETF Amundi ou iShares à moins de 0,20 % de frais suffit largement. » | Conseil d'investissement : courtiers, indices et émetteurs nommés à l'impératif. | « Beaucoup de débutants regardent d'abord un ETF large (monde, par exemple) aux frais bas, dans un PEA. Compare les frais, et ne mets que ce dont tu n'auras pas besoin avant 5 à 10 ans. » | important |
| article etf-le-placement…, dernier callout | « c'est le placement préféré d'une génération » | Pression sociale (« tout le monde le fait »). | « C'est devenu un placement très répandu chez les moins de 35 ans. » | gênant |
| article etf-le-placement…, « Pourquoi les ETF ont explosé » | « permet depuis quelques années d'y loger des ETF éligibles » | Inexact : il existe des ETF éligibles au PEA depuis les années 2000. | « permet d'y loger des ETF éligibles » | cosmétique |

#### 3. epargner-avec-un-petit-salaire-la-methode-qui-marche-vraiment

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article epargner-avec-un-petit-salaire…, « LEP, Livret A : lequel choisir » | « contre 1,5 % pour le Livret A » ; « 250 € d'intérêts annuels contre 150 € sur un Livret A, soit 100 € de plus par an » | Information périmée : le Livret A est à 1,7 % depuis le 1er août 2026, ce qui donne 170 € et un écart de 80 €. | « contre 1,7 % pour le Livret A (depuis le 1er août 2026) … 250 € contre 170 €, soit 80 € de plus par an » | important |
| article epargner-avec-un-petit-salaire…, quiz LEP | choix « 1,5 % — identique au Livret A » ; explication « un point de plus que le Livret A à 1,5 % … 100 € de plus par an » | Même donnée périmée dans le quiz. Par ailleurs, le texte du bloc parle de la prime d'activité alors que la question porte sur le LEP. | Explication : « 2,5 %, contre 1,7 % pour le Livret A : 80 € de plus par an au plafond. » Rapprocher le texte du sujet de la question. | important |
| article epargner-avec-un-petit-salaire…, « LEP, Livret A » | « ne doit pas dépasser 23 028 € pour une personne seule (environ 1 920 € brut mensuel) » | Conversion fausse : le revenu fiscal de référence n'est pas un brut mensuel. 23 028 € de revenu fiscal correspondent à environ 2 100 € nets imposables par mois. L'article sous-estime donc qui y a droit. | « … (soit, pour une personne seule, un salaire net d'environ 2 100 € par mois) » | gênant |
| article epargner-avec-un-petit-salaire…, citation | « Même si votre demande a été refusée par le passé, refaites une simulation dès aujourd'hui. » | Vouvoiement. | « Même si ta demande a été refusée avant, refais une simulation : les barèmes d'avril 2026 ont changé. » | important |
| article epargner-avec-un-petit-salaire…, 1er bloc (Luca) | « a commencé avec 30 € par mois … Un an plus tard, il avait 400 € de côté » | Calcul faux : 30 € × 12 donnent 360 €, plus environ 3 € d'intérêts. | « Un an plus tard, il avait 360 € de côté » | gênant |
| article epargner-avec-un-petit-salaire…, « Les aides que tu touches » | « un vrai "quatorzième mois" qui tombe chaque trimestre » | Formule incohérente : la prime d'activité est versée chaque mois et recalculée chaque trimestre. | « un vrai coup de pouce chaque mois » | cosmétique |
| article epargner-avec-un-petit-salaire…, « LEP, Livret A » | « C'est de l'argent laissé sur la table. » / « LDDS » non expliqué | Calque de l'anglais ; LDDS est du jargon non expliqué. | « C'est de l'argent auquel ils ont droit et qu'ils ne touchent pas. » / « LDDS (Livret de développement durable et solidaire) » | cosmétique |

#### 4. pea-ou-assurance-vie-le-match-fiscal-qui-change-tout

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article pea-ou-assurance-vie…, comparatif « Rendement annualisé moyen » | « ~8% (hypothèse prudente) » | Rendement présenté comme acquis : 8 % par an en actions n'a rien de « prudent ». | « ~6 % (hypothèse, non garantie) » | important |
| article pea-ou-assurance-vie…, « La vraie bonne réponse » | « Ouvre ton PEA maintenant, même à vide … Alimente-le en priorité avec des ETF actions européens ou monde. » ; « Une répartition courante chez les 25-40 ans : 60 % PEA, 40 % assurance-vie. » | Conseil d'investissement à l'impératif et répartition chiffrée présentée comme une norme. « À vide » est faux, puisqu'il faut un premier versement. | « Beaucoup combinent les deux : un PEA ouvert tôt (avec un premier petit versement) pour les actions, une assurance-vie pour la partie sécurisée. La répartition dépend de tes projets. » | important |
| article pea-ou-assurance-vie…, callout | « Ouvre ton PEA le plus tôt possible — même avec 100 €. » | Impératif et pression. | « Le compteur des 5 ans démarre au premier versement : ouvrir tôt, même avec peu, peut valoir le coup. » | gênant |
| article pea-ou-assurance-vie…, chapô | « peut faire gagner des milliers d'euros » | Promesse de gain. | « peut changer pas mal de choses sur ce que tu gardes après impôts » | gênant |
| article pea-ou-assurance-vie…, liste « Ce que le PEA ne peut pas faire » | « En cas de décès, les capitaux sont transmis hors succession jusqu'à 152 500 € par bénéficiaire » | Imprécis : ce plafond ne vaut que pour les sommes versées avant 70 ans (30 500 € au-delà). | « …jusqu'à 152 500 € par bénéficiaire pour les sommes versées avant 70 ans » | gênant |
| article pea-ou-assurance-vie…, paragraphe « Tu ouvres ton PEA… » | « l'assurance-vie pour trader » ; « perdant des années de maturation fiscale » | Anglicisme et jargon. | « l'assurance-vie pour acheter et vendre souvent » ; « perdant des années d'ancienneté fiscale » | cosmétique |
| article pea-ou-assurance-vie…, paragraphe « Ces chiffres issus de la simulation Nexipa » | « montrent l'écart de performance brute » (alors que le comparatif affiche « Capital net ») | Les termes brut et net se contredisent. | « montrent l'écart de capital sur 15 ans (hypothèses) » | cosmétique |

#### 5. les-interets-composes-pourquoi-ton-argent-travaille-en-dormant

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article les-interets-composes…, quiz (explication) | « Les 159 € de différence avec les intérêts simples (1 800 €) » | Calcul faux : 2 159 − 1 800 = 359 €. | « Les 359 € de différence avec les intérêts simples (1 800 €)… » | important |
| article les-interets-composes…, « Les trois leviers » | « même 50 € par mois à 22 ans valent mieux que 200 € à 35 ans » | Faux avec les hypothèses de l'article (7 % par an, jusqu'à 65 ans) : on obtient environ 164 000 € contre 244 000 €. | « même 50 € par mois dès 22 ans pèsent lourd : à 65 ans, ça peut faire plus que ce que tu as versé, multiplié par six. » (ou retirer la comparaison) | important |
| article les-interets-composes…, « 7-8 % par an : d'ou vient ce chiffre ? » | « la performance historique approximative du MSCI World … dividendes réinvestis, net d'inflation, sur plusieurs décennies » | Faux : 7 à 8 % est un rendement nominal. Une fois l'inflation déduite, l'historique tourne plutôt autour de 4 à 5 %. Le texte présente aussi ce chiffre comme une base de calcul fiable. | « C'est à peu près ce qu'a fait le MSCI World par le passé, avant inflation, avec de grosses années de baisse. Ce n'est pas une promesse. » | important |
| article les-interets-composes…, chapô | « Avec les intérêts composés et un rendement de 7 %, tu te retrouves avec plus de 220 000 €. Voilà la magie. » | Rendement présenté comme acquis et promesse. | « Avec une hypothèse de 7 % par an (non garantie), ça pourrait dépasser 220 000 €. » | important |
| article les-interets-composes…, tableau Lucas/Clara/Marie | « ~547 000 € », « ~264 000 € », « ~115 000 € » | À 7 %, on obtient plutôt environ 525 000, 244 000 et 104 000 €. Les chiffres sont gonflés d'environ 5 à 10 %. | Recalculer (≈ 525 000 / 244 000 / 104 000 €). | gênant |
| article les-interets-composes…, exemple Sophie/Lucas | « Lucas touche 700 € × 30 = 21 000 € d'intérêts. Sophie, elle, voit son capital grimper à 76 123 €. » | L'exemple compare des intérêts à un capital. | « …Sophie, elle, touche 66 123 € d'intérêts (capital final 76 123 €). » | gênant |
| article les-interets-composes…, « La regle des 72 » | « tu en as 10 000 € à 35 ans, 20 000 € à 45 ans, et 40 000 € à 55 ans — sans avoir touché à rien » | Résultat présenté comme certain. | « …à 7 % par an, ça doublerait environ tous les 10 ans (si le rendement suit, ce qui n'est jamais garanti). » | gênant |
| article les-interets-composes…, quiz (texte) | « un ETF World capitalisant est souvent le premier outil recommandé aux débutants » | Recommandation de produit. | « les ETF capitalisants réinvestissent les dividendes automatiquement » | gênant |
| article les-interets-composes…, dernier callout | « Ils demandent juste du temps et de la discipline — deux choses que tout le monde possède à 25 ans. » ; « ni expertise ni chance » | Ton moralisateur, et faux : les marchés comportent un risque. | « Ils demandent surtout du temps. Et à 25 ans, du temps, tu en as. » | gênant |
| article les-interets-composes…, titres de bloc | « d'ou vient ce chiffre ? » ; « La regle des 72 : calcule tout de tete » | Accents manquants. | « d'où », « règle », « tête » | cosmétique |
| article les-interets-composes…, quiz et liste | « plutôt que de te verser du cash » ; « la régularité bat le timing » | Anglicismes. | « plutôt que de te les verser » ; « la régularité compte plus que le bon moment » | cosmétique |

#### 6. la-regle-des-50-30-20-reprends-le-controle-de-ton-budget

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article la-regle-des-50-30-20…, « Les 20 % d'epargne » | « Taux modestes en 2026 (autour de 1,4 à 1,6 %) » | Information périmée : Livret A et LDDS sont à 1,7 % depuis le 1er août 2026. | « Taux modestes (1,7 % sur le Livret A et le LDDS) » | important |
| article la-regle-des-50-30-20…, citation | « vaut infiniment mieux qu'un budget parfait que tu mettras en place 'quand le moment sera venu'. Le bon moment, c'est maintenant. » | Pression et guillemets simples droits. | « Un budget approximatif, c'est déjà un vrai départ. Pas besoin d'attendre le budget parfait. » | gênant |
| article la-regle-des-50-30-20…, titres de bloc | « Ce que ca donne avec un vrai salaire » ; « Les 20 % d'epargne » | Cédille et accent manquants. | « ça », « d'épargne » | cosmétique |
| article la-regle-des-50-30-20…, premier titre | « Trois chiffres pour ne plus jamais finir le mois dans le rouge » | Promesse absolue. | « Trois chiffres pour moins finir le mois dans le rouge » | cosmétique |

#### 7. pea-le-compte-bourse-qui-te-fait-payer-moins-d-impots

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article pea-le-compte-bourse…-moins-d-impots, « La fiscalite apres 5 ans » | « seulement les prélèvements sociaux de 17,2 %. Sur un compte-titres classique, ces mêmes gains auraient été taxés à 30 % » | Information périmée : 18,6 % et 31,4 % en 2026. | « …seulement les prélèvements sociaux de 18,6 %. Sur un compte-titres classique : 31,4 %. » | important |
| article pea-le-compte-bourse…-moins-d-impots, tableau | ligne « Retrait après 5 ans : 0 % / 17,2 % / 17,2 % » ; ligne « Compte-titres classique : 12,8 % / 17,2 % / 30 % » | Périmé, et contradictoire avec la 1re ligne du même tableau (18,6 % et 31,4 %) ainsi qu'avec le quiz (31,4 %). | « 0 % / 18,6 % / 18,6 % » et « 12,8 % / 18,6 % / 31,4 % » | important |
| article pea-le-compte-bourse…-moins-d-impots, chapô et dernier callout | « pourquoi l'ouvrir dès maintenant » ; « Astuce : ouvre ton PEA aujourd'hui avec un premier versement de 1 €. » | Pression et conseil à l'impératif. | « …et pourquoi beaucoup l'ouvrent tôt » ; « Bon à savoir : le compteur démarre au premier versement, même petit. » | gênant |
| article pea-le-compte-bourse…-moins-d-impots, liste « Ce que tu peux mettre dedans » | « (ex : TotalEnergies, LVMH, Airbus) » | Titres précis cités en exemple. | « (les grandes entreprises françaises ou allemandes cotées, par exemple) » | gênant |
| article pea-le-compte-bourse…-moins-d-impots, liste « Choisis ton établissement » | « privilégie un courtier en ligne pour les frais réduits » | Conseil à l'impératif. | « compare les frais : les courtiers en ligne sont souvent moins chers » | cosmétique |
| article pea-le-compte-bourse…-moins-d-impots, titres de bloc | « La fiscalite apres 5 ans » ; « Plafonds, conditions et petits pieges a eviter » | Accents manquants. | « fiscalité après », « pièges à éviter » | cosmétique |
| article pea-le-compte-bourse…-moins-d-impots, quiz (texte) | « pourquoi ouvrir son PEA tôt — même sans argent à investir — est une décision stratégique » | Contradictoire : un premier versement est nécessaire. | « …même avec très peu d'argent… » | cosmétique |
| article pea-le-compte-bourse…-moins-d-impots, liste éligibilité | « l'Union Européenne » | Majuscule fautive. | « l'Union européenne » | cosmétique |

#### 8. pea-le-compte-bourse-qui-te-fait-payer-presque-zero-impot

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article pea-…-presque-zero-impot, citation | « Si vous ne possédez pas déjà un PEA, vous avez tout intérêt à en ouvrir un dès maintenant » | Vouvoiement, pression et conseil. | « Pas encore de PEA ? Bon à savoir : c'est la date du premier versement qui lance le compteur fiscal. » | important |
| article pea-…-presque-zero-impot, quiz « tool_quiz » | bonne réponse « Uniquement 17,2 % de prélèvements sociaux sur les gains » ; explication « Seuls les prélèvements sociaux à 17,2 % … les 30 % d'un compte-titres » ; 4e choix « null » | Taux périmés (18,6 % et 31,4 %). Le 4e choix vide (null) risque de s'afficher comme un bouton vide. | « Uniquement 18,6 % de prélèvements sociaux » / « …les 31,4 % d'un compte-titres » ; supprimer le null. | important |
| article pea-…-presque-zero-impot, 1er bloc | « 30 % au taux forfaitaire, soit 2 100 € perdus » | Périmé : 31,4 %, soit 2 198 €. | « 31,4 % (flat tax), soit environ 2 200 € » | important |
| article pea-…-presque-zero-impot, « Les 5 ans qui changent tout » | « l'imposition de tes gains à 30 % (12,8 % d'impôt sur le revenu + 17,2 % de prélèvements sociaux) … Tu pagues uniquement les prélèvements sociaux à 17,2 % … c'est deux fois moins qu'un compte-titres classique » | Taux périmés, faute (« pagues ») et comparaison fausse : 18,6 % n'est pas la moitié de 31,4 %. | « …à 31,4 % (12,8 % + 18,6 %). Après 5 ans, tu paies uniquement les prélèvements sociaux, 18,6 %, au lieu de 31,4 %. » | important |
| article pea-…-presque-zero-impot, titre et 1er titre de bloc | « (presque) zéro impôt » ; « Une enveloppe magique où tes gains ne sont pas imposés » | Trompeur : 18,6 % restent dus. | « PEA : le compte bourse où tes gains sont moins taxés » ; « Une enveloppe où tes gains échappent à l'impôt sur le revenu » | gênant |
| article pea-…-presque-zero-impot, chapô | « pourquoi l'ouvrir dès aujourd'hui — même sans un centime à investir » | Pression, et faux : il faut un premier versement. | « …et pourquoi l'ouvrir tôt, même avec un tout petit versement, peut compter » | gênant |
| article pea-…-presque-zero-impot, « Le PEA Jeunes » | « accessible jusqu'à 25 ans ou tant que tu restes dans le foyer fiscal parental » | Le « ou » est faux : il faut avoir de 18 à 25 ans et être rattaché aux parents. | « accessible de 18 à 25 ans, tant que tu fais partie du foyer fiscal de tes parents » | gênant |
| article pea-…-presque-zero-impot, liste « Choisis un établissement » | « (Trade Republic, Boursorama, Fortuneo...) » | Courtiers nommés et « ... » au lieu de « … ». | « (banque en ligne, courtier…) » | cosmétique |

#### 9. etf-pour-debutants-comment-investir-dans-1-500-entreprises-avec-50

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article etf-pour-debutants…, liste « Comment acheter ton premier ETF » | « l'Amundi MSCI World PEA porte le ticker CW8 ou ISIN LU1681043599 » | Conseil d'achat explicite : produit, code et ISIN, à l'impératif. | Retirer le produit, le code et l'ISIN : « Repère l'ETF qui t'intéresse par son code ISIN (12 caractères) sur la fiche du courtier. » | important |
| article etf-pour-debutants…, « PEA ou compte-titres » + comparatif | « C'est le cas de l'Amundi MSCI World (code CW8) ou de l'iShares MSCI World Swap PEA — deux références éligibles en 2026. » ; « Synthétiques éligibles (CW8, WPEA) » ; « (IWDA, CW8…) » | Produits précis présentés comme le bon choix. | « Il existe des ETF monde éligibles au PEA, dits synthétiques. » (sans nom ni code) | important |
| article etf-pour-debutants…, callout | « Pour un débutant français, la stratégie optimale est simple : remplir d'abord le PEA avec un ETF MSCI World synthétique, puis basculer sur un CTO » | Conseil d'investissement présenté comme optimal. | « Beaucoup de débutants commencent par un ETF large dans un PEA. À toi de voir selon ton horizon et ton rapport au risque. » | important |
| article etf-pour-debutants…, « L'ETF MSCI World : le couteau suisse » | « un seul s'impose comme point de départ pour presque tous les débutants » | Recommandation d'un produit unique. | « un des plus cités pour débuter est l'ETF MSCI World » | important |
| article etf-pour-debutants…, « L'ETF MSCI World » | « tu possèdes un minuscule bout de Apple, de LVMH, de Samsung » | Faux : Samsung (Corée du Sud, pays émergent) n'est pas dans le MSCI World. Par ailleurs, l'article écrit « de Apple » au lieu de « d'Apple ». | « un minuscule bout d'Apple, de LVMH, de Toyota » | gênant |
| article etf-pour-debutants…, « L'ETF MSCI World » + citation | « autour de 10,4 % brut » ; « Investir 200 € par mois pendant 20 ans aurait produit un capital de l'ordre de 150 000 € » | Chiffre élevé et incohérent avec les autres articles (7 %, puis « 7-8 % »). Il est mis en avant comme référence. | Harmoniser avec une hypothèse prudente et rappeler « le passé ne garantit rien ». | gênant |
| article etf-pour-debutants…, titre et 1er bloc | « 1 500 entreprises » ; « 1 496 autres entreprises » | Le MSCI World compte environ 1 300 à 1 400 titres. | « environ 1 400 entreprises » | gênant |
| article etf-pour-debutants…, « PEA ou compte-titres » | « les ETF doivent être juridiquement domiciliés en Europe (réplication synthétique) » | Deux notions confondues : la règle porte sur 75 % d'actions européennes, qu'on contourne avec la réplication synthétique. La domiciliation est une autre question. | « les ETF monde éligibles utilisent une réplication dite synthétique pour respecter la règle des 75 % d'actions européennes » | gênant |
| article etf-pour-debutants…, quiz DCA (texte) | « C'est la méthode la plus saine psychologiquement — et souvent la plus performante sur 10 à 20 ans. » | Affirmation fausse : un versement unique fait statistiquement mieux dans la majorité des cas. | « C'est une méthode confortable psychologiquement, qui lisse ton prix d'achat. » | gênant |
| article etf-pour-debutants…, quiz DCA | bonne réponse « Tu continues d'investir normalement — tu achètes plus de parts moins cher » | La bonne réponse se devine : c'est la seule longue et nuancée. | Équilibrer la longueur des choix. | cosmétique |
| article etf-pour-debutants…, « ACC ou DIST » | « la version ACC est quasi toujours la meilleure option … sans friction fiscale » | Conseil et jargon (« friction »). | « la version ACC est souvent choisie pour le long terme : les dividendes restent investis. » | cosmétique |
| article etf-pour-debutants…, titres de bloc | « ou mettre ton ETF ? » ; « en 4 etapes » ; « La strategie DCA : investir sans se prendre la tete » | Accents manquants. | « où », « étapes », « stratégie », « tête » | cosmétique |
| article etf-pour-debutants…, liste | « porte le ticker CW8 » | Anglicisme. | « code » | cosmétique |

#### 10. pea-l-enveloppe-fiscale-qui-te-fait-economiser-des-milliers-d-euros-en-bourse

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article pea-l-enveloppe-fiscale…, chapô | « Voilà ce qu'est le PEA — et pourquoi tu devrais l'ouvrir dès aujourd'hui. » | Formule interdite (« tu devrais ») et pression. | « Voilà ce qu'est le PEA, et à qui il peut servir. » | important |
| article pea-l-enveloppe-fiscale…, 1er bloc | « Imagine que tu investis 200 € par mois pendant 10 ans en bourse. Au bout du compte, tu as généré 30 000 € de plus-values. » | Trompeur : 24 000 € versés qui deviennent 30 000 € de gains en 10 ans supposent environ 17 % par an. À 6-7 %, le gain serait plutôt de 9 000 à 11 000 €. | « Imagine qu'après plusieurs années, tu aies 30 000 € de plus-values. » (ou garder 200 €/mois et recalculer ≈ 10 000 €) | important |
| article pea-l-enveloppe-fiscale…, titre | « …qui te fait économiser des milliers d'euros en bourse » | Promesse de gain. | « PEA : l'enveloppe fiscale qui allège l'impôt sur tes gains en bourse » | gênant |
| article pea-l-enveloppe-fiscale…, tableau des types | « PEA-PME … Complément du PEA classique, axé PME/ETI françaises » | Faux : il couvre les PME et ETI européennes. | « …axé PME/ETI européennes » | gênant |
| article pea-l-enveloppe-fiscale…, « Pourquoi la date d'ouverture vaut de l'or » | « Lucas, 23 ans, hésite entre ouvrir son PEA maintenant ou attendre d'avoir plus d'argent. Mauvaise idée. » | Jugement. | « Bon à savoir : s'il l'ouvre maintenant avec 50 €, son compteur tourne déjà. » | gênant |
| article pea-l-enveloppe-fiscale…, « Dans quoi tu peux investir » | « Airbus, LVMH, Siemens, Santander — tout ça rentre. » | Titres précis cités. | « Les grandes entreprises européennes cotées, par exemple. » | gênant |
| article pea-l-enveloppe-fiscale…, quiz | bonne réponse « Tu paies seulement 18,6 % de prélèvements sociaux et ton PEA reste ouvert » | Le texte du bloc juste au-dessus donne la réponse, qui est aussi le choix le plus long. | Reformuler le texte d'introduction. | cosmétique |
| article pea-l-enveloppe-fiscale…, titres et tableau | « La fiscalite du PEA en 2026 » ; « PEA Classique » ; « (loi LFSS 2026) » | Accent manquant, majuscule et redondance (« loi LFSS »), sigle non expliqué. | « fiscalité » ; « PEA classique » ; « (loi de financement de la Sécurité sociale 2026) » | cosmétique |

#### 11. la-crypto-en-clair-ce-que-tout-le-monde-devrait-savoir

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article la-crypto-en-clair…, « Ce que la réglementation change » | « Le règlement européen MiCA … sera pleinement applicable en juillet 2026 » ; « doivent désormais être enregistrées auprès de l'AMF » | Périmé (on est en octobre 2026) et imprécis : on parle maintenant d'agrément MiCA (prestataire de services sur crypto-actifs), plus d'enregistrement. | « MiCA est pleinement applicable depuis juillet 2026 : les plateformes qui servent l'UE doivent avoir un agrément MiCA… » | important |
| article la-crypto-en-clair…, 1er bloc | « envoyer 500 euros à quelqu'un en Corée du Sud en 10 secondes, … sans frais de virement international » | Faux pour Bitcoin (environ 10 minutes par bloc, frais de réseau variables). | « …en quelques minutes, sans passer par une banque (il y a quand même des frais de réseau) » | gênant |
| article la-crypto-en-clair…, « Le Bitcoin, créé en 2009 » | « En juillet 2025, il a atteint un record à 123 000 dollars. » | Périmé : un record plus élevé a été atteint ensuite (octobre 2025). | Retirer le record daté ou le mettre à jour avec la date. | gênant |
| article la-crypto-en-clair…, liste des catégories | « Les altcoins (Solana, Avalanche, etc.) » ; « (DeFi, NFT, contrats intelligents) » | Cryptos nommées, et jargon (DeFi, NFT, altcoins) non expliqué. | « Les autres cryptos (dites « altcoins ») … » ; expliquer DeFi (finance décentralisée) et NFT (jeton unique). | gênant |
| article la-crypto-en-clair…, « Ce que la réglementation change » | « Bonne nouvelle : investir dans la crypto en France est parfaitement légal » ; « les hacks ont représenté » | Ton incitatif et anglicisme. | « Investir en crypto est légal en France, et mieux encadré » ; « les piratages ont représenté » | gênant |
| article la-crypto-en-clair…, chapô | « Bitcoin, blockchain, wallet... » | Anglicisme non expliqué et « ... ». | « Bitcoin, blockchain, portefeuille… » | cosmétique |
| article la-crypto-en-clair…, titre de bloc | « La blockchain : le registre que personne ne peut tricher » | Faute de construction (« tricher » ne prend pas de complément direct). | « le registre que personne ne peut falsifier » | cosmétique |
| article la-crypto-en-clair…, quiz | bonne réponse « Elle est vérifiée et enregistrée simultanément par des milliers d'ordinateurs » | Elle reprend presque mot pour mot le texte. | Reformuler les choix. | cosmétique |

#### 12. l-or-ne-baisse-jamais-la-realite-est-plus-nuancee

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article l-or-ne-baisse-jamais…, plusieurs blocs | « 5 589 dollars l'once un record absolu » ; « Comprendre pourquoi  et pourquoi il corrige aussi  c'est » ; « endettement record des États&nbsp; tout cela » ; « long terme&nbsp; mais » ; « 1 237 tonnes d'or troisième année » ; « et l'or qui ne rapporte rien a perdu » | Les tirets ont disparu (doubles espaces) et l'entité « &nbsp; » s'affiche en clair. Plusieurs phrases deviennent illisibles. | Rétablir les tirets : « l'once — un record absolu », « Comprendre pourquoi — et pourquoi il corrige aussi — c'est… », « endettement record des États : tout cela… ». | important |
| article l-or-ne-baisse-jamais…, quiz (texte) | « les ETF or, qui permettent d'investir dès quelques euros sur un compte-titres ou un PEA-PME » | Faux : l'or n'est éligible ni au PEA ni au PEA-PME. Les « ETF or » sont en réalité des ETC. | « …sur un compte-titres (ce n'est pas éligible au PEA) » | important |
| article l-or-ne-baisse-jamais…, tableau | « ETF or (ex. GLD, GOLD) » ; « Actions minières (ex. Barrick) » | Produits et titre précis cités. GLD est un fonds américain, en principe inaccessible aux particuliers européens. | « ETC sur l'or » ; « Actions de sociétés minières » (sans nom) | important |
| article l-or-ne-baisse-jamais…, dernier callout | « Les experts recommandent entre 5 et 10 % de son patrimoine en or » | Conseil d'allocation attribué à des « experts » vagues. | « Certains gérants citent souvent 5 à 10 % comme ordre de grandeur, mais ça dépend de chaque situation. » | gênant |
| article l-or-ne-baisse-jamais…, 1er bloc et callout | « depuis 50 ans, la tendance de fond est implacable : l'or monte » ; « L'or monte structurellement » | Hausse future présentée comme acquise. | « Sur 50 ans, l'or a nettement monté, avec de longues périodes de baisse (1980-2001, par exemple). » | gênant |
| article l-or-ne-baisse-jamais…, quiz (texte) | « Les analystes de JP Morgan visent 6 300 $ l'once d'ici fin 2026 » | Prévision datée, déjà presque échue. | Retirer, ou dater et relativiser. | cosmétique |

#### 13. pea-quel-type-choisir-selon-ta-situation-en-2026

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article pea-quel-type…, « Le PEA-PME » | « le MSCI World ou le S&amp;P 500 » | Entité HTML visible (voir aussi la section A). | « S&P 500 » | important |
| article pea-quel-type…, quiz « tool_quiz » | « Marie a 22 ans… À 27 ans, son plan devient un PEA classique. » ; 4e choix « null » | Incohérent : le PEA Jeunes s'arrête au plus tard à 25 ans. Le choix « null » risque de s'afficher vide. | « Marie a 20 ans… À 25 ans, son plan devient un PEA classique. » (réponse : 5 ans) ; supprimer le null. | gênant |
| article pea-quel-type…, « Quelle stratégie adopter » | « Ouvre un PEA bancaire dès maintenant … c'est la priorité absolue. » ; « Utilise ton PEA classique pour les ETF larges (MSCI World, Euro Stoxx) » ; callout « ouvre ton PEA le plus tôt possible » | Conseils à l'impératif et pression. Les deux premières puces se contredisent (PEA bancaire, puis PEA Jeunes « en premier »), alors qu'on ne peut détenir qu'un seul PEA. | « Ouvrir tôt, même avec peu, fait démarrer le compteur. Si tu fais encore partie du foyer fiscal de tes parents, c'est le PEA Jeunes ; sinon, le PEA classique. » | gênant |
| article pea-quel-type…, chapô et texte | « PEA Jeune » | Nom différent des autres articles (« PEA Jeunes »). | « PEA Jeunes » | cosmétique |
| article pea-quel-type…, tableau et texte | « Si tu es encore rattaché fiscalement à tes parents » | Masculin implicite (répété dans plusieurs articles PEA). | « Si tu fais encore partie du foyer fiscal de tes parents » | gênant |

#### 14. bitcoin-decrypte-comprendre-la-cryptomonnaie-qui-revolutionne-l-argent

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article bitcoin-decrypte…, 5 paragraphes | « (cite index="11-17,11-18">Le 3 janvier 2009… » ; « (cite index="1-9">Avec une capitalisation… » ; « (cite index="29-12,29-13">le Bitcoin se divise… » ; « (cite index="21-12,21-13">Les frais varient… » ; « (cite index="2-30,2-31,2-32">Le prix peut être… » | Balises de citation d'un outil de génération visibles dans le texte. | Supprimer toutes les balises « (cite index=…> » et « </cite> ». | important |
| article bitcoin-decrypte…, « Comment acheter tes premiers bitcoins » | « investir dès 10€ sur des plateformes comme Kraken » ; « Finst propose 0,15% par transaction avec dépôt gratuit par virement » ; « En 2026, acheter du Bitcoin est devenu simple et sécurisé. » | Incitation à l'achat et promotion de plateformes nommées. | Retirer la section, ou : « Si tu t'y intéresses, vérifie que la plateforme a un agrément MiCA et compare les frais. » | important |
| article bitcoin-decrypte…, « Comment acheter » | « Privilégie toujours les plateformes enregistrées PSAN auprès de l'AMF » | Périmé : depuis juillet 2026, c'est l'agrément MiCA qui compte (le régime PSAN a pris fin). | « Vérifie que la plateforme a un agrément MiCA (liste sur le site de l'AMF). » | important |
| article bitcoin-decrypte…, calculateur | « Simule ton investissement Bitcoin » defaults « taux »: 15 | Un rendement annuel de 15 % sur Bitcoin est présenté par défaut. | Retirer le calculateur (aucun rendement ne se prévoit sur un actif aussi volatil). | important |
| article bitcoin-decrypte…, « Pourquoi Bitcoin attire » | « environ 1,33 trillion de dollars » ; statistique « 1,33T$ » | Faux ami : en français, « trillion » vaut 10^18. | « environ 1 330 milliards de dollars » | important |
| article bitcoin-decrypte…, liste | « Réserve de valeur : appelé "l'or numérique", Bitcoin résiste à l'inflation » | Présenté comme un fait, alors que c'est contestable (Bitcoin a perdu plus de 60 % en 2022, en pleine inflation). | « Réserve de valeur : certains le voient comme de « l'or numérique », mais son prix reste très instable. » | gênant |
| article bitcoin-decrypte…, comparatif | « Frais internationaux : Identiques » | Faux : les frais de réseau varient selon l'encombrement. | « Frais de réseau, variables » | gênant |
| article bitcoin-decrypte…, citation isolée | « Les banques au bord du second plan de sauvetage » | Citation sans contexte, placée avant son explication. | Supprimer ou intégrer au paragraphe suivant. | gênant |
| article bitcoin-decrypte…, chapô | « pour investir intelligent en 2026 » | Faute : adjectif employé comme adverbe. Le ton est aussi incitatif. | « pour comprendre ce qu'il y a derrière » | cosmétique |
| article bitcoin-decrypte…, « Pourquoi Bitcoin attire » | « plusieurs avantages unique » | Accord. | « uniques » | cosmétique |
| article bitcoin-decrypte…, tableau et témoignage | « Hardware wallet sécurisé » ; « il ne fallait pas essayer de timer le marché » ; « (DCA) » sans explication | Anglicismes et jargon. | « portefeuille physique (clé dédiée) » ; « deviner le bon moment » ; « investir petit à petit » | cosmétique |
| article bitcoin-decrypte…, ensemble | (aucune mention de l'impôt) | Un « guide complet » qui ne dit rien de la fiscalité (plus-values taxées à 31,4 %, exonération si le total des cessions de l'année ne dépasse pas 305 €). | Ajouter un bloc fiscalité. | gênant |

#### 15. pea

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article pea, titre, chapô, 1er titre | « TITRE: Les PEA » ; « CHAPO: None » ; « C'est quoi un PEA ? (il est bien) » ; « [paragraph] <br> » | Brouillon publié : chapô « None », titre de bloc provisoire, paragraphe vide. | Titre « Le PEA, de A à Z », un vrai chapô, et suppression du « (il est bien) ». | important |
| article pea, légende d'image | « Trouver un graphique à mettre je le ferais surement avec excel » | Note interne visible par l'utilisateur. | Supprimer le bloc image. | important |
| article pea, tous les paragraphes | « <p class="MsoNormal" style="…text-align:justify;line-height: 150%">… <o:p></o:p></p> » ; « <span style="color: rgb(26, 25, 22)…"> » ; « <span lang="EN-US" …>URL : https://www.economie.gouv.fr \| https://www.legifrance.gouv.fr</span> » | HTML collé depuis Word : styles en dur, texte justifié et couleur fixe presque noire, illisible en mode sombre. Une URL apparaît en clair. | Repasser l'article en blocs propres, sans styles. | important |
| article pea, « Plan Epargne Action » + « Rappel fiscal (données 2026) » + « La règle des cinq ans » + « L'exonération d'impôt sur le revenu » + « L'indisponibilité des fonds » | « prélèvements sociaux (17,2 % en 2026) » ; « PFU de 30 %, qui inclut 12,8 % … et 17,2 % » ; « Retrait avant 5 ans : imposition des gains à 30 % » ; « soumis au PFU de 30 % » ; « au PFU (30 %) » | Taux périmés, alors même que le texte dit « données 2026 » (18,6 % et 31,4 %). | Remplacer partout par 18,6 % et 31,4 % (12,8 % + 18,6 %). | important |
| article pea, « La règle des cinq ans » (2e paragraphe) | « mais il ne peut plus effectuer de nouveaux versements après un retrait partiel (sauf conditions spécifiques liées au PEA-PME) » | Faux depuis la loi Pacte : après 5 ans, un retrait partiel n'empêche plus de verser. L'article contredit aussi pea-l-enveloppe-fiscale. | « …et peut continuer à faire des versements. » | important |
| article pea, « Les assouplissements apportés par la loi Pacte » et « 2019 : la loi Pacte » | « Réduction du délai ouvrant droit à l'exonération IR : de huit à cinq ans. » ; « 1992 … durée de détention de huit ans » | Faux : l'exonération d'impôt sur le revenu s'obtenait déjà après 5 ans. Le seuil de 8 ans concernait la clôture du plan en cas de retrait. | « Avant 2019, un retrait entre 5 et 8 ans fermait le plan ; depuis la loi Pacte, plus de clôture après 5 ans. » | important |
| article pea, 2e titre « Le PEA-PME » | (titre de la section consacrée au PEA Jeunes) | Titre de section faux : le titre « PEA-PME » apparaît deux fois. | « Le PEA Jeunes » | important |
| article pea, ton général | « Il convient de lire intégralement la convention », « il est recommandé de consulter un conseiller » | Registre impersonnel et administratif, incohérent avec le tutoiement de Val dans tous les autres articles. | Réécrire au tutoiement : « Lis bien la convention avant de signer. » | gênant |
| article pea, « Le PEA Jeunes » | « Dès la sortie du rattachement fiscal (souscription d'un avis d'imposition propre) » | Formulation fausse : on ne « souscrit » pas un avis d'imposition. | « (dès que tu fais ta propre déclaration de revenus) » | gênant |
| article pea, titres | « Plan Epargne Action » ; « l'épargne financière des ménages français » ; « l'Union Européenne » | Nom officiel faux (Plan d'épargne en actions), accent et majuscules. | « Plan d'Épargne en Actions » ; « L'épargne financière… » ; « l'Union européenne » | cosmétique |
| article pea, « Éléments à considérer selon le profil » | « Un order peu fréquent sur ETF » ; « (Fortuneo, BoursoBank) » ; « de type 1 €/ordre chez Trade Republic » | Faute (« order » pour « ordre ») et établissements nommés. | « Un ordre peu fréquent… » ; ne pas nommer. | cosmétique |
| article pea, « Plan Epargne Action » et liste « Risques » | « compte-titres(sur lequel » ; « compte espèce » ; « dividendes étrangers,les droits » | Espaces manquantes et accord (« compte espèces »). | « compte-titres (sur lequel » ; « compte espèces » ; « étrangers, les » | cosmétique |
| article pea, légende d'image | « Tableau comparatif (données estimatives 2025) » ; « Le contexte de marché 2020-2026 … puis rebond en 2023-2024 » | Données datées de 2025, et récit qui s'arrête en 2024. | Mettre à jour en 2026. | cosmétique |

---

### 4 B. C. Brouillons is_published=1 (s'ajoutent à la troncature signalée en A)

#### 16. lepargne-de-precaution-ton-filet-de-securite-financier

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article lepargne-de-precaution…, paragraphe « Le secret ? » | « le livret A (3% actuellement) » | Périmé : 1,7 % depuis le 1er août 2026. | « le Livret A (1,7 % depuis août 2026) » | important |
| article lepargne-de-precaution…, même paragraphe | « Évite les placements bloqués type assurance-vie » | Inexact : l'assurance-vie n'est pas bloquée, on peut retirer son argent, avec un délai. | « Évite les placements qui demandent un délai ou qui peuvent baisser : l'idée, c'est de pouvoir récupérer tes sous très vite. » | gênant |
| article lepargne-de-precaution…, paragraphe « Pour la constituer » | « applique la règle du "paye-toi d'abord" » ; « 1 200€ », « livret A » | Impératif, guillemets droits, espaces manquantes et minuscule à Livret A. | « la règle « paye-toi d'abord » : dès que ton salaire tombe, un virement automatique part vers ton Livret A » | cosmétique |

#### 17. comment-calculer-ton-taux-dendettement-et-pourquoi-cest-crucial-pour-tes-projets

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article comment-calculer-ton-taux-dendettement…, « L'exemple de Mathieu » | « Avec un crédit sur 25 ans à 3,5%, ça correspond à un emprunt de seulement 63 000€. » | Calcul faux : 280 € par mois sur 25 ans à 3,5 % permettent d'emprunter environ 56 000 € (hors assurance). | « …environ 56 000 € » | gênant |
| article comment-calculer-ton-taux-dendettement…, « La stratégie des échéances décalées » | « Si tous tes prélèvements tombent le 5 du mois juste après ton salaire, tu peux te retrouver en difficulté temporaire. » | Logique inversée : juste après la paie, c'est le moment où l'argent est disponible. L'« astuce » ne tient pas. | Supprimer la section, ou parler de caler les échéances juste après la paie. | gênant |
| article comment-calculer-ton-taux-dendettement…, « Comment optimiser ton taux » | « réfléchis à la consolidation de dettes … les regrouper en un seul crédit à taux plus bas peut diminuer tes mensualités » | Le regroupement de crédits est présenté sans ses risques (durée plus longue, coût total souvent plus élevé, frais). | Ajouter : « Attention : un regroupement allonge souvent la durée et coûte plus cher au total. Compare le coût total. » | gênant |
| article comment-calculer-ton-taux-dendettement…, « Les subtilités » | « Mais si tu vis seul, c'est différent » | Masculin implicite. | « Mais si tu vis sans personne à charge, c'est différent » | gênant |
| article comment-calculer-ton-taux-dendettement…, 1er bloc | « au-delà de 35%, tu entres dans la zone rouge, même si ce seuil peut parfois être dépassé » | Il faut préciser que c'est la norme du HCSF et qu'elle inclut l'assurance. | « Les banques appliquent une norme de 35 %, assurance comprise (règle du HCSF), avec quelques dérogations. » | cosmétique |

#### 18. comprendre-le-taux-dusure-la-protection-qui-peut-limiter-tes-emprunts

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article comprendre-le-taux-dusure…, « Qu'est-ce que le taux d'usure » | « au dernier trimestre 2023 … 3,05% pour les prêts immobiliers à taux fixe ; 4,26% pour les crédits à la consommation entre 3 000€ et 6 000€ ; 21,16% pour les découverts » | Chiffres faux, même pour 2023 (les seuils d'usure immobiliers dépassaient alors 6 %, ceux du crédit à la consommation 15 %), et périmés en 2026 : 5,29 % pour un prêt immobilier de 20 ans et plus. | « En 2026, le taux d'usure est par exemple de 5,29 % pour un prêt immobilier de 20 ans et plus (chiffres mis à jour chaque trimestre par la Banque de France). » | important |
| article comprendre-le-taux-dusure…, exemple Thomas | « Avec un taux d'usure à 3,05% pour l'immobilier » | Repose sur le chiffre faux et périmé ci-dessus. | Refaire l'exemple avec 5,29 %. | important |
| article comprendre-le-taux-dusure…, liste des conséquences | « tu peux être obligé d'attendre » | Masculin implicite. | « tu devras peut-être attendre » | gênant |
| article comprendre-le-taux-dusure…, titre de bloc | « Stratégies pour contourner les difficultés » | « Contourner » suggère d'échapper à une règle légale. | « Comment améliorer tes chances » | cosmétique |
| article comprendre-le-taux-dusure…, « L'évolution récente » | « Banque Centrale Européenne » ; « Taux Annuel Effectif Global » | Majuscules en dur. | « Banque centrale européenne » ; « taux annuel effectif global » | cosmétique |

#### 19. comprendre-le-cout-reel-dun-credit-consommation-ne-tombe-pas-dans-le-piege-des-mensualites-attractives

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article comprendre-le-cout-reel…, « Option 3 : Prêt personnel bancaire » | « TAEG : 6% ; Mensualité : 91€ ; Coût total : 1 638€ ; Surcoût : 138€ » | Calcul faux : 1 500 € sur 18 mois à 6 % donnent environ 87 € par mois, 1 572 € au total et 72 € de surcoût. Cela fausse aussi la phrase « Elle économise ainsi entre 138€ et 400€ ». | « Mensualité : 87 € ; coût total : 1 572 € ; surcoût : 72 € » | gênant |
| article comprendre-le-cout-reel…, « Le deuxième piège » | « sa mensualité tombe à 215€, mais le coût total monte à 18 060€, soit 3 060€ d'intérêts » | Calcul faux : sur 84 mois à 4,5 %, environ 209 € par mois, 17 500 € au total et 2 500 € d'intérêts. | « …environ 209 €, pour un coût total d'environ 17 500 € (2 500 € d'intérêts) » | gênant |
| article comprendre-le-cout-reel…, chapô et intro | « un coût total qui peut doubler le prix de ton achat » ; « éviter de te ruiner » | Exagération alarmiste : l'exemple de l'article donne +12 %. | « un coût total bien plus élevé que prévu » | gênant |
| article comprendre-le-cout-reel…, « L'effet pervers » | « au-delà de 33% d'endettement » | Seuil périmé (35 %, norme du HCSF). | « au-delà de 35 % » | gênant |
| article comprendre-le-cout-reel…, « Le troisième piège » | « le crédit revolving ou "réserve d'argent" » | Anglicisme : le terme légal est « crédit renouvelable ». | « le crédit renouvelable (ou « réserve d'argent ») » | cosmétique |

#### 20. les-frais-bancaires-caches-comment-les-detecter-et-les-eviter

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article les-frais-bancaires-caches…, « Les commissions d'intervention » | « Même si techniquement tu restes dans ton découvert autorisé après ces opérations, certaines banques appliquent quand même des commissions d'intervention. » | Faux : une commission d'intervention ne s'applique qu'à une opération irrégulière, par exemple au-delà du découvert autorisé. | « Si une opération te fait dépasser ton découvert autorisé, la banque peut facturer une commission d'intervention. » | important |
| article les-frais-bancaires-caches…, exemple Julie | « 8 euros de commission d'intervention par opération, soit 96 euros de frais » | Faux : 96 € dépassent le plafond légal de 80 € par mois, rappelé quelques lignes plus haut. | « …8 € par opération, plafonnés à 80 € sur le mois » | important |
| article les-frais-bancaires-caches…, exemple Sarah | « quatre prélèvements rejetés … pour un total de 80 euros de frais, alors que le montant total des prélèvements n'était que de 65 euros » | Faux : les frais de rejet ne peuvent pas dépasser le montant du prélèvement rejeté (et 20 € au maximum). | « …les frais ne peuvent pas dépasser le montant de chaque prélèvement (20 € au maximum) : jusqu'à 65 € ici. » | important |
| article les-frais-bancaires-caches…, chapô | « Détrompе-toi ! » | Le « е » final est un caractère cyrillique (U+0435) : le mot peut mal se lire avec VoiceOver et échappe à la recherche. | Retaper « Détrompe-toi ! » | gênant |
| article les-frais-bancaires-caches…, « Les virements et prélèvements » | « Un virement classique peut coûter entre 0,50 et 1,50 euro » | Périmé : en ligne, les virements SEPA, y compris instantanés, sont gratuits dans la quasi-totalité des banques. Depuis 2025, le virement instantané ne peut plus coûter plus cher qu'un virement classique. | « Les virements en ligne sont presque toujours gratuits ; au guichet ou en urgence, ça peut coûter plusieurs euros. » | gênant |
| article les-frais-bancaires-caches…, « Les alternatives » | « Boursorama Banque, Fortuneo ou Hello Bank » ; « Revolut, N26 ou Nickel » ; « des tarifs bien plus agressifs » | Établissements nommés comme recommandations, nom périmé (Boursorama Banque est devenue BoursoBank) et anglicisme. | « Les banques en ligne et les néobanques ont souvent des tarifs bien plus bas » (sans nom) | gênant |

#### 21. le-taux-deffort-comment-savoir-si-ton-loyer-te-ruine-vraiment

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article le-taux-deffort…, « Le seuil des 33 % » | « La règle informelle dans le monde bancaire, c'est de ne pas dépasser 33 % de taux d'effort » ; « En 2024, avec l'inflation » | Confusion entre taux d'effort (logement) et taux d'endettement (35 %, norme du HCSF), plus une année périmée. | « Pour un crédit, les banques regardent le taux d'endettement (35 % maximum, assurance comprise). Pour un loyer, beaucoup de bailleurs demandent un loyer inférieur au tiers des revenus. » ; retirer « En 2024 ». | gênant |
| article le-taux-deffort…, Théo | « S'il perçoit 180 € d'APL » (avec 1 980 € nets par mois) | Peu plausible : avec un salaire de 1 980 € nets, une personne seule touche une APL faible ou nulle. | Prendre un revenu plus bas, ou écrire « s'il a droit à une aide au logement (à simuler sur caf.fr) ». | gênant |
| article le-taux-deffort…, Léa | « Transport (Navigo) : 86,40 € » | Tarif périmé (le Navigo mensuel coûte environ 90 € en 2026). L'article oublie aussi que l'employeur rembourse 50 %. | « Navigo : environ 45 € une fois le remboursement de 50 % par l'employeur déduit » | cosmétique |
| article le-taux-deffort…, exemple Théo | « ça paraît pas énorme » ; « les deux apparts » | Registre familier (« ne » omis). | « ça ne paraît pas énorme » ; « les deux appartements » | cosmétique |

#### 22. les-frais-de-courtage-pourquoi-ils-peuvent-ruiner-ta-rentabilite-et-comment-les-eviter

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article les-frais-de-courtage…, « Comment choisir ton courtier » | « Degiro, Trade Republic ou eToro peuvent être intéressants pour débuter. » ; « Boursorama, Fortuneo ou Interactive Brokers sont souvent compétitifs. » | Recommandation de courtiers nommés (dont une plateforme centrée sur les CFD). | « Compare les frais fixes par ordre, les frais de garde et les frais de change ; les courtiers en ligne sont souvent les moins chers. » | important |
| article les-frais-de-courtage…, exemple Marine | « qui veut investir 1000 euros sur une action Total » | Titre précis donné en exemple d'achat, sous un nom périmé (TotalEnergies depuis 2021). | « …sur une action d'une grande entreprise française » | gênant |
| article les-frais-de-courtage…, « L'impact réel » | « Avec une performance moyenne de 7% par an sur 10 ans, cette différence représenterait plus de 3 000 euros de manque à gagner ! » | Calcul faux : 13 € par mois placés à 7 % pendant 10 ans donnent environ 2 250 €. Le rendement de 7 % est en plus présenté comme acquis. | « …avec une hypothèse de 7 % par an, l'écart monterait à environ 2 250 €. » | gênant |
| article les-frais-de-courtage…, intro | « ton broker (courtier) » ; « impacter tes gains » | Anglicismes. | « ton courtier » ; « peser sur tes gains » | cosmétique |

#### 23. leffet-boule-de-neige-des-interets-composes-pourquoi-commencer-a-epargner-a-20-ans-change-tout

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article leffet-boule-de-neige…-change-tout, « Pourquoi le taux de rendement compte » | « À 3 % (livret A actuel) : environ 89 000 € » | Périmé : le Livret A est à 1,7 %. | « À 1,7 % (Livret A en 2026) : environ 63 000 € » | important |
| article leffet-boule-de-neige…-change-tout, même bloc | « À 10 % (rendement historique moyen du S&P 500 sur très long terme, hors inflation) : environ 530 000 € » | Ambigu : « hors inflation » se lit comme « inflation déduite », ce qui serait faux. Le rendement est en plus présenté comme une référence atteignable. | « À 10 % (moyenne passée du S&P 500, avant inflation, sans garantie)… » | gênant |
| article leffet-boule-de-neige…-change-tout, Lucas | « Résultat à 60 ans : environ 185 000 € » / « environ 95 000 € » ; « À 5 % … environ 149 000 € » | Chiffres gonflés : à 6 %, environ 174 000 et 87 000 € ; à 5 %, environ 136 000 €. | Recalculer. | gênant |
| article leffet-boule-de-neige…-change-tout, chapô et Lucas | « pourquoi chaque année d'attente te coûte bien plus que tu ne l'imagines » ; « (il se dit qu'il a le temps, qu'il profitera d'abord de sa vie) » ; « Ces 10 années perdues » | Culpabilisation. | « …pourquoi démarrer tôt, même petit, fait une vraie différence » ; « Lucas commence à 32 ans » ; « ces 10 années de plus » | gênant |
| article leffet-boule-de-neige…-change-tout, Lucas | « 6 % (ce qu'un ETF monde diversifié peut raisonnablement viser sur très long terme) » | Rendement présenté comme un objectif atteignable. | « une hypothèse de 6 % par an, non garantie » | gênant |
| article leffet-boule-de-neige…-change-tout, « Le PEA » | « C'est sans doute l'outil le plus puissant pour un jeune investisseur. » | Conseil. | « C'est un outil souvent utilisé pour investir en actions sur le long terme. » | gênant |

#### 24. le-livret-a-pourquoi-cest-ton-meilleur-ami-pour-debuter-meme-si-ce-nest-pas-le-plus-rentable

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article le-livret-a-pourquoi…, « Qu'est-ce que le livret A » et calculs | « le taux est fixé à 3% par an (depuis février 2023) » ; « Avec le taux actuel de 3% » ; « Le taux de 3% actuel est exceptionnel » | Périmé : 1,7 % depuis le 1er août 2026. Les calculs de Léa (54 € puis 486 € d'intérêts) sont donc faux. | « Le taux est de 1,7 % depuis le 1er août 2026 » ; recalculer (environ 30 € la 1re année, 270 € sur 3 ans). | important |
| article le-livret-a-pourquoi…, « Étape 3 » | « LDDS (14 000 euros de plafond supplémentaires) » | Faux : le plafond du LDDS est de 12 000 €. | « LDDS (12 000 € de plafond en plus) » | important |
| article le-livret-a-pourquoi…, « L'inflation qui grignote » | « Avec une inflation autour de 4-5% ces derniers mois » | Périmé : l'inflation est d'environ 2 % en 2026. | « Avec une inflation autour de 2 %, le Livret A à 1,7 % suit à peine les prix. » | important |
| article le-livret-a-pourquoi…, « Un plafond qui limite » | « tu vas rapidement butter sur ce plafond » | Orthographe. | « buter » | cosmétique |
| article le-livret-a-pourquoi…, titre et intro | « Le livret A » ; « Spoiler : » | Minuscule (le nom officiel est « Livret A ») et anglicisme. | « Le Livret A » ; « Petite surprise : » | cosmétique |

#### 25. leffet-des-frais-sur-ton-epargne-a-long-terme-le-detail-qui-peut-te-couter-des-milliers-deuros

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article leffet-des-frais…-le-detail…, titre de bloc | « L'exemple de Mathieu : 0,5 % de frais en plus = des milliers d'euros en moins » | Incohérent : l'exemple compare 0,20 % et 1,50 %, soit 1,30 point d'écart. | « L'exemple de Mathieu : 1,3 point de frais en plus, des milliers d'euros en moins » | gênant |
| article leffet-des-frais…-le-detail…, exemple Mathieu | « environ 112 000 € » / « que 80 000 € » | Valeurs sous-estimées : environ 125 000 et 95 000 € avec versements mensuels. L'écart (~30 000 €) reste proche. | Recalculer. | cosmétique |
| article leffet-des-frais…-le-detail…, après l'exemple | « Il n'a pas paniqué, il n't pas vendu au mauvais moment. Il a juste signé chez le mauvais intermédiaire. » | Faute de frappe (« n't ») et ton qui juge. | « Il n'a pas paniqué, il n'a pas vendu au mauvais moment. La différence vient seulement des frais. » | gênant |
| article leffet-des-frais…-le-detail…, Option A et liste | « un ETF low-cost » ; « assurance vie » ; « fonds euro » | Anglicisme et graphies incohérentes. | « un ETF à frais réduits » ; « assurance-vie » ; « fonds en euros » | cosmétique |
| article leffet-des-frais…-le-detail…, citation d'Einstein | « selon quel côté de la table tu te trouves » | Construction fautive. | « selon le côté de la table où tu te trouves » | cosmétique |

---

### 4 B. D. Remarque hors périmètre (repérée en sélectionnant les articles)

| Endroit | Texte actuel | Problème | Proposition (ton de Val, tutoiement) | Priorité |
|---|---|---|---|---|
| article gta-6-coute-80-euros-lecon-de-finance-gratuite (published) | slug « gta-6-coute-80-euros-lecon-de-finance-gratuite » / TITRE « Binance quitte l'Europe le 1er juillet, ce que ça change pour toi » ; chapô « Faute d'agrement MiCA … aux Europeens. Voici comment proteger tes cryptos. » | Le slug ne correspond pas au contenu (article sur Binance). Le chapô manque d'accents, et l'actualité du 1er juillet 2026 est échue. L'article cite aussi des plateformes comme « noms solides » (« Bitpanda, Kraken ou Coinhouse »). | Corriger le slug, mettre les accents (« agrément », « Européens », « protéger »), dater l'article et retirer la recommandation de plateformes. | important |

---

### 4 B. Points de l'audit précédent

Aucune des chaînes listées par l'audit précédent (« déduit » pour une réduction d'impôt, « 1660 € », « 240 € », « ex. Solana, CW8, LVMH », etc.) n'apparaît dans ces 25 articles. Le même type de problème revient sous d'autres formes : ETF « CW8 » cité dans etf-pour-debutants, cryptos « Solana, Avalanche » dans la-crypto-en-clair, actions « LVMH, Airbus » dans les articles PEA. Ces cas sont comptés plus haut comme nouveaux.

---

### 4 B. Lexique relevé

| Notion | Appellations croisées | Endroits |
|---|---|---|
| PEA des jeunes rattachés | « PEA Jeunes » / « PEA Jeune » | « Jeunes » : pea-le-compte-bourse…-presque-zero, pea-l-enveloppe-fiscale, pea ; « Jeune » : pea-quel-type, pea-le-compte-bourse…-moins-d-impots |
| Taxe forfaitaire | « flat tax » / « PFU » / « prélèvement forfaitaire unique » / « taux forfaitaire » / « taux plein » | pea-ou-assurance-vie, pea-l-enveloppe-fiscale, pea-quel-type, pea, pea-…-presque-zero (« taux forfaitaire »), pea-…-moins-d-impots (« taux plein ») |
| Compte-titres | « compte-titres ordinaire » / « CTO » / « compte-titres classique » / « compte bourse » | etf-pour-debutants, pea-l-enveloppe-fiscale, pea-…-moins-d-impots, pea |
| ETF | « ETF » / « trackers » / « fonds indiciel coté » / « ETF World » / « ETF monde » | etf-le-placement, etf-pour-debutants, pea-…-presque-zero (« trackers »), pea-l-enveloppe-fiscale, leffet-boule-de-neige |
| Matelas | « épargne de précaution » / « matelas de sécurité » / « filet de sécurité » / « épargne d'urgence » / « bouée de sécurité » / « réserve de précaution » | lepargne-de-precaution, 50-30-20, budget-etudiant (« épargne d'urgence »), epargner-avec-un-petit-salaire (« bouée », « matelas »), pea-ou-assurance-vie (« réserve de précaution »), le-livret-a |
| Livret A | « Livret A » / « livret A » | majuscule : la plupart des articles publiés ; minuscule : le-livret-a-pourquoi (titre), lepargne-de-precaution, leffet-boule-de-neige, la-crypto-en-clair (« un livret A ») |
| Assurance-vie | « assurance-vie » / « assurance vie » | trait d'union partout sauf leffet-des-frais…-le-detail |
| Fonds garanti | « fonds euros » / « fonds en euros » / « fonds euro » | pea-ou-assurance-vie (« fonds euros », « fonds en euros »), pea, leffet-des-frais (« fonds euro ») |
| Banque en ligne | « Boursorama » / « Boursorama Banque » / « BoursoBank » | articles PEA et ETF (« Boursorama »), frais-bancaires (« Boursorama Banque »), pea (« BoursoBank ») |
| Crédit renouvelable | « crédit revolving » / « réserve d'argent » | credit-consommation |
| Seuil bancaire | « 35 % » / « 33 % » ; « taux d'endettement » / « taux d'effort » | taux-dendettement (35 %), credit-consommation (33 %), taux-deffort (33 %, sous l'appellation « taux d'effort ») |
| Patrimoine / portefeuille | « patrimoine » (ensemble des avoirs), « portefeuille » (titres détenus) | l-or (« 5 et 10 % de son patrimoine »), pea (« situation patrimoniale ») ; etf-le-placement (« son portefeuille couvre »), pea-…-moins-d-impots (« Si ton PEA vaut 300 000 € ») |
| Crypto | « crypto » / « cryptomonnaie » / « crypto-actif » ; « Bitcoin » / « le Bitcoin » / « bitcoins » ; « wallet » / « wallet personnel » / « Hardware wallet » | la-crypto-en-clair, bitcoin-decrypte, gta-6-… (Binance) |
| Règle budgétaire | « 50/30/20 » (texte) / « budget-503020 » (lien dictionnaire) | 50-30-20, budget-etudiant, epargner-avec-un-petit-salaire |
| Statut d'indépendant | « auto-entrepreneur » (le nom officiel est micro-entrepreneur) | taux-dendettement |
| Série, Vals, XP, leçon, module | non rencontrés dans ces articles | aucun |

---

# 5. Synthèse : un seul nom par notion

Décisions proposées, à partir des lexiques des sections 1 à 4. Chaque ligne règle une incohérence relevée à plusieurs endroits.

| Notion | Appellations trouvées | Nom à garder | Où changer en priorité |
|---|---|---|---|
| Jours d’affilée avec une leçon | série, flamme, « jours de série », « Ta série » | **série** (et « flamme » pour l’image seulement) | — |
| Bonnes réponses d’affilée | « Meilleure série : 5 d’affilée », « Ta série d’affilée », « Nouveau défi » | **record** : « Record : 5 bonnes réponses d’affilée » ; « Défi réussi » | accuracy.ts:170, 175, 180 ; MedalsCard.tsx:70, 89 ; LessonRecap.tsx:191 |
| Monnaie gagnée dans les coffres | Vals (« 1 Vals ») ; homonyme de la mascotte Val | Garder **Vals** avec une phrase d’explication la première fois (« Les Vals se gagnent dans les coffres de fin de leçon »), et accorder au singulier (« 1 Val ») ; ou renommer la monnaie pour la distinguer de Val | ChestReveal.tsx:334-339 ; StatPills.tsx:45 ; StatBand.tsx:44 |
| Points d’expérience | XP, niveau | **XP** (court, établi), mais « Niveau » réservé à l’XP ; les niveaux d’un univers deviennent « Débutant / Avancé / Expert » sans le mot « niveau » | LevelTabs.tsx ; levels.ts ; learning.ts:198 (« Avancé » contre « Expert ») |
| Suivi de ses placements | Portefeuille (tuile, ancien écran), Mon patrimoine, positions, actifs | **Mon patrimoine** ; « placements » plutôt que « positions » ; « Portefeuille » réservé au portefeuille crypto (wallet) | OutilsScreen.tsx:19-21 ; PortefeuilleScreen.tsx:110 ; PatrimoineStepsCard.tsx:40 |
| Budget du mois | Cash-flow, Reste à vivre, entrées | **Mon budget** (et « Reste à vivre » pour le solde) | OutilsScreen.tsx:26 ; CashflowScreen.tsx:62, 114 ; EpargneScreen.tsx:128 |
| Prix de marché | cours, « cours figé », « prix figé », « sans cours » | **prix de marché** (« cours » se confond avec une leçon) | AssetSearchScreen.tsx:138, 176 ; OperationScreen.tsx:396 ; PositionLine.tsx:82 ; PositionRow.tsx:50 |
| Épargne de sécurité | coussin, coussin de sécurité, épargne de précaution, épargne de sécurité, argent de sécurité, filet | **coussin de sécurité**, avec une fois « (on dit aussi épargne de précaution) » | leçons 101 à 103 ; valTips.ts ; ObjectifScreen.tsx:86 ; GoalsSection.tsx |
| Création de compte | inscription, « S’inscrire », « Créer un compte », « Créer mon compte », « Crée ton compte » | **Créer mon compte** (bouton), « ton compte » (texte) ; « inscriptions » seulement pour dire qu’elles ouvrent bientôt | header.tsx:53 ; LoginScreen.tsx:202 ; discoveryHome.ts:132-133 |
| Connexion | Se connecter, Me connecter, Connexion | **Me connecter** (bouton, comme « Créer mon compte ») | LoginScreen.tsx:201 ; HomeHeader.tsx:89 ; header.tsx:30, 46 |
| Profil / compte | Mon profil, Mon compte | **Mon profil** | HomeHeader.tsx:89 |
| Objectif | objectif d’apprentissage (Ton objectif, six objectifs, sujets) et objectif d’épargne | Apprentissage : **ce qui t’amène / ton sujet** ; épargne : **objectif d’épargne** | ProfilScreen.tsx:135 ; SettingsScreen.tsx:187 ; UniverseCarousel.tsx:76, 93 |
| Leçon dans un module | leçon, étape | **leçon** | ModulePath.tsx:212, 232 |
| Estimation de départ | pari, « Ton pari », « Je parie », estimation | **estimation** (« pari » évoque le jeu d’argent) | SliderScreen.tsx:70, 87 ; lessonPlayer.ts:59 ; shared.ts:4 |
| Résultat d’une leçon | bilan, précision, score | **bilan** (et « précision » pour le pourcentage) | TrueFalseScreen.tsx:405, 410 |
| Verdict d’erreur | Raté !, Pas tout à fait, Presque | **Pas tout à fait** | TrueFalseScreen.tsx:341, 377 ; leçons découvertes |
| Réglages | Réglages, « ton profil » (à tort) | **Réglages** | ReminderPromise.tsx:16 ; SignupScreen.tsx:378 |
