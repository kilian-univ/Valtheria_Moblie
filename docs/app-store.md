# Préparation de l'App Store

État au 19 octobre 2026 : app `design/ui` et `main`, site et production en `f611d3c`. Ce document reprend la priorité 1 de `docs/audit-complet.md`.

## 0. Lot du 19 octobre ([PR n° 16](https://github.com/Valtheraa/Valtheria/pull/16), en production)

- **Mentions « [À CONFIRMER] »** : retirées de la politique de confidentialité. La ligne sur la durée des données techniques, vide sans son information, est masquée. Rien d'autre n'est réécrit. Un test refuse désormais cette mention sur toute page publique.
- **Inscription depuis l'app** : ouverte par l'API (`API_REGISTER_ENABLED`, ouverte par défaut ; `false` la referme), le site web restant fermé.
  - L'acceptation des CGU est notée à l'inscription.
  - Parcours complet essayé depuis l'app sur le staging : pseudo, e-mail et mot de passe, rappel, compte connecté.
  - En production, l'API répond 422 (et non plus 403) à une demande invalide.
- **Suppression du compte : elle échouait toujours depuis l'app.** Le client figé envoie `DELETE /api/user` sans le mot de passe que le serveur exige.
  - Le site ajoute `POST /api/user/delete`, avec le mot de passe dans le corps.
  - Dans l'app, « Supprimer mon compte » ouvre une feuille qui le demande.
  - Essayé sur le staging : mot de passe faux refusé (« Mot de passe incorrect. »), puis compte supprimé, jetons révoqués, retour à l'accueil.
- **Page publique « Aide et contact »** : `https://valtheria.fr/aide`, reliée depuis les Réglages. C'est l'URL d'assistance de l'App Store.
- **Copies prises avant chaque déploiement** : gardées 30 jours (durée à reporter dans la politique de confidentialité).

### Données collectées depuis l'app (étiquettes de confidentialité d'Apple)

- **Dans l'app, un seul outil de collecte : le suivi des plantages** (Sentry, lot 1 du 19/10). Actif seulement dans la version publiée (jamais en développement ni dans Expo Go), et seulement si l'adresse d'envoi a été donnée à la construction. Sans donnée personnelle : pas d'e-mail, pas d'identifiant de compte, pas de montant, pas de nom d'appareil, pas de capture d'écran, pas de mesure d'audience ni de performance ; chaque rapport est nettoyé avant envoi (`src/utils/monitoring.ts`, testé). L'écran de secours lui envoie l'erreur qui l'a provoqué ; les plantages non rattrapés partent aussi.
  - `track()` n'écrit que dans la console, en développement.
  - L'app ne parle qu'à l'API de valtheria.fr, à Sentry (plantages, région UE) et aux serveurs d'Expo (mises à jour à distance, voir partie 7), et n'ouvre que ses pages.
  - Les rappels sont locaux, sans jeton de notification.
- **Côté serveur**, le même outil reçoit les erreurs du serveur, y compris celles provoquées par une requête de l'app, sans donnée personnelle ni suivi des performances.
- **Pour Apple** : déclarer les données que l'app envoie au serveur pour fonctionner. Ce sont l'e-mail, l'identifiant du compte, la progression, et les données financières saisies (patrimoine, budget). Elles sont liées au compte, servent au fonctionnement de l'app et ne servent pas au pistage.
- **Tranché (lot 1)** : déclarer **« Diagnostics » → « Données de plantage »** (Crash Data), **non liées à l'identité de l'utilisateur**, **pas de pistage**, usage « Fonctionnement de l'app ». Rien d'autre dans Diagnostics (ni performance, ni autres diagnostics). La politique de confidentialité le dit (pull request du site du 19/10, « Diagnostics de l'application mobile », sous-traitant Sentry).

## 1. Pages légales (B1)

**Fait.** Le site sert sans code d'accès `/cgu`, `/politique-confidentialite` (l'ancienne adresse `/politique-de-confidentialite` y redirige) et `/mentions-legales`. Le reste du site reste derrière la porte d'accès, `/cgv` compris. C'est une exception au gel du web, accordée le 18/10/2026 : [PR n° 15](https://github.com/Valtheraa/Valtheria/pull/15), en production.

Liens depuis l'app, vérifiés en vrai lancement web :
- **Réglages**, « Aide et contact » : `https://valtheria.fr/aide` (19/10).
- **Connexion** : « Conditions d'utilisation · Confidentialité · Mentions légales » sous les boutons.
- **Inscription** : « En continuant, tu acceptes les conditions d'utilisation et la politique de confidentialité ».
- **Réglages**, « Confidentialité et conditions » : les trois pages.

### Ce qui manque ou est faux dans les textes

Relu le 18/10/2026, sans rien réécrire, face à ce que font l'app et le serveur aujourd'hui. Les points 1 à 3 sont les plus urgents : la page est désormais publique.

**Politique de confidentialité**
1. ~~Trois mentions « [À CONFIRMER : …] » visibles par tous~~ : **retirées le 19/10**. Restent à écrire : la base des transferts hors UE, le délai réel de suppression (30 jours) et la durée des journaux (14 jours).
2. **Elle ne parle que du site** (valtheria.fr) : rien sur l'app iOS.
3. **Le budget est absent.** Le serveur garde des données financières personnelles :
   - rentrées et jour de paie ;
   - charges fixes avec leur jour ;
   - dépenses et rentrées datées, par catégorie ;
   - soldes du compte relevés ;
   - plafonds des enveloppes ;
   - réponses au bilan du mois.
4. **Patrimoine** : il est décrit comme un « simulateur » de positions. Manquent :
   - les opérations d'achat et de vente datées ;
   - l'historique de la valeur (relevés).
5. **Données gardées sur le téléphone**, non mentionnées : le jeton de connexion (trousseau), le prénom de la première ouverture, le carnet de déclics, le journal de la semaine, les objectifs et étapes du patrimoine, les préférences du budget, la mémoire du Dictionnaire. Tout est effacé à la déconnexion (même hors ligne) et à la suppression du compte ; seul le dernier profil (identifiant et pseudo) reste après une déconnexion (lot 1).
6. **Rappels** : des notifications locales, programmées sur le téléphone, sans rien envoyer à un serveur (pas de jeton de notification). Non mentionnées.
7. **Capteur de mouvement** : l'inclinaison sert à la vue paysage du cash-flow ; rien n'est enregistré ni envoyé. Non mentionné.
8. **Chat de Val** : décrit comme une partie du service, alors que l'app ne l'a pas. Depuis l'app, rien n'est envoyé à Anthropic. À préciser.
9. **Sous-traitants** : Sentry (erreurs du serveur et plantages de l'app) est ajouté par la pull request du site du 19/10 (lot 1) ; le service de sauvegarde à distance de la base reste à citer (nom, région et durée : à prendre dans la configuration du site, hors de ce dépôt).
10. **Suppression du compte** : le texte ne dit pas ce qui se passe vraiment. Le compte est désactivé tout de suite, puis supprimé définitivement après 30 jours (tâche quotidienne du serveur) ; on peut le réactiver avant par e-mail.
11. **Copies de sauvegarde** prises avant chaque déploiement : gardées **30 jours**. La durée reste à écrire.
12. **Durées réelles**, à reporter :
    - journaux de l'application : 14 jours ;
    - session web : 120 minutes ;
    - sauvegardes quotidiennes : 30 jours.
13. **Droits** : le texte ne propose que l'e-mail. Or l'app permet l'export (fichier JSON, depuis les Réglages) et la suppression du compte (depuis les Réglages, avec le mot de passe).
14. **Mineurs** : le texte annonce une « déclaration sur l'honneur » de l'âge à l'inscription. L'app n'en demande aucune.
15. **Date** : « juin 2026 », antérieure au budget et à l'app.
16. Le texte vouvoie, alors que l'app et les CGU tutoient.
17. **Exacts** : hébergeur et lieu d'hébergement (ceux des mentions légales) ; mots de passe hachés ; aucun cookie de mesure ; polices auto-hébergées ; logos des placements servis par le site lui-même.

**Conditions d'utilisation**
1. Elles ne visent que le service « accessible à l'adresse valtheria.fr », pas l'app.
2. Rien sur les outils de suivi (patrimoine, budget) : des données saisies par l'utilisateur, des calculs indicatifs. L'avertissement « pas de conseil en investissement » ne vise que les contenus et Val.
3. « Tu peux supprimer ton compte à tout moment depuis tes paramètres » : vrai dans l'app, mais sans le délai de 30 jours.
4. « L'inscription est gratuite » : exact depuis le 19/10, où l'inscription depuis l'app est ouverte.
5. Rien sur le droit applicable, les modifications des CGU ni la responsabilité. À voir avec un juriste ; Apple fournit par défaut son contrat de licence standard.

**Mentions légales**
1. Elles ne visent que « le site Valtheria (valtheria.fr) », pas l'app.
2. Paragraphe RGPD : il ne cite que « compte, progression, échanges avec l'assistant », sans le patrimoine ni le budget.
3. **Exacts** : éditeur, SIREN, hébergeur (nom, adresse et téléphone), avertissement « contenu éducatif ».

## 2. Identifiant définitif (B4)

**Fait.** `com.gala0022.Valtheraa` devient `fr.valtheria.app`, pour iOS (`ios.bundleIdentifier`) comme pour Android (`android.package`). Aucun autre fichier ne contenait l'ancien identifiant : pas de dossier natif (`ios/`, `android/`), rien côté site.

### Ce que ça change

Pour iOS, une app d'un autre identifiant est **une autre app**.
- **Expo Go** : rien ne change. L'app y tourne sous l'identifiant d'Expo Go, avec ses données et sa session.
- **Build installé avec l'ancien identifiant** (build de développement, TestFlight) : le nouveau s'installe **à côté**, comme une app distincte.
  - **Trousseau** : le jeton de connexion n'est pas repris. Il faut se reconnecter une fois.
  - **Données gardées sur le téléphone** : elles ne sont pas reprises (carnet, journal de la semaine, objectifs et étapes du patrimoine, préférences du budget, prénom, mémoire du Dictionnaire). Tout ce que garde le serveur est intact : leçons, XP, série, patrimoine, budget.
  - **Notifications** : la permission est redemandée. Les rappels programmés par l'ancienne app continuent jusqu'à sa suppression.
- **Apple** : un nouvel identifiant demande un nouvel App ID et un nouveau profil de provisionnement. EAS les crée au premier build.
- **Android** : rien n'a jamais été publié, aucun effet.

### Pour ton compte de test

- Continue à essayer dans **Expo Go** : rien ne bouge.
- Si tu as un build de l'ancien identifiant :
  - garde-le jusqu'à ce que le nouveau soit installé et connecté ;
  - note tes **objectifs du patrimoine** (nom, montant, échéance, placements reliés) : ce sont les seules données saisies à la main qui ne sont pas sur le serveur ;
  - recrée-les dans le nouveau, puis supprime l'ancienne app (ce qui coupe aussi ses rappels).

## 3. Paquets Expo (G34)

**Fait.** `npx expo install --fix` a mis 14 paquets à leur dernier correctif du SDK 57 (dont `expo` 57.0.30 et `expo-router` 57.0.28).

Vérifications :
- `expo-doctor` : 21 contrôles sur 21 ;
- tsc, ESLint et 549 tests Node ;
- vrai lancement web : démarrage, liens légaux, et les contrôles du budget, du cash-flow, du bilan, d'Outils, du patrimoine et du profil (28 sur 28 et 11 sur 11).

`expo-doctor` a aussi signalé trois champs retirés du schéma du SDK 57, désormais imposés : `newArchEnabled`, `android.edgeToEdgeEnabled` et `android.navigationBarColor`. Ils sont supprimés.

## 4. Build de production

### `app.json`
- **Version** `1.0.0`. Le numéro de build est géré par EAS et augmenté à chaque build (`appVersionSource: remote`, `autoIncrement`).
- **Icône iOS** `assets/images/icon-ios.png` : 1024 × 1024, opaque, fond `#0D0D0F`.
- **Écran de démarrage** : logo Valtheria sur `#0D0D0F` (`expo-splash-screen`).
- **iPhone seulement** (`supportsTablet: false`), portrait, thème sombre.
- **Langue** française : `CFBundleDevelopmentRegion` à `fr` et `CFBundleLocalizations` à `["fr"]`. Les fenêtres système (notifications, partage) sont donc en français.
- **Textes d'explication des permissions** : un seul est nécessaire.
  - **Mouvement** (`NSMotionUsageDescription`, exigé car `expo-sensors` contient le podomètre) : « Valtheria lit l'inclinaison du téléphone pour afficher ton cash-flow en paysage quand tu le tournes. Rien n'est enregistré ni envoyé. »
  - **Notifications** : iOS n'a pas de texte à fournir, la fenêtre système est traduite.
  - **Face ID** : la permission en anglais ajoutée d'office par `expo-secure-store` est retirée (l'app n'utilise pas la biométrie).
  - **Micro** : retiré (`expo-audio`).
- **Réseau** : HTTP refusé, sauf sur le réseau local (pour le développement). Avant, toute adresse était acceptée.
- **Manifeste de confidentialité d'Apple** : aucun pistage ; raisons déclarées pour les préférences (CA92.1), les dates de fichiers (C617.1), l'heure de démarrage (35F9.1) et l'espace disque (E174.1).
- **Chiffrement** : `ITSAppUsesNonExemptEncryption` à faux. L'app n'utilise que HTTPS, donc rien à déclarer pour l'export.
- **Android** : stockage externe bloqué (inutile).

### `eas.json`
- **Profil `production`** : API de production, environnement EAS `production`, dernière image de build iOS, numéro de build automatique, canal de mises à jour `production` (lot 1). Le profil `preview` publie sur le canal `preview`.
- **Projet EAS** : `@valtheria/Valtheria` sur l'organisation `valtheria` du compte de l'utilisateur (identifiant `0244685c-1a6d-49a4-b988-9e9ea4f68182`, créé le 20/10). L'ancien projet appartenait au compte de Kilian et n'est plus visé par aucune construction ni mise à jour.
- **Variables à régler sur expo.dev** (environnement `production` du projet), jamais dans le dépôt : `EXPO_PUBLIC_SENTRY_DSN` (adresse d'envoi des plantages, en clair) et le secret `SENTRY_AUTH_TOKEN` (envoi des source maps à la construction). Sans la première, le suivi des plantages reste coupé ; sans le second, les traces arrivent sans noms de fichiers lisibles. Voir le README, « Suivi des plantages ».
- **`submit.production`** : langue `fr-FR`. L'identifiant App Store Connect (`ascAppId`) sera demandé au premier `eas submit`, ou peut y être ajouté une fois l'app créée.
- **Profil `development`** : il demande un client de développement, mais `expo-dev-client` n'est pas installé. À installer si tu veux un build de développement ; sinon, utilise Expo Go et le profil `preview`.

## 5. Compte de démonstration pour Apple

**Prêt et essayé de bout en bout sur le staging**, puis le staging a été remis dans son état d'origine. Résultat, vu dans l'app web :
- les 4 leçons publiées faites sans faute ;
- un patrimoine de 6 846 € : Livret A 4 200 €, LDDS 1 500 €, un ETF MSCI World et du bitcoin achetés chaque mois depuis 6 mois, aux cours de l'époque ;
- « 6 mois d'affilée » de régularité, et quatre étapes fêtées à la première ouverture ;
- un budget en mode Détaillé : paie de 1 850 € le 28, 817 € de charges fixes, 200 € mis de côté, dépenses notées sur 4 mois, enveloppe Courses à 280 € ;
- le bilan de septembre proposé à l'ouverture (« Un mois dans le vert, 3 mois d'affilée ») ;
- un cash-flow à 44 % de taux d'épargne.

### Le créer en production

1. Sur le serveur du site, la commande `php artisan review:compte-demo creer --email=revue-apple@valtheria.fr` crée le compte (commande du dépôt du site ; l'accès au serveur n'est pas décrit ici). Le mot de passe s'affiche **une seule fois** : note-le dans ton gestionnaire de mots de passe. L'adresse n'a pas besoin d'être une vraie boîte : aucun e-mail n'est envoyé.
2. Depuis la racine de l'app, remplis-le **une seule fois** (une deuxième fois doublerait les opérations) :
   ```
   node --no-warnings --import ./tests/register.mjs scripts/compte-demo.ts https://valtheria.fr/api revue-apple@valtheria.fr '<mot de passe>'
   ```
3. Dans App Store Connect, partie « App Review Information », coche « Sign-in required » et donne l'adresse et le mot de passe. En note, écris que le budget et le patrimoine sont saisis à la main, sans lien bancaire, et que l'app ne donne pas de conseil en investissement.
4. Pour repartir de zéro : `php artisan review:compte-demo supprimer --email=revue-apple@valtheria.fr` (suppression définitive), puis les étapes 1 et 2.

Limites :
- les objectifs du patrimoine sont gardés sur le téléphone, ils ne peuvent pas être préparés à l'avance ;
- la courbe du patrimoine ne montre l'historique qu'à partir des relevés faits par le serveur après la création.

## 6. Mises à jour à distance (EAS Update, lot 1)

L'app embarque `expo-updates` : la version publiée vérifie à chaque lancement s'il existe un correctif JavaScript sur son canal (`production`) et l'applique au lancement **suivant**. Comment publier, et ce qui ne passe pas par là : README, « Mises à jour à distance ».

Côté Apple : accepté, tant que la mise à jour ne change pas la nature de l'app (règle 3.3.1 de l'accord développeur : code interprété exécuté par le moteur d'Apple, sans nouvelle fonctionnalité qui changerait l'objet de l'app). Les étiquettes de confidentialité n'en sont pas affectées : Expo ne reçoit aucune donnée personnelle (un identifiant anonyme d'installation sert à compter les téléchargements).

## 7. Ce qui reste à faire de ton côté

Voir le compte rendu du 18/10/2026. Les points sont repris et cochés dans `docs/audit-complet.md` (« Avant une sortie sur l'App Store »).
