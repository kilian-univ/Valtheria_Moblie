# Valtheria — Les leçons découvertes

Oct 10, 2026 · @Luce Quentin

## Chiffres réglementaires

Les chiffres qui changent avec la loi viennent du site (`GET /regulatory-figures`, route publique, gardée sur le téléphone et relue au plus toutes les 12 heures ; valeurs de secours dans `src/utils/regulatoryFigures.ts` si elle n'a jamais répondu). Ce document montre les textes avec les valeurs du 17 octobre 2026 :
- leçon 1 : l'inflation de l'exemple (`inflation_annuelle`, 2 %) et ce que 1 000 € achètent encore dans 10 ans, calculé à partir d'elle ;
- leçon 3 : le taux d'imposition des gains en crypto (`crypto_taux_imposition`, 31,4 %) et le seuil des ventes (`crypto_seuil_exoneration`, 305 €) ;
- leçon 4 : la durée maximale d'un crédit immobilier (`credit_duree_max`, 25 ans), dont découlent le curseur, le total, les intérêts et la mensualité ;
- leçon 5 : le barème de l'impôt (`ir_bareme_taux`, `ir_bareme_seuils`) et tous les montants qui en découlent.

Restent écrits en dur, parce que ce ne sont pas des chiffres réglementaires : les hypothèses annoncées (5 % par an pour investir, 3,5 % pour le crédit), les cours historiques du bitcoin et les montants de la fiche de paie de référence.

## Le principe

Six objectifs qui font vraiment installer une app d'argent, et pour chacun une leçon découverte de 5 écrans, sans jamais deux fois le même type d'écran.

Le parcours : bienvenue, « Qu'est-ce qui t'amène ? », la leçon de cet objectif, la fin avec la série qui commence, puis l'inscription.

**Les objectifs** : mettre de l'argent de côté ; commencer à investir ; comprendre la crypto ; acheter un jour un logement ; payer moins d'impôts ; je découvre, on verra.

**La palette d'écrans** (ceux marqués « nouveau » sont à créer dans l'app, leur design pourra être revu) :

| Écran | Ce qu'on fait | Noté |
| --- | --- | --- |
| Le pari (`slider`) | estimer avec un curseur | non |
| La révélation (`reveal`) | le vrai chiffre face à l'estimation, avec deux barres | non |
| Vrai ou faux en rafale (nouveau) | 4 cartes à balayer, un verdict et une phrase par carte | oui, réussi à partir de 3 sur 4 |
| Remettre dans l'ordre (nouveau) | glisser des éléments pour les classer, puis valider | oui |
| Associer (nouveau) | relier 4 paires entre deux colonnes, verdict à chaque paire | oui, réussi à partir de 3 sur 4 |
| Répartir (nouveau) | partager une somme entre plusieurs pots avec des curseurs | selon une règle simple |
| Le simulateur (nouveau) | bouger un curseur et voir le résultat changer en direct | non |
| Le dialogue (nouveau) | une conversation avec un personnage, choisir sa réponse | oui |
| La question à choix (`choice`) | trois réponses, une bonne | oui |

**Mots clés** : dans chaque déclic, les mots clés sont entre crochets (« le [temps] fait plus que le [montant] ») ; l'app les retire à l'affichage et s'en sert pour le test « Me tester sur mes déclics ».

**Les règles** : un déclic nommable en une phrase ; une vraie surprise (pari puis révélation, ou simulateur) ; des calculs triviaux ; des pièges crédibles ; aucune morale ; aucun mot interdit (aube, voyage, continuer la marche, jargon, école, 5 minutes par jour) ; des chiffres prudents, soit fictifs et cohérents, soit présentés comme des hypothèses ; et une dernière question notée, sans aide, pour finir sur une réussite.

Chaque écran donne son type, son contenu et les répliques de Val avec son humeur.

## Leçon 1 : Mettre de l'argent de côté, « L'argent qui fond »

**Déclic : l'argent qui dort sur un compte courant perd de la [valeur] ; mis de côté en [premier], au bon endroit, il est protégé.**

1. **Le pari** (`slider`, non noté)
   - « Tu laisses 1 000 € sur ton compte courant pendant 10 ans. Avec 2 % d'inflation par an, que pourras-tu encore acheter avec, en euros d'aujourd'hui ? »
   - Curseur de 500 à 1 200 €, pas de 10, départ 1 000 €.
   - Val (complice) : « Petit pari, sans mauvaise réponse. À ton avis ? »
2. **La révélation** (`reveal`)
   - Environ 820 €.
   - Lignes : sur le compte, toujours 1 000 € ; ce que ça achète encore, environ 820 € (clé) ; 2 % par an est une hypothèse (atténuée).
   - Val (alerte) : « Le chiffre ne bouge pas. C'est ce qu'il achète qui fond. »
3. **Répartir** (nouveau, noté)
   - « Ta paie de 1 800 € vient de tomber. Quelle part pour chaque pot ? »
   - Trois pots en pourcentages de la paie, curseurs par pas de 5 %, total toujours égal à 100 % : Besoins (loyer, courses, transport), départ 70 % ; Envies (sorties, achats), départ 30 %, qui s'ajuste tout seul ; Épargne, départ 0 %.
   - Le pourcentage s'affiche en grand, le montant en euros en petit dessous (10 % = 180 €).
   - Sous l'épargne, en direct : « Dans un an : <montant × 12> € ».
   - Réussi si l'épargne fait au moins 10 % et les besoins au moins 50 %.
   - Val, réussi (fier) : « <épargne> % de ta paie, c'est <montant> € par mois et <montant × 12> € dans un an, sans y penser. » Pas réussi, épargne trop basse (rassurant) : « Essaie d'en garder au moins 10 %. Tes envies s'en remettront. » Pas réussi, besoins trop bas (rassurant) : « Garde au moins la moitié pour le loyer et les courses. »
4. **Vrai ou faux en rafale** (nouveau, noté)
   - « Le Livret A peut te faire perdre des euros. » Faux : « Ce que tu y mets est garanti. »
   - « L'argent d'un Livret A est disponible à tout moment. » Vrai : « Tu peux le retirer quand tu veux, sans frais. »
   - « Un coussin de sécurité se place en bourse. » Faux : « Il doit rester disponible et stable, la bourse peut baisser au mauvais moment. »
   - « Mettre 20 € de côté par mois, ça ne sert à rien. » Faux : « C'est 240 € par an, et surtout une habitude. »
   - Val, réussi (célébrant) : « Tu sais déjà où ranger ton argent. » Pas réussi (rassurant) : « Pas grave, c'est exactement ce qu'on va voir ensemble. »
5. **Question sans aide** (`choice`, noté)
   - « Pour mettre de côté sans y penser, le plus efficace ? »
   - Garder ce qui reste à la fin du mois ; programmer un virement le jour où la paie tombe (bonne) ; mettre de côté chaque fois qu'une prime arrive.
   - Explication : « À la fin du mois, il reste rarement quelque chose, et les primes sont irrégulières. Un virement le jour de la paie, c'est te payer en premier. »
   - Val, bonne réponse (fier) : « Le vrai secret de ceux qui épargnent sans effort. » Erreur (rassurant) : « C'est ce que fait presque tout le monde, et c'est pour ça que ça marche rarement. »

## Leçon 2 : Commencer à investir, « La machine à intérêts »

**Déclic : le [temps] fait plus que le [montant] ; placés 30 ans, 100 € par mois peuvent plus que doubler.**

1. **Le pari** (`slider`, non noté)
   - « Tu places 100 € par mois pendant 30 ans. Si ça rapporte 5 % par an en moyenne, combien as-tu à la fin ? »
   - Curseur de 30 000 à 150 000 €, pas de 1 000, départ 45 000 €.
   - Val (complice) : « Petit pari, sans mauvaise réponse. À ton avis ? »
2. **La révélation** (`reveal`)
   - Environ 81 500 €.
   - Lignes : tu as versé 36 000 € ; les intérêts ont ajouté environ 45 500 € (clé) ; 5 % par an est une hypothèse, rien n'est garanti en bourse (atténuée).
   - Val (complice) : « Plus de la moitié de cet argent, tu ne l'as jamais versée. C'est le temps qui l'a fabriquée. »
3. **Le simulateur** (nouveau, non noté)
   - « Et si tu commençais plus tôt, ou plus tard ? Bouge le curseur. »
   - Curseur « Âge de départ » de 20 à 50 ans, départ 30 ans. 100 € par mois jusqu'à 65 ans, à 5 % par an.
   - Affiché en direct, en grand : le capital à 65 ans ; en petit : le total versé.
   - Calcul : versements en fin de mois, taux mensuel = 1,05 puissance 1/12, moins 1. Ordres de grandeur : environ 196 000 € en partant à 20 ans, 111 000 € à 30 ans, 41 000 € à 45 ans.
   - Val, en direct selon le curseur (complice) : avant 30 ans, « Commencer tôt, c'est le meilleur cadeau à te faire. » ; de 30 à 40 ans, « Chaque année gagnée compte, et il n'est pas trop tard. » ; après 40 ans, « Moins de temps, donc plus d'effort par mois : mais ça reste utile. »
   - Bouton « Continuer » actif dès que le curseur a bougé.
4. **Remettre dans l'ordre** (nouveau, noté)
   - « Classe ces placements, du moins risqué au plus risqué. »
   - Ordre juste : Livret A ; fonds en euros d'une assurance-vie ; ETF Monde ; action d'une seule entreprise. Présentés dans le désordre.
   - Explication : « Le Livret A est garanti par l'État. Le fonds en euros protège ton capital. Un ETF Monde répartit ton argent sur des milliers d'entreprises. Une seule action, c'est tout miser sur un seul nom. »
   - Val, bonne réponse (fier) : « Tu viens de comprendre la diversification. » Erreur (rassurant) : « Presque. Plus ton argent est réparti, moins il est risqué. »
5. **Question sans aide** (`choice`, noté)
   - « Pourquoi un ETF Monde est-il en général moins risqué qu'une seule action ? »
   - Parce qu'il est garanti par l'État ; parce qu'il répartit ton argent sur des milliers d'entreprises (bonne) ; parce qu'il ne peut pas baisser de plus de 10 %.
   - Explication : « Si une entreprise va mal, les milliers d'autres amortissent le choc. Mais un ETF peut baisser, et rien n'est garanti. »
   - Val, bonne réponse (célébrant) : « Exactement : ne pas mettre tous ses œufs dans le même panier. » Erreur (rassurant) : « C'est une idée répandue, mais aucun ETF n'est garanti. Sa force, c'est la répartition. »

## Leçon 3 : Comprendre la crypto, « Le grand huit »

**Déclic : la crypto peut perdre les trois quarts de sa [valeur] en un an ; on n'y met que ce qu'on peut se permettre de [perdre].**

1. **Le pari** (`slider`, non noté)
   - « En novembre 2021, un bitcoin valait environ 69 000 dollars. À ton avis, combien valait-il un an plus tard ? »
   - Curseur de 0 à 100 000 dollars, pas de 1 000, départ 60 000.
   - Val (complice) : « Petit pari, sans mauvaise réponse. À ton avis ? »
2. **La révélation** (`reveal`)
   - Environ 16 500 dollars fin 2022.
   - Lignes : une baisse d'environ 76 % (clé) ; 1 000 € placés au sommet en valaient environ 240 € un an plus tard ; il est remonté depuis, mais personne ne pouvait savoir quand (atténuée).
   - Val (alerte) : « C'est ça, la crypto : des montées folles, et des descentes tout aussi folles. »
3. **Vrai ou faux en rafale** (nouveau, noté)
   - « Une crypto est garantie par une banque centrale. » Faux : « Aucune banque centrale ne garantit le bitcoin ni les autres cryptos. »
   - « Si une plateforme fait faillite, tu peux perdre ce que tu y avais déposé. » Vrai : « C'est arrivé à des millions de clients en 2022. »
   - « Le nombre total de bitcoins est limité à l'avance. » Vrai : « Il n'y en aura jamais plus de 21 millions. »
   - « En France, les gains en crypto ne sont jamais imposés. » Faux : « Quand tu revends contre des euros avec un gain, il est imposé à 31,4 %, sauf si tes ventes de l'année ne dépassent pas 305 €. »
   - Val, réussi (célébrant) : « Tu en sais plus que la moitié des gens qui en achètent. » Pas réussi (rassurant) : « Rien de grave, la crypto est pleine d'idées reçues. »
4. **Le dialogue** (nouveau, noté)
   - Personnage : Léo, ton pote, très enthousiaste.
   - Léo : « J'ai trouvé une nouvelle crypto, elle va faire ×10 cette année. Mets tout ton livret dessus ! »
   - Tes réponses : « Grave, je mets tout. » ; « Je mets juste une petite somme pour voir, au pire je ne perds pas grand-chose. » ; « Pas sur un simple conseil. Je veux d'abord comprendre ce que j'achète, et jamais plus que ce que je peux perdre. » (bonne).
   - Léo répond, bonne réponse : « Ouais… En vrai, je ne sais même pas qui l'a créée. Je vais me renseigner avant, moi aussi. » Tout miser : « Euh… et si ça fait comme en 2022 ? » Petite somme : « Mouais… Tu sais au moins ce que c'est ? Parce que moi, pas trop. »
   - Val, bonne réponse (fier) : « Exactement : on ne place pas son argent sur un simple conseil, sans comprendre ce qu'on achète. Et jamais plus que ce qu'on peut perdre. » Erreur (rassurant) : « Une crypto inconnue qui promet ×10, c'est souvent comme ça que commencent les arnaques. D'abord comprendre ce qu'on achète. »
   - Explication : « Un proche qui promet un gain énorme sur une crypto inconnue : c'est le schéma classique des arnaques, même quand il est de bonne foi. Avant d'acheter, il faut savoir ce que c'est, qui l'a créée et comment on peut perdre. Et même là, on n'y met jamais plus que ce qu'on peut se permettre de perdre. »
   - Pourquoi (audit du 17 octobre 2026) : l'ancienne bonne réponse (« seulement une petite somme ») validait l'achat d'une crypto inconnue vantée par un proche, le schéma type d'une arnaque.
5. **Associer** (nouveau, noté, sans aide)
   - « Relie chaque mot à sa définition. »
   - Bitcoin : la première crypto, créée en 2009.
   - Stablecoin : une crypto qui suit la valeur d'une monnaie, comme le dollar.
   - Blockchain : le registre partagé de toutes les transactions.
   - Portefeuille : l'outil qui garde tes clés d'accès à tes cryptos.
   - Val, réussi (célébrant) : « Tu parles déjà crypto couramment. » Pas réussi (rassurant) : « Ces mots reviendront souvent : tu vas vite les retenir. »

## Leçon 4 : Acheter un jour un logement, « Le vrai prix d'un crédit »

**Déclic : avec un [crédit], un logement coûte bien plus que son prix, et la [durée] change tout.**

1. **Le pari** (`slider`, non noté)
   - « Tu empruntes 200 000 € sur 25 ans, la durée maximale d'un crédit immobilier, à 3,5 %. Combien rembourses-tu en tout ? »
   - Curseur de 200 000 à 400 000 €, pas de 5 000, départ 230 000 €.
   - Val (complice) : « Petit pari, sans mauvaise réponse. À ton avis ? »
2. **La révélation** (`reveal`)
   - Environ 300 000 €.
   - Lignes : tu as emprunté 200 000 € ; les intérêts coûtent environ 100 000 € (clé) ; soit une mensualité d'environ 1 000 € ; hors assurance et frais, et le taux est une hypothèse (atténuée).
   - Val (alerte) : « La moitié du prix en plus, juste pour avoir emprunté. »
3. **Le simulateur** (nouveau, non noté)
   - « Et si tu empruntais moins longtemps ? Bouge le curseur. »
   - Curseur « Durée » de 15 à 25 ans, départ 25 ans, pour 200 000 € à 3,5 %.
   - Affiché en direct : la mensualité et le coût total des intérêts.
   - Calcul : mensualité = capital × t / (1 − (1 + t) puissance (−n)), avec t = 3,5 % / 12 et n le nombre de mois. Repères : 15 ans, environ 1 430 € par mois et 57 000 € d'intérêts ; 20 ans, environ 1 160 € et 78 000 € ; 25 ans, environ 1 000 € et 100 000 €.
   - Val, en direct (complice) : « Plus court, chaque mois pèse plus, mais tu paies beaucoup moins d'intérêts. »
   - Bouton « Continuer » actif dès que le curseur a bougé.
4. **Remettre dans l'ordre** (nouveau, noté)
   - « Remets les étapes d'un achat dans l'ordre. »
   - Ordre juste : mettre de côté un apport ; faire une offre sur un logement ; signer le compromis de vente ; signer l'acte chez le notaire. Présentées dans le désordre.
   - Explication : « L'apport rassure la banque. Une fois ton offre acceptée, le compromis t'engage, puis tu deviens propriétaire le jour de l'acte chez le notaire. »
   - Val, bonne réponse (fier) : « Tu connais déjà le chemin. » Erreur (rassurant) : « Presque. Tout commence par l'apport, et tout finit chez le notaire. »
5. **Question sans aide** (`choice`, noté)
   - « Pour payer moins d'intérêts au total, le plus efficace ? »
   - Emprunter sur une durée plus longue ; emprunter sur une durée plus courte, si la mensualité reste supportable (bonne) ; ne mettre aucun apport pour garder ton épargne.
   - Explication : « Moins de mois, c'est moins d'intérêts. Et un apport réduit la somme empruntée. »
   - Val, bonne réponse (célébrant) : « Avec ça, tu peux économiser des dizaines de milliers d'euros. » Erreur (rassurant) : « Une durée longue soulage chaque mois, mais elle coûte bien plus cher au total. »

## Leçon 5 : Payer moins d'impôts, « Le mythe de la tranche »

**Déclic : changer de [tranche] ne fait jamais perdre d'argent ; seule la partie au-dessus du [seuil] est taxée plus.** La leçon utilise le vrai barème de l'impôt pour une part, lu dans les chiffres réglementaires. Ses trois premières tranches suffisent à l'exemple : 0 % jusqu'à 11 600 €, 11 % jusqu'à 29 579 €, 30 % au-delà. La prime franchit le seuil de la troisième tranche de 1 000 € de chaque côté, et tous les montants se calculent à partir du barème.

1. **Le pari** (`slider`, non noté)
   - « Une prime de 2 000 € fait passer ton revenu imposable de 28 579 € à 30 579 €, et tu changes de tranche : de 11 % à 30 %. De combien augmente ton impôt ? »
   - Sous la question, en petit : « Barème de l'impôt pour une part : 0 % jusqu'à 11 600 €, 11 % jusqu'à 29 579 €, 30 % au-delà (puis deux tranches plus hautes). »
   - Curseur de 0 à 3 000 €, pas de 10, départ 1 500 €.
   - Val (complice) : « Petit pari, sans mauvaise réponse. À ton avis ? »
2. **La révélation** (`reveal`)
   - 410 €.
   - Lignes : les 1 000 € sous le seuil, taxés à 11 %, font 110 € ; les 1 000 € au-dessus, taxés à 30 %, font 300 € ; au total, 410 € d'impôt en plus pour 2 000 € de prime (clé) ; barème de l'impôt pour une part, sans décote ni réduction (atténuée).
   - Val (alerte) : « Beaucoup refusent une augmentation par peur de changer de tranche. C'est une erreur : tu gardes toujours la plus grosse partie. »
3. **Vrai ou faux en rafale** (nouveau, noté)
   - « Changer de tranche peut faire baisser ton revenu après impôt. » Faux : « Seule la partie au-dessus du seuil est taxée plus. »
   - « Le prélèvement à la source est un impôt en plus. » Faux : « C'est seulement une façon de payer ton impôt, chaque mois. »
   - « Un don à une association peut réduire ton impôt. » Vrai : « Une grande partie du don est retirée de ton impôt lui-même : c’est une réduction d’impôt. »
   - « Ton taux marginal est le taux de ta dernière tranche. » Vrai : « Et il ne s'applique qu'à la partie de ton revenu dans cette tranche. »
   - Val, réussi (célébrant) : « Tu comprends déjà mieux l'impôt que la plupart des gens. » Pas réussi (rassurant) : « L'impôt est rempli d'idées reçues. On va les démonter ensemble. »
4. **Associer** (nouveau, noté)
   - « Relie chaque mot à sa définition. »
   - Taux marginal : le taux de ta dernière tranche.
   - Taux moyen : ton impôt divisé par ton revenu.
   - Réduction d'impôt : une somme retirée directement de ton impôt.
   - Déduction : une somme retirée de ton revenu imposable.
   - Val, réussi (fier) : « Ces quatre mots, et ta feuille d'impôts devient lisible. » Pas réussi (rassurant) : « Ils se ressemblent, c'est normal de les mélanger au début. »
5. **Question sans aide** (`choice`, noté)
   - « Avec ce barème, Léa a un revenu imposable de 40 000 €. Son taux moyen est-il aussi de 30 % ? »
   - Oui, tout son revenu est taxé à 30 % ; non, il est plus bas, car ses premiers euros sont moins taxés (bonne) ; non, il est plus haut que 30 %.
   - Explication : « Ses 11 600 premiers euros ne sont pas taxés, les suivants le sont à 11 % jusqu'à 29 579 €. Son taux moyen est d'environ 12,8 %, bien en dessous de 30 %. »
   - Val, bonne réponse (célébrant) : « Exactement. Et c'est ça qui compte vraiment. » Erreur (rassurant) : « C'est le piège classique : les 30 % ne touchent que le haut de son revenu. »

## Leçon 6 : Je découvre, « Ton vrai salaire »

**Déclic : tu touches 1 660 € net, tu coûtes 3 055 € à ton [employeur] ; l'écart finance surtout ta [protection sociale].** Chiffres de la fiche de paie de référence du site (`fiche_de_paie_variantes.json`, variante `novembre_standard`) : net payé 1 660,93 €, impôt prélevé à la source 90,81 €, net à payer avant impôt 1 751,74 €, cotisations salariales 508,26 €, brut 2 260 €, cotisations patronales 795,11 €, coût 3 055,11 €. Arrondis à l'euro pour que chaque ligne s'additionne.

1. **Le pari** (`slider`, non noté)
   - « Tu touches 1 660 € net par mois, impôt déjà prélevé. Combien coûtes-tu à ton employeur ? »
   - Curseur de 1 660 à 4 000 €, pas de 50, départ 2 000 €.
   - Val (complice) : « Petit pari, sans mauvaise réponse. À ton avis ? »
2. **La révélation** (`reveal`)
   - 3 055 € par mois.
   - Lignes : ce que tu touches 1 660 € ; + l'impôt prélevé à la source 91 € ; = ton net avant impôt 1 751 € ; + tes cotisations salariales 509 € ; = ton salaire brut 2 260 € ; + les cotisations patronales 795 € ; = ce que tu coûtes 3 055 € (clé).
   - Val (alerte) : « Ce chiffre est tout en bas de ta fiche de paie, et presque personne ne le regarde. C'est ce que ton travail coûte vraiment. »
   - Pourquoi (audit du 17 octobre 2026) : les anciennes lignes (470 / 2 130 / 925) traitaient les 1 660 €, un net payé après impôt, comme un net avant impôt ; la fiche de paie affiche bien le coût total pour l'employeur.
3. **Remettre dans l'ordre** (nouveau, noté)
   - « Classe ces montants, du plus petit au plus grand. »
   - Ordre juste : ton net après prélèvement à la source ; ton net à payer ; ton salaire brut ; ton coût pour l'employeur. Présentés dans le désordre.
   - Explication : « Du coût employeur, on retire les cotisations patronales : c'est le brut. Puis les cotisations salariales : c'est le net à payer. Puis le prélèvement à la source : c'est ce qui te reste. »
   - Val, bonne réponse (fier) : « Tu viens de lire toute une fiche de paie, de haut en bas. » Erreur (rassurant) : « Presque. Pense à tout ce qu'on retire à chaque étape. »
4. **Le dialogue** (nouveau, noté)
   - Personnage : Sam, ton collègue.
   - Sam : « Les cotisations, franchement, c'est de l'argent perdu. »
   - Tes réponses : « Elles financent ma retraite, ma santé et le chômage. » (bonne) ; « Oui, ça part à l'État pour rien. » ; « C'est mon employeur qui les garde. »
   - Sam répond, bonne réponse : « Ah ouais, vu comme ça… L'arrêt maladie de l'an dernier, c'était ça ? » Mauvaise réponse : « Ah bon ? Pourtant, quand j'étais au chômage, j'ai bien été payé… »
   - Val, bonne réponse (fier) : « Exactement : ce n'est pas perdu, c'est une protection. » Erreur (rassurant) : « C'est ce que beaucoup pensent. En réalité, elles financent ta protection sociale. »
5. **Question sans aide** (`choice`, noté)
   - « Sur ta fiche de paie, la ligne qui donne ton salaire après les cotisations, mais avant le prélèvement à la source, s'appelle… »
   - Le salaire brut ; le net à payer avant impôt sur le revenu (bonne) ; le coût employeur.
   - Explication : « Le brut, c'est avant les cotisations salariales. Le net à payer, c'est après. Le prélèvement à la source est retiré ensuite. »
   - Val, bonne réponse (célébrant) : « Tu sais maintenant lire la ligne la plus importante de ta fiche de paie. » Erreur (rassurant) : « Pas tout à fait. Le brut est plus haut que ce que tu touches. »

## Après la leçon

Chaque objectif mène à un univers conseillé, que Val nomme à l'étape du pseudo et qui s'ouvre en premier sur l'accueil d'Apprendre.

| Objectif | Leçon découverte | Univers conseillé | Types d'écrans |
| --- | --- | --- | --- |
| Mettre de l'argent de côté | L'argent qui fond | Avant d'investir | pari, révélation, répartir, vrai ou faux, choix |
| Commencer à investir | La machine à intérêts | Bourse | pari, révélation, simulateur, ordre, choix |
| Comprendre la crypto | Le grand huit | Crypto | pari, révélation, vrai ou faux, dialogue, associer |
| Acheter un jour un logement | Le vrai prix d'un crédit | Se loger | pari, révélation, simulateur, ordre, choix |
| Payer moins d'impôts | Le mythe de la tranche | Impôts | pari, révélation, vrai ou faux, associer, choix |
| Je découvre, on verra | Ton vrai salaire | Paie, primes et aides | pari, révélation, ordre, dialogue, choix |

Phrase d'accroche de chaque leçon, sur la carte de l'accueil sans compte tant qu'elle n'est pas terminée :

| Leçon découverte | Phrase d'accroche |
| --- | --- |
| L'argent qui fond | Pourquoi l'argent qui dort perd de la valeur |
| La machine à intérêts | Ce que le temps fait à 100 € par mois |
| Le grand huit | Ce que la crypto peut faire en un an |
| Le vrai prix d'un crédit | Ce que coûte vraiment un emprunt |
| Le mythe de la tranche | Pourquoi une prime ne fait jamais perdre d'argent |
| Ton vrai salaire | Ce que tu coûtes à ton employeur |

La prochaine leçon en teaser est la première leçon du premier module publié de l'univers conseillé ; à défaut, le premier module disponible.

**À vérifier avant de publier :**

- [ ] Les chiffres du salaire (leçon 6) correspondent à ceux de ta leçon 1 publiée.
- [ ] Les cours du bitcoin (leçon 3) : environ 69 000 dollars en novembre 2021, environ 16 500 dollars fin 2022.
- [ ] Le barème simplifié de la leçon 5 est bien présenté comme un exemple, pas comme le vrai barème.
- [ ] La correspondance objectif et univers te convient.
- [ ] Le serveur crédite la leçon découverte après l'inscription (pull request #2).
