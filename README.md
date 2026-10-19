# Valtheria, l'app mobile

App iOS (et web de développement) d'éducation financière : leçons, Dictionnaire, articles, suivi du patrimoine et du budget. Elle est écrite en TypeScript avec Expo SDK 57, React Native 0.86 et Expo Router ; elle ne parle qu'à l'API du site Valtheria (dépôt séparé, `Valtheraa/Valtheria`), qui garde les comptes et les données.

Ce guide s'adresse à un développeur qui reprend le projet.

## Prérequis

- Node 24 et npm 11 (le fichier `package-lock.json` est la référence : toujours `npm ci`, jamais `npm install` sans raison).
- Pour l'iPhone : l'app **Expo Go** (version du SDK 57) sur un iPhone ou un simulateur. Aucun client de développement n'est nécessaire : tous les modules natifs utilisés sont inclus dans Expo Go.
- Pour une version installée (TestFlight, App Store) : un compte Expo et `eas-cli` (`npx eas-cli`). Voir [docs/app-store.md](docs/app-store.md).

## Installation propre

```bash
git clone <adresse du dépôt> Valtheria_Moblie
cd Valtheria_Moblie
npm ci
```

Rien d'autre : pas de fichier `.env` à créer, pas de clé à renseigner. La seule variable d'environnement lue par l'app est `EXPO_PUBLIC_API_URL` (voir « Environnements ») ; sans elle, l'app parle à la production.

Vérification que tout est en place : `npx expo-doctor` (21 contrôles) et `npx expo install --check`.

## Lancer l'app

```bash
npx expo start          # Metro ; scanne le QR code avec Expo Go, ou touche « i » pour le simulateur
npm run web             # la même app dans le navigateur (pratique pour relire un écran vite)
```

Pour travailler contre le staging plutôt que la production :

```bash
EXPO_PUBLIC_API_URL=https://staging.valtheria.fr/api npx expo start
```

Le premier démarrage sans compte arrive sur le parcours de bienvenue (`/bienvenue`). Avec un compte, l'app démarre sur l'onglet Apprendre.

## Vérifier avant de pousser

Les trois commandes ci-dessous tournent aussi dans l'action GitHub (`.github/workflows/ci.yml`) à chaque push et sur chaque pull request. Elles doivent passer toutes les trois.

```bash
npm test              # tests Node (node:test), sur la logique pure de src/utils, src/lesson, src/state
npx tsc --noEmit      # types
npm run lint          # ESLint (configuration Expo) ; la CI refuse le moindre avertissement
```

Les tests n'ont besoin ni de simulateur ni de rendu : `tests/register.mjs` apprend à Node l'alias `@/` et les imports sans extension, et Node exécute le TypeScript tel quel. Seuls les modules sans React Native sont testables ainsi.

## Architecture

```
app/                 Routes Expo Router : un fichier = un écran, chaque fichier ne fait qu'habiller un écran de src/screens
src/screens/         Les écrans complets, par domaine
src/components/      Les composants, par domaine, plus common/ (design system)
src/state/           Ce que l'app garde sur le téléphone (magasins) et la session
src/utils/           Logique pure, sans React : calculs, formats, règles ; c'est ce que testent les tests
src/lesson/          Le modèle des leçons : normalisation du format serveur, correction, formules, leçons découvertes
src/hooks/           Hooks React qui relient écrans, magasins et API
src/constants/       Design system (style/Style.ts), onglets, liens, textes de Val, images des univers
src/context/         ApiContext (client de l'API, zone protégée) et ThemeContext
tests/               Tests Node, un fichier par domaine, plus le chargeur register.mjs
assets/              Images (webp) et sons (m4a), tous référencés par le code
docs/                Documentation du projet (voir plus bas)
scripts/             Scripts d'exploitation du projet (compte de démonstration pour Apple)
```

### `app/` : les routes

Expo Router avec routes typées (`experiments.typedRoutes`). Chaque fichier est une route et se contente d'envelopper un écran de `src/screens` dans `OpaqueScreen` (fond commun) et, pour le patrimoine et le budget, dans `EmailConfirmGate`.

- `(tabs)/` : les quatre onglets, dans l'ordre de `src/constants/tabs.ts` : `apprendre/` (accueil, univers, module), `dictionary/` (accueil, fiche d'un mot), `article`, `outils`.
- `bienvenue/` : première ouverture sans compte (prénom, objectif, leçon découverte, fin, inscription, rappel).
- `apprendre/[id]` et `apprendre/revision` : le lecteur de leçon et la révision, par-dessus les onglets.
- `dictionnaire/mot` et `dictionnaire/test` : la fiche d'un mot et son test, ouverts hors de l'onglet Dictionnaire (depuis un article ou une leçon).
- `client/` : connexion, inscription, profil, réglages, carnet de déclics.
- `outils/` : `portefeuille` (Mon patrimoine), `actif/[id]`, `operation`, `recherche`, `objectif`, `analyse`, et `budget/` (Mon budget, mise en route, cash-flow, bilan).
- `index` redirige vers `/apprendre` ; `+not-found` est l'écran de secours.

### `src/screens/` et `src/components/`

Un écran par page, regroupés par domaine (`apprendre/`, `budget/`, `dictionary/`, `header/` pour connexion, profil et réglages, `notebook/`, `onboarding/`, `patrimoine/`, `revision/`). Les composants suivent le même découpage, plus `common/` : textes (`AppText`, espaces insécables appliquées à l'affichage), boutons en relief, feuilles, squelettes, états de page (`PageState`, `LoadErrorState`), Val (`ValBubble`, `ValFullBody`), fond commun (`AppBackground`).

Les « portes » (`PatrimoineGate`, `BudgetGate`, `EmailConfirmGate`, `OnboardingGate`) décident ce qu'un écran montre : chargement, sans compte, erreur, confirmation d'adresse demandée, ou l'écran lui-même.

### `src/state/`

Tout ce qui est gardé sur le téléphone : AsyncStorage par compte (clé `valtheria:<sujet>:<compte>`), jeton de connexion dans le trousseau. Chaque magasin suit le même motif : cache en mémoire, abonnés, écritures en file d'attente, lecture illisible distinguée d'une lecture vide. `purge.ts` efface tout à la déconnexion et à la suppression du compte. `session.ts` reprend le profil quand il manque.

### `src/utils/` et `src/lesson/`

Fonctions pures, sans React ni React Native, testées par `tests/`. Par domaine : `budget/` (calculs, flux, bilans, mise en route), `patrimoine/` (modèle, courbes, formats, objectifs, étapes, remarques de Val), `dictionary.ts`, `revision.ts`, `learning.ts`, `format.ts`, etc. `src/lesson/` porte le format des leçons que le serveur sert et que l'app corrige localement : `normalize.ts` (du JSON serveur au modèle), `model.ts`, `interactive.ts`, `formulas.ts`, et `discovery/` (les leçons découvertes de la première ouverture). Le détail du format est dans [docs/reference-technique-lecons.md](docs/reference-technique-lecons.md).

### Conventions du code

- Alias `@/` vers la racine (`@/src/...`).
- Tout est en français : interface, commentaires, messages de commit, documentation.
- React Compiler activé : pas de `useMemo`/`useCallback` manuels superflus, pas de `setState` dans le corps d'un effet (ESLint le refuse).
- Reanimated : rien d'autre que des worklets dans les animations ; `tests/worklets.test.ts` le contrôle sur tout le code.
- Espaces insécables : une seule source (`frenchSpaces`), appliquée à l'affichage ; `tests/frenchSpaces.test.ts` et `tests/espaces.test.ts`.
- Aucun chiffre réglementaire écrit en dur : ils viennent de l'API (`/api/regulatory-figures`).

## Environnements

| | Staging | Production |
|---|---|---|
| API | `https://staging.valtheria.fr/api` | `https://valtheria.fr/api` (valeur par défaut de l'app) |
| Profils EAS (`eas.json`) | `development`, `preview`, `simulator` | `production` |
| Usage | essais de bout en bout, comptes jetables | vraies données des utilisateurs |

`EXPO_PUBLIC_API_URL` est lue au démarrage ; `eas.json` la fixe par profil. L'identifiant de l'app est `fr.valtheria.app` (iOS et Android), le schéma d'ouverture `valtheria://`.

L'API appartient au dépôt du site. Ce que l'app en attend, route par route, est dans [docs/lot-serveur.md](docs/lot-serveur.md). Aucune information sur les serveurs ni sur leurs accès ne figure dans ce dépôt, et c'est voulu.

## Règles du projet

1. **Une branche par chantier, une pull request, une CI verte.** On ne pousse jamais directement sur `main`, et jamais en force. Chaque chantier part d'une branche créée depuis `main` à jour et se termine par une pull request vers `main`, fusionnée une fois la vérification automatique verte et l'accord du responsable du projet donné.
2. **Les gros changements de structure** (fichier central réécrit, nouvelle dépendance, changement d'architecture) sont signalés clairement dans la pull request, pour que Kilian puisse donner son avis.
3. **Zone protégée** : `src/context/ApiContext.tsx` et tout fichier d'environnement (`.env`, `.env.local`, variantes) ne se modifient pas sans décision explicite. Avant chaque commit, vérifier qu'ils ne sont pas dans les modifications.
4. **Rien sur l'infrastructure dans le dépôt** : pas d'adresse de serveur, de commande d'accès, de nom de service d'hébergement ni de secret, ni dans le code ni dans `docs/`.
5. **Expo SDK 57** : se référer à la documentation versionnée (`https://docs.expo.dev/versions/v57.0.0/`), pas à une autre version.
6. **Français partout**, y compris dans les commits et la documentation.

Les règles pour l'assistant de développement sont dans `CLAUDE.md` et `AGENTS.md`.

## Documentation

- [docs/app-store.md](docs/app-store.md) : préparation de la sortie sur l'App Store (pages légales, identifiant, configuration, compte de démonstration).
- [docs/audit-complet.md](docs/audit-complet.md) : audit du 17 octobre 2026 et ce qui a été corrigé depuis, avec les annexes chiffres et iPhone-code.
- [docs/lot-serveur.md](docs/lot-serveur.md) : ce que l'app attend de l'API du site.
- [docs/reference-technique-lecons.md](docs/reference-technique-lecons.md) : format des leçons, correction, révision.
- [docs/a-faire-version-installee.md](docs/a-faire-version-installee.md) : ce qui demande une version installée (hors Expo Go).
