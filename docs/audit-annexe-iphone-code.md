# Audit du code : ce qui marche sur le web mais pas sur iPhone

> Annexe de [l'audit complet](audit-complet.md) du 17 octobre 2026, en lecture seule. Les mentions « dossier de travail », « scratchpad » ou `extraits/…` renvoient à des fichiers temporaires de l'audit, non conservés.


17 octobre 2026 · `/Users/kant1/Developer/Valtheria_Moblie`, branche `design/ui`, HEAD `e6c8860` (03 h 39) · lecture seule.

Le code n'a pas bougé depuis l'audit précédent (`docs/audit-complet.md`, écrit à 11 h 02, non suivi par git). « Nouveau » veut donc dire ici : absent de cet audit.

**Méthode.** J'ai relu le code et lancé trois scripts dans le dossier de travail (aucun fichier du dépôt n'a été modifié) :
- un relevé de tous les corps de worklets et des rappels de gestes et d'animations ;
- une recherche du texte brut hors `<Text>`, avec le vérificateur de types de TypeScript : type de chaque enfant JSX, y compris `any` et les tableaux ;
- une recherche des exports morts.

Les expressions régulières ont aussi été passées au compilateur Hermes de RN 0.86 (`node_modules/hermes-compiler`).

---

## 0. Résumé

- **Aucun plantage natif certain** n'a été trouvé dans le code actuel :
  - les 79 styles et propriétés animés, les 2 handlers (`useAnimatedReaction`, `useAnimatedScrollHandler`), les 21 rappels de gestes et les 4 rappels de fin d'animation n'appellent que des worklets ;
  - aucun texte brut n'est hors d'un `<Text>` ;
  - aucune API absente de Hermes n'est utilisée ;
  - aucune API du navigateur n'est appelée sans garde.
- **Le test `worklets.test.ts` ne couvre qu'une partie du risque** (voir 1.1). Une prochaine erreur du type du 16 octobre peut passer inaperçue, dans un geste, une réaction ou une méthode d'objet.
- **Le risque principal reste l'absence de filet** (pas d'`ErrorBoundary` racine). Le chemin le plus probable vers un plantage natif : l'ancien `PortefeuilleScreen`, servi en repli quand le patrimoine échoue ou qu'on n'a pas de compte, avec ses `.toFixed` sur des champs qui peuvent être `null`.
- **Nouveau et visible sur iPhone** :
  - l'icône iOS aura un **fond blanc** (Expo aplatit la transparence de `icon.png` sur du blanc) ;
  - sur iPad, l'app **tournera en paysage** (`supportsTablet` force toutes les orientations).
- **Performances propres à Hermes, à mesurer sur iPhone** :
  - l'expression régulière des termes du dictionnaire est recompilée pour chaque fragment de texte d'un article ;
  - un nouveau `Intl.NumberFormat` est créé à chaque montant du patrimoine ;
  - plusieurs compteurs font un `setState` à chaque image.
- **Vérifications** :
  - `tsc` : 0 erreur ;
  - ESLint : 10 erreurs et 7 avertissements, tous dans l'ancien design, plus 1 avertissement dans `.expo/`, qu'ESLint parcourt ;
  - tests : 372 sur 372 réussis.

---

## 1. Ce qui marche sur le web mais planterait ou se comporterait mal sur iPhone

### 1.1 Worklets : état du code et portée du test `tests/worklets.test.ts`

**État du code (relevé complet)**

| Zone | Emplacements | Résultat |
|---|---|---|
| `useAnimatedStyle` / `useAnimatedProps` | 79 corps, 42 fichiers | Seuls appels directs : `interpolate`, `interpolateColor`, `Math.*`. Les couleurs sont calculées avant le style (`PositionLine.tsx:35-37`, `PathNode.tsx:140-146`). Ce qui est capturé dans les closures (couleurs, tableaux de nombres, `springs.*`, `runBadgeFx.trailSparks`) est sérialisable. OK |
| `useDerivedValue` | aucun | — |
| `useAnimatedReaction` | `ModuleScreen.tsx:137-142` | `scrollTo` (worklet de Reanimated). OK |
| `useAnimatedScrollHandler` | `WelcomeScreen.tsx:98-100` | `scrollY.set`. OK |
| `useAnimatedSensor` + style | `VaultScene.tsx:256-265` | `sensor.sensor.value` lu dans le worklet. OK (voir N8 pour la batterie) |
| `useFrameCallback` | aucun | — |
| Gestes en ligne (worklets créés par le plugin Babel) | `BottomSheet.tsx:123-142` | `Math.max`, `withSpring`, `scheduleOnRN(setCollapsed / onRequestClose)`. OK |
| Gestes via `safeGesture` | `TrueFalseScreen.tsx:221-273`, `OrderScreen.tsx:361-401`, `TrackSlider.tsx:212-251` | Seules fonctions appelées : `follow`, `land`, `dropRank` (`interactive.ts:81`), `timing` (`motion.ts:47`) et `recover`, toutes marquées `'worklet'`. Les fonctions JS passent par `scheduleOnRN`. OK |
| Gestes `.runOnJS(true)` | `LineChart.tsx:89-113` | Fil JS : appeler `pick`, `setTouched` ou `scale.index` est permis. OK |
| Rappels de `withTiming` | `TrueFalseScreen.tsx:204`, `:259`, `BottomSheet.tsx:104`, `LaunchScreen.tsx:77` | `'worklet'` + `scheduleOnRN`. OK |
| Animations d'entrée et de sortie | `ApprendreDetailScreen.tsx:86-89` (`.easing(easeOut)`, natif seulement) | `Easing.out(Easing.cubic)` est un worklet de Reanimated. OK, mais ce chemin n'a jamais tourné sur le web (`Platform.OS === 'web'`) |

**Ce que le test couvre**
- Les corps de `useAnimatedStyle`, `useAnimatedProps` et `useDerivedValue`.
- Les appels **directs** de fonctions non autorisées : fonctions importées, fonctions locales, `setState(…)`.
- Les fonctions de l'app déclarées `function f() { 'worklet' }` ou `const f = (…) => { 'worklet' }`.

**Ce que le test ne couvre pas**

| # | Angle mort | Exemple qui passerait le test et fermerait l'app sur iPhone | Correction proposée |
|---|---|---|---|
| T1 | Les **appels de méthode** sont ignorés exprès (`(?<![.\w])`) | `useAnimatedStyle(() => ({ color: theme.withOpacity(c, v.get()) }))`, `format.money(x)`, `feedback.tick()` | N'accepter que les méthodes de valeurs partagées (`.get`, `.set`) et une liste blanche (`Math.*`, `Number.*`, `String.*`), et refuser le reste |
| T2 | `useAnimatedReaction`, `useAnimatedScrollHandler`, `useFrameCallback`, `useAnimatedGestureHandler`, `useEvent` ne sont pas lus | `useAnimatedReaction(() => x.get(), (v) => haptics.select())` | Ajouter ces hooks à l'expression de `animatedBodies` |
| T3 | Les **rappels de gestes** (`.onStart`, `.onUpdate`, `.onEnd`, `.onFinalize`, `.onChange`, `.onTouches*`) ne sont pas lus | `Gesture.Pan().onEnd(() => { feedback.drop(); })` dans `BottomSheet` | Lire les arguments des maillons `Gesture.*()`, sauf si `.runOnJS(true)` est dans la chaîne |
| T4 | Les **rappels de `withTiming`, `withSpring`, `withDecay`, `withRepeat`** (3e argument) ne sont pas lus | `withTiming(0, cfg, () => setDone(true))` | Les ajouter |
| T5 | Les **corps des fonctions `'worklet'`** ne sont pas vérifiés | `follow()` qui appellerait un jour `formatAmount()` | Vérifier aussi le corps de chaque fonction qui contient `'worklet'` |
| T6 | Les noms de worklets sont **globaux** : un nom déclaré worklet dans un fichier est accepté partout | Une fonction ordinaire `timing()` ailleurs serait acceptée | Résoudre l'import, ou au moins le fichier |
| T7 | Les fonctions **passées en référence** ne sont pas vues | `arr.map(helper)`, `withSequence(...list.map(build))` | Signaler tout identifiant de fonction non worklet passé en argument |
| T8 | Les appels ne sont pas lus quand le hook reçoit une fonction nommée | `useAnimatedStyle(buildStyle)` | Résoudre l'identifiant |
| T9 | Le test analyse le texte du fichier, pas le code de l'app | Un parenthésage inhabituel dans un commentaire ou une chaîne peut décaler la fin du corps | Passer par l'AST de TypeScript (le script `scripts/cb.cjs` du dossier de travail en est une base) |

Gravité : **important**. C'est l'unique filet contre une erreur déjà vécue ; aujourd'hui il ne ferait que 1 cas sur 4 environ.

### 1.2 Texte brut hors `<Text>`

Analyse par le vérificateur de types sur tous les `.tsx` de `src/` et `app/`, avec le type de chaque enfant JSX dont le parent n'est pas un `Text`, `AppText`, `TextInput`, `SvgText` ou `Link` :
- **0 texte littéral** (chaîne, espace significative, template) hors d'un `Text` ;
- **0 expression** de type `number` ou `string` non vide hors d'un `Text`.

Les `{x && …}` dont `x` est une chaîne (`ArticleScreen.tsx:85,99,105,129,135`, `CashflowScreen.tsx:121,123`, `EpargneScreen.tsx:97`, `PortefeuilleScreen.tsx:117`, `EntryRow.tsx:35,42`, `ArticleDetailScreen.tsx:112,117`) ne posent pas de problème : React ignore la chaîne vide.

Risques latents, sans défaut aujourd'hui :

| Fichier:ligne | Description | Scénario sur iPhone | Gravité | Correction |
|---|---|---|---|---|
| `EpargneScreen.tsx:175` | `{goal.id && (…)}` sur un objet `any`, directement dans une `View` | Un objectif d'id `0` affiche « 0 » sur le web ; sur iPhone : « Text strings must be rendered within a <Text> component », écran fermé (pas d'`ErrorBoundary`) | cosmétique (id 0 improbable) | `goal.id != null ? … : null` |
| `PositionRow.tsx:64` | `{position.is_live && …}` dans une `View` | Si le serveur renvoyait `0` ou `1` (tinyint non converti) au lieu de `true` ou `false`, même plantage. La doc du lot serveur montre des booléens | cosmétique | `position.is_live === true && …` |
| `ListRow.tsx:109,120`, `Stagger.tsx:29`, `IconButton.tsx:73`, `SettingsList.tsx:54`, `UniverseCard.tsx:85,91,144`, `ReliefCard.tsx:40`, `AccessTile.tsx:40,59`, `BottomSheet.tsx:213`, etc. | Props `ReactNode` (`leading`, `footer`, `children`, `icon`…) rendues dans une `View`. Aucun appel actuel ne passe une chaîne | Un futur `<ListRow footer="Bientôt" />`, ou `<Stagger>Texte</Stagger>`, marche sur le web et plante sur iPhone | gênant (prévention) | Typer ces props `ReactElement` (TypeScript refusera alors une chaîne), ou envelopper `typeof x === 'string'` dans `AppText` |

### 1.3 API de Hermes et d'iOS

| Sujet | Constat | Verdict |
|---|---|---|
| `structuredClone`, `Intl.Segmenter`, `PluralRules`, `RelativeTimeFormat`, `ListFormat`, `DisplayNames` | Jamais utilisés | OK. D'après la doc Hermes (`IntlAPIs`), seuls `Collator`, `DateTimeFormat`, `NumberFormat` et les `toLocale*` existent sur iOS |
| `Intl.NumberFormat('fr-FR', {min,maxFractionDigits})`, `toLocaleDateString('fr-FR', {month:'long'…})`, `localeCompare(…, 'fr', {sensitivity})` | `format.ts:22`, `patrimoine/format.ts:15,51`, `dictionary.ts:89,160`, anciens écrans | OK (fonctions disponibles sur iOS). L'espace des milliers est normalisée à la main (`format.ts:29`) |
| `toSorted`, `findLast`, `.at()`, `replaceAll`, `Object.groupBy` | Jamais utilisés | OK |
| `Object.hasOwn`, `matchAll`, `normalize('NFD')` | `universes.ts`, `dictionary.ts`, `accuracy.ts:45` ; `dictionary.ts:432` ; 9 fichiers | OK (Hermes de RN 0.86) |
| RegExp `\p{L}` + `u` | `notebook.ts:144` (littérale) | **Acceptée par `hermesc`**, qui rejette bien `\p{Foo}` : la propriété est reconnue. OK |
| RegExp avec lookbehind | `BlockRenderer.tsx:23-27` (`new RegExp('(?<![\\p{L}\\p{N}])…', 'giu')`) | Syntaxe acceptée par `hermesc`. OK, mais lent (voir N3) |
| `Date.parse` de formats non ISO | Le serveur envoie de l'ISO avec `T` et fuseau (`"2026-10-16T21:17:24+00:00"`, `lot-serveur.md:501`), ou `AAAA-MM-JJ` | OK aujourd'hui. Aucune normalisation si un champ passait au format `AAAA-MM-JJ HH:MM:SS` : `shortDate` et `longDate` renverraient alors `''` (pas de plantage) |
| `window`, `document`, `localStorage`, `navigator`, `matchMedia`, `ResizeObserver`, `requestIdleCallback` | Seul usage : `sound.ts:69-77`, gardé par `Platform.OS === 'web' && typeof window` | OK |
| CSS propre au web | `boxShadow` (tableaux d'objets, `inset`) dans 9 fichiers ; aucun `cursor`, `position: fixed`, `vh`, `onHover` | OK : `boxShadow` est pris en charge par la nouvelle architecture (`newArchEnabled: true`) |
| Images | WebP partout (pris en charge par iOS 14 et plus), aucun SVG importé, aucun fichier `.web.tsx` ou `.native.tsx` | OK |

### 1.4 Défauts trouvés (nouveaux, ou précisés pour l'iPhone)

| # | Fichier:ligne | Description | Scénario concret sur iPhone | Gravité | Correction proposée |
|---|---|---|---|---|---|
| N1 | `app.json:7`, `assets/images/icon.png` | L'icône (1254 × 1254) est transparente à 77 %. Pour iOS, Expo l'aplatit sur **du blanc** (`@expo/prebuild-config/.../withIosIcons.js:198-203` : `removeTransparency`, `backgroundColor: '#ffffff'`). Le web et Android (`adaptiveIcon.backgroundColor #0D0D0F`) ne le montrent pas | Sur l'écran d'accueil de l'iPhone, dans TestFlight et sur l'App Store, le logo apparaît sur un carré blanc au lieu du fond sombre | important | Fournir `ios.icon` : une image de 1024 × 1024, opaque, fond `#0D0D0F`, logo centré (variantes `dark` et `tinted` en option) |
| N2 | `PatrimoineGate.tsx:15-19` → `PortefeuilleScreen.tsx:127,136`, `PositionRow.tsx:59,67` | Le nouvel écran n'est servi que si `ledger && portfolio`. En cas d'**erreur** (hors ligne, délai, 500) ou **sans compte**, l'ancien écran est rendu. Il recharge lui-même, puis appelle `.toFixed` sur `gain_loss_pct` et `daily_change_pct`, qui peuvent valoir `null` (position sans cours, investi nul) | Patrimoine ouvert dans le métro : échec, ancien écran ; le réseau revient, l'ancien écran charge une position sans cours (ajoutée le 17 octobre, `e894bbe`), `null.toFixed`, erreur de rendu. Sans `ErrorBoundary`, l'app se ferme | important | Remplacer le repli par un `PageState` d'erreur avec « Réessayer » (le nouveau format est en production), et ajouter l'`ErrorBoundary` racine |
| N3 | `BlockRenderer.tsx:23-27` et `:46` | Une seule expression régulière qui contient **tous les termes du dictionnaire**, avec `\p{L}`, lookbehind et les drapeaux `giu`, est **recompilée** (`new RegExp(termRegex.source, …)`) pour chaque fragment de texte : chaque paragraphe, élément de liste et morceau entre deux liens | L'article met plusieurs centaines de millisecondes, voire plus, à s'afficher sur iPhone. Le moteur d'expressions régulières de Hermes est interprété, alors que celui de Chrome est compilé : sur le web, rien ne se voit | important (à mesurer) | Réutiliser la même instance (remettre `lastIndex = 0`), ou découper le texte en mots et chercher chaque mot dans un `Set`, comme `dictionary.ts:425-436` le fait déjà sans `\p` ni lookbehind |
| N4 | `patrimoine/format.ts:15`, `:51` | `grouped()` et `quantity()` créent un nouveau `Intl.NumberFormat` à **chaque** montant. `utils/format.ts:16-27` les garde en cache, lui. Sur iOS, Hermes s'appuie sur les classes de formatage de Foundation, coûteuses à créer | Saccades au glissement du doigt sur la courbe (`LineChart` refait le rendu à chaque point, avec plusieurs `money()` par rendu) et dans les longues listes de positions | gênant (à mesurer) | Garder les formateurs dans un cache par nombre de décimales, comme `utils/format.ts` |
| N5 | `useCountUp.ts:28`, `useRollingNumber.ts:28`, `RevealScreen.tsx:118`, `SimChart.tsx:46`, `TrueFalseScreen.tsx:435` | Compteurs animés par `requestAnimationFrame` avec un `setState` à **chaque image**, donc un rendu React par image sur le fil JS | Compteurs saccadés sur les iPhone d'entrée de gamme pendant une animation, surtout si un son ou une requête tourne en même temps | gênant | Garder `setState`, mais en limiter la fréquence (une valeur sur deux ou sur trois), ou passer par une valeur partagée et un `TextInput` animé |
| N6 | `ModuleScreen.tsx:163-167` | Le défilement du module est lu côté JS (`onScroll` ordinaire), puis recopié dans `scrollSV`, qui pilote la profondeur des décors | Décors qui « collent » ou sautent pendant le défilement quand le fil JS est occupé (au chargement, ou quand le son démarre) | gênant | `useAnimatedScrollHandler` pour `scrollSV` ; garder `updateSide` côté JS par `scheduleOnRN`, avec un intervalle |
| N7 | `app.json:12` (`supportsTablet: true`) + `orientation: portrait` | Expo ajoute d'office les 4 orientations iPad (`@expo/config-plugins/build/ios/RequiresFullScreen.js:58-66`), sinon l'App Store refuse le binaire (ITMS-90474) | Sur iPad, l'app passe en paysage, une mise en page jamais dessinée. Renforce B5 | important | `supportsTablet: false`, ou `requireFullScreen: true` si l'iPad est gardé |
| N8 | `VaultScene.tsx:256-265` (`ParallaxLayer`, 2 instances) | Deux capteurs de gravité (deux mises à jour Core Motion) au rythme de l'écran, gardés **tant que l'écran de bienvenue reste monté**, donc aussi pendant le prénom, l'objectif et la leçon découverte poussés par-dessus. La formule suppose les axes d'iOS (`y + 0,6 g`) | Batterie et processeur entamés pendant toute la première ouverture, sans effet visible ; sur Android, la parallaxe démarre décalée (axe inversé) | gênant | Couper le capteur hors focus (`useIsFocused`, puis ne monter `ParallaxLayer` qu'au premier plan), un seul capteur pour les deux calques, intervalle de 33 ms |
| N9 | `SettingsScreen.tsx:118`, `:120`, `:132`, `:143` | `Alert.alert` ne fait **rien** sur le web (react-native-web), et `Share.share` y dépend de `navigator.share`. La suppression du compte et l'export n'ont donc **jamais pu être essayés** | Sur iPhone, ces chemins s'exécutent pour la première fois : les messages d'erreur bruts du serveur s'affichent (I9) et rien n'est purgé après la suppression (I6) | gênant (à tester sur iPhone) | Les essayer sur un build de développement ; sur le web, remplacer `Alert` par une `BottomSheet` de confirmation |
| N10 | `OperationScreen.tsx:255`, `ObjectifScreen.tsx:91` (champs `decimal-pad` aux lignes 104, 132, 309, 318) | Le clavier numérique d'iOS n'a **pas de touche Retour**, et les `ScrollView` n'ont ni `keyboardDismissMode` ni barre « OK » | Après la saisie d'un prix, le clavier reste ouvert : le bouton « Enregistrer » est caché ou poussé, et rien ne le ferme sauf toucher un autre champ. Le web, avec son clavier physique, ne le montre pas | gênant | `keyboardDismissMode="interactive"` sur ces `ScrollView`, et un `InputAccessoryView` « OK » qui appelle `Keyboard.dismiss()` |
| N11 | `ApiContext.tsx:155` | `AsyncStorage.getItem(TOKEN_KEY)` n'est pas protégé par un `try` dans l'IIFE de démarrage | Si la lecture échoue (stockage corrompu, ou app relancée en arrière-plan avant le premier déverrouillage, protection des données iOS), la promesse est rejetée et `isLoading` reste `true` : `OnboardingGate` attend pour toujours (`OnboardingGate.tsx:34`), et `StartupGate` ne libère l'écran qu'au bout de 3 s | gênant (rare) | `try/catch` autour de la lecture, et `setIsLoading(false)` dans un `finally` (fichier protégé : décision à prendre) |
| N12 | `ApprendreDetailScreen.tsx:244`, `:251`, `:258`, `:429`, `:481` | Précise I16 pour iPhone : en version publiée, `console.log` va dans le journal système (lisible avec Console.app ou un sysdiagnose). `JSON.stringify(res, null, 2)` de la réponse complète à chaque fin de leçon | Profil et XP de l'utilisateur dans le journal de l'appareil ; une dizaine de millisecondes perdues à chaque fin de leçon | important (déjà I16) | `if (__DEV__)` |
| N13 | `usePreloadedImages.ts:35-39` | `Asset.fromModule(...).downloadAsync()` ne décode pas l'image ; en version publiée, le fichier est déjà dans l'app. Sur iPhone, le préchargement ne sert à rien, mais il retarde l'ouverture de 800 ms au plus en développement (téléchargement depuis Metro) | Le logo et Val peuvent quand même apparaître en clignotant sur iPhone | cosmétique | `Image.prefetch` n'aide que pour les images distantes. Côté natif, accepter le clignotement, ou utiliser `expo-image` (cache mémoire) pour ces 4 images |
| N14 | `Style.ts:781`, `:1030`, `:1287`, `:1321`, `:1494` | `fontStyle: 'italic'` avec `fonts.body` (Inter Regular), dont aucune italique n'est chargée. Le web penche la police, iOS retombe sur l'italique du système (SF), même piège que le `fontWeight` signalé en tête de `Style.ts` | Citations d'article et textes vides de l'ancien design en San Francisco au lieu d'Inter | cosmétique | Charger `Inter_400Regular_Italic`, ou utiliser `fonts.italic` |
| N15 | `PatrimoineScreen.tsx`, `AssetSearchScreen.tsx`… (`AssetIcon.tsx:45`) | `Image` de React Native pour les logos distants, sans cache disque | Logos rechargés depuis le réseau à chaque ouverture, avec un clignotement | cosmétique | `expo-image` (déjà installé) avec `cachePolicy="memory-disk"` |

### 1.5 Modules natifs (audio, vibrations, notifications)

| Module | Constat | Verdict |
|---|---|---|
| expo-haptics (`utils/haptics.ts:24-33`) | Chaque appel passe par `safely()` : `try` synchrone et `.catch` asynchrone, plus un interrupteur de développement | OK |
| expo-audio (`utils/sound.ts`, `soundBank.ts:75-80`, `:90-107`, `:128-147`) | Création, lecture et rembobinage protégés ; `setAudioModeAsync` sur iOS (mélange avec la musique, bouton silencieux respecté) | OK. Une trentaine de lecteurs AVPlayer créés au préchargement et jamais libérés : acceptable |
| expo-notifications (`state/reminder.ts:28-46`) | `require` paresseux dans un `try`, et chaque appel public est dans un `try` | OK |
| Permission des notifications | `reminder.ts:98` : `granted` seul. Sur iOS, un **refus** n'affiche plus jamais la demande (`requestPermissionsAsync` répond « refusé » sans rien montrer) | gênant : déjà G8, sans lien vers `Linking.openSettings()`. L'autorisation provisoire d'iOS (`ios.status === PROVISIONAL`) n'est pas reconnue non plus |
| Son du rappel | `soundRules.ts:66` : `REMINDER_SOUND_FILE = null`, donc `'default'` | OK |
| Toucher d'une notification | Aucun écouteur de réponse | gênant : déjà G36 |

---

## 2. Vérification de l'audit précédent

| Trouvaille | Statut | Emplacement à jour |
|---|---|---|
| Pas d'`ErrorBoundary` dans `app/_layout.tsx` | **confirmé** | Aucun `export function ErrorBoundary` dans `app/` ; seuls `ScreenBoundary.tsx` et `EndFlowBoundary.tsx` existent, pour le lecteur de leçon |
| `CashflowScreen.tsx:94` `data?.by_category.depenses` | **corrigé (ligne)** | `CashflowScreen.tsx:97` (`data?.by_category.depenses.forEach`), et aussi `:139` |
| `EpargneScreen.tsx:116` | **confirmé** | `:116` : `recon.depassement.actif \|\| recon.surplus.actif`, sans garde |
| `PortefeuilleScreen.tsx:127` `.toFixed` | **confirmé** | `:127` et aussi `:136` (`daily_change_pct.toFixed`), plus `PositionRow.tsx:59`, `:67` |
| `BlockRenderer.tsx:143` | **confirmé** | `:143` : `quiz.choices.map`, sans garde |
| `BlockRenderer.tsx:107` `Linking.openURL` | **confirmé** | `:107` (avec `.catch`, mais sans filtrer le protocole) |
| `fetch` sans `AbortController` (`ApiContext.tsx`, `authProbe.ts`) | **confirmé** | `ApiContext.tsx:160`, `:187`, `:212`, `:238`, `:318`, `:328`, `:338` ; `authProbe.ts:11` (8 appels). Précision pour l'iPhone : iOS coupe après environ 60 s sans données (délai par défaut de `NSURLRequest`), Android jamais |
| `ApiContext.tsx:168-174` : jeton effacé sur toute réponse non 2xx | **confirmé, précisé** | `:168-174` (`removeItem` à `:172`). Précision : `response.json()` (`:166`) passe avant le test. Une page HTML 503 lève donc une erreur et garde le jeton ; une erreur 500 **en JSON** (cas de Laravel) l'efface |
| Déconnexion en `try/finally` sans `catch` (~`:275`) | **confirmé** | `:275-281` |
| `ApiContext.tsx:248` `response.json().catch(() => null)` | **corrigé (ligne)** | `:249` |
| `:256` « Erreur API » | **confirmé** | `:256` |
| `userMemory.ts:66` (mémoire invitée copiée) | **corrigé (ligne)** | `userMemory.ts:67-69` (test `:67`, lecture de l'invité `:68`, écriture `:69`) |
| `wordStates.ts:46` | **corrigé (ligne)** | `wordStates.ts:47` (`:46` est la migration des mots découverts) |
| `accuracy.ts:49` | **confirmé** | `state/accuracy.ts:49-50` |
| Jeton en AsyncStorage, `expo-secure-store` absent | **confirmé** | `ApiContext.tsx:144`, `:155`, clé `api_token` ; paquet absent de `package.json` |
| `console.log` dans `ApprendreDetailScreen.tsx` (244, 251, 258, 429, 481) | **confirmé** | Lignes identiques, aucune sous `__DEV__` |
| `LoginScreen.tsx:25` `FORGOT_PASSWORD_ENABLED` | **confirmé** | `:25` (`= false`) |
| Double appel `:49` / `:55` | **confirmé** | `postAuth` à `:49`, puis `login` à `:55` |
| `ThemeContext.tsx:16` | **confirmé** | `:16` (`useState`, non mémorisé). Sur iPhone, `userInterfaceStyle: "dark"` force `useColorScheme()` à `'dark'` : l'app part toujours en sombre, alors que le web suit le système |
| `app/_layout.tsx:87` `StatusBar` | **corrigé (ligne)** | `app/_layout.tsx:90` (`style="auto"`) |
| `ValRemark.tsx:17` | **confirmé** | `src/components/patrimoine/ValRemark.tsx:17` |
| `NotebookScreen.tsx:29` | **confirmé** | `:29` |
| `ArticleDetailScreen.tsx:47` / `:53` | **confirmé** | `:47` (`getDictionaryTerms()`), `:53` (`useMemo` refusé par le compilateur React) |
| `favicon.png` 2,97 Mo | **confirmé** | 2 973 019 octets, 6 336 × 2 688 |
| `val.png`, `b.png` | **confirmé** | 2,05 Mo et 64 Ko, jamais référencés |
| `react-native-render-html` inutilisée | **confirmé** | `package.json:43`, aucun import |
| `Style.ts` 1 840 lignes | **confirmé** | 1 840 ; `getBasiquesStyles` (`:453`), `getBoutonStyles` (`:492`) et `getInputStyles` (`:517`) toujours morts |
| `app.json` `bundleIdentifier com.gala0022.Valtheraa` | **confirmé** | `app.json:13` (et `package` Android `:26`) |
| `supportsTablet` | **confirmé, aggravé** | `app.json:12`. Voir N7 (paysage forcé sur iPad) |
| `eas.json` sans `env` par profil | **confirmé** | Les 4 profils sans `env` ; `API_BASE_URL` retombe sur `https://valtheria.fr/api` (`ApiContext.tsx:7-8`) |
| B6 (espaces insécables du patrimoine), vérifié en plus | **confirmé** | `patrimoine/format.ts:7-8` : octets `0x20` (vérifié avec `od`), alors que `utils/format.ts:6-7` contient bien les vrais caractères |

---

## 3. Vérifications lancées (sans rien modifier)

**`npx tsc --noEmit`** : code de sortie 0, **0 erreur**.

**`npx eslint .`** (lancé directement plutôt que `npm run lint`, pour ne pas écrire de cache) : **17 problèmes, 10 erreurs et 7 avertissements**. **Oui, ESLint parcourt `.expo/`** : 1 avertissement sur `.expo/types/router.d.ts`, et `eslint.config.js` n'ignore que `dist/*`.

| Fichier | Erreurs | Avertissements | Détail |
|---|---|---|---|
| `.expo/types/router.d.ts` | 0 | 1 | `1:1` directive `eslint-disable` inutile |
| `src/components/article/BlockRenderer.tsx` | 2 | 0 | `207:37`, `207:53` `react/no-unescaped-entities` |
| `src/components/outils/portfolio/PositionRow.tsx` | 1 | 0 | `67:58` `react/no-unescaped-entities` |
| `src/components/topbar/header.tsx` | 1 | 0 | `53:59` `react/no-unescaped-entities` |
| `src/modals.tsx/modal.tsx` | 0 | 1 | `10:7` `no-unused-vars` (`styles`) |
| `src/screens/ArticleDetailScreen.tsx` | 1 | 1 | `53:26` `preserve-manual-memoization` ; `50:6` `exhaustive-deps` |
| `src/screens/ArticleScreen.tsx` | 1 | 1 | `41:5` `set-state-in-effect` ; `42:6` `exhaustive-deps` |
| `src/screens/CashflowScreen.tsx` | 1 | 1 | `69:7` `set-state-in-effect` ; `74:6` `exhaustive-deps` |
| `src/screens/EpargneScreen.tsx` | 1 | 1 | `56:7` `set-state-in-effect` ; `61:6` `exhaustive-deps` |
| `src/screens/PortefeuilleScreen.tsx` | 2 | 1 | `74:7` `set-state-in-effect`, `133:61` `no-unescaped-entities` ; `79:6` `exhaustive-deps` |

Tout est dans l'ancien design, sauf l'avertissement de `.expo/`. Correction : `ignores: ['dist/*', '.expo/*']`.

**`npm test`** : **372 tests, 372 réussis**, 0 échec, 0 ignoré (28 fichiers, 1,34 s). Un avertissement Node `MODULE_TYPELESS_PACKAGE_JSON` sur `tests/worklets.test.ts` (sans effet).

---

## 4. Code mort et doublons (absents de l'audit précédent)

### Anciens écrans encore branchés (route → écran rendu)

| Route | Écran | État |
|---|---|---|
| `app/(tabs)/outils.tsx` | `OutilsScreen` | Ancien design (I18) |
| `app/(tabs)/article.tsx` | `ArticleScreen` | Ancien design (I19) |
| `app/articles/[slug].tsx` | `ArticleDetailScreen` + `BlockRenderer` | Ancien design (I19, I20) |
| `app/outils/cashflow.tsx` | `CashflowScreen` + `components/outils/cashflow/*` | Ancien design (I21) |
| `app/outils/epargne.tsx` | `EpargneScreen` | Ancien design (I21) |
| `app/outils/portefeuille.tsx` | `PatrimoineGate` → `PatrimoineScreen` **ou** `PortefeuilleScreen` + `components/outils/portfolio/*` | Repli encore actif sur erreur ou sans compte (**N2**) |
| `app/client/register.tsx` et `app/bienvenue/inscription.tsx` | Le même `SignupScreen` | Doublon de route voulu ; à garder en tête pour les liens profonds |
| `app/(tabs)/dictionary/mot.tsx` et `app/dictionnaire/mot.tsx` | Le même `TermScreen` (`standalone`) | Voulu |

Toutes les autres routes rendent des écrans à jour (bienvenue, Apprendre, lecteur, révision, Dictionnaire, Profil, Réglages, carnet, patrimoine).

### Exports jamais importés (en plus de `MASKED`, `formatRelativeDate`, `welcomeLine`, `clearPatrimoine`, `getBasiquesStyles`, `getBoutonStyles`, `getInputStyles` et des 3 fichiers orphelins déjà cités)

| Export | Fichier | Apparu le |
|---|---|---|
| `eurOr` | `src/utils/patrimoine/currency.ts` | 17/10 (`e6c8860`) |
| `investedEurOf` | `src/utils/patrimoine/model.ts` | 16/10 (`c1d991c`) |
| `DEFAULT_PREFS` | `src/utils/patrimoine/prefs.ts` | 16/10 (`c1d991c`) |
| `markDiscovered`, `useDiscoveredWords` | `src/state/discoveredWords.ts` (ce store ne sert plus qu'à la migration vers `wordStates`) | 16/10 |
| `moduleLevelLabel` | `src/utils/levels.ts` | 16/10 |
| `moduleDoneLine`, `allDoneLine` | `src/constants/valLines.ts` | 09/10 |
| `useDelayedLoading` | `src/components/common/Skeleton.tsx` | 08/10 |
| `opacityDim` | `src/constants/style/Style.ts` | 09/10 |
| `parallaxShift` | `src/utils/modulePath.ts` | 09/10 |
| `SavingsGoal`, `SavingsContribution` (types) | `src/context/ApiContext.tsx` (fichier protégé) | — |

Par ailleurs, 12 exports ne servent qu'aux tests. Ils sont légitimes s'il s'agit de fonctions pures testées.

### Doublons

| Doublon | Emplacements | Proposition |
|---|---|---|
| Constantes `NBSP` / `NNBSP` redéclarées | 9 fichiers : `utils/format.ts`, `utils/patrimoine/format.ts` (fausses, B6), `speechBubble.ts`, `dailyProgram.ts`, `StreakSheet.tsx`, `GuestStreakCard.tsx`, `LessonRecap.tsx`, `ChestReveal.tsx`, `HomeHeader.tsx` | Une seule source dans `utils/format.ts`, importée partout (cela aurait évité B6) |
| Même motif de store « cache, en attente, abonnés, file d'attente » réécrit | `userMemory.ts` (sans file d'attente), `wordStates.ts`, `accuracy.ts` (sans file d'attente), `patrimoinePrefs.ts`, `revisionMemory.ts` | Un `createUserStore` unique, **avec** file d'attente (voir 5) |
| Trois `formatMoney` et deux types `Position` | `EpargneScreen.tsx:26`, `PositionRow.tsx:4`, `PortefeuilleScreen.tsx:33` ; `utils/patrimoine/model.ts:16` et `components/outils/portfolio/types.ts:1` | Déjà G30 ; disparaît avec la suppression du repli (N2) |
| Deux mémoires des mots | `state/discoveredWords.ts` (ancienne) et `state/wordStates.ts` | Garder la migration, retirer les fonctions mortes |

### Fichiers de plus de 500 lignes

| Fichier | Lignes | Déjà signalé ? |
|---|---|---|
| `src/constants/style/Style.ts` | 1 840 | oui (G31) |
| `src/utils/dictionary.ts` | 1 057 | non : fonctions pures, testées (`tests/dictionary.test.ts`, 725 lignes) |
| `src/screens/ApprendreDetailScreen.tsx` | 858 | oui (G32) |
| `src/context/ApiContext.tsx` | 784 | oui (I24) |
| `src/screens/apprendre/ModuleScreen.tsx` | 607 | oui (G32) |
| `src/components/apprendre/screens/TrueFalseScreen.tsx` | 582 | non |
| `src/components/apprendre/screens/OrderScreen.tsx` | 574 | non |
| `src/screens/onboarding/DiscoveryEndScreen.tsx` | 542 | non |
| `src/components/common/ValBubble.tsx` | 538 | non |
| `src/screens/patrimoine/PatrimoineScreen.tsx` | 528 | non |
| `src/components/apprendre/end/ChestReveal.tsx` | 512 | non |
| `src/screens/patrimoine/OperationScreen.tsx` | 511 | non |

---

## 5. Mémoire du téléphone (AsyncStorage)

Sur iOS, AsyncStorage écrit du JSON en clair dans `Application Support/<bundle>/RCTAsyncLocalStorage_V1/`, dossier **inclus dans les sauvegardes iCloud et Finder**. Les écritures passent par une file série native : des `setItem` lancés sans attendre s'appliquent dans l'ordre. Le problème vient des séquences lire-modifier-écrire côté JS.

### Clés écrites

| Clé | Contenu | Portée | Sensible |
|---|---|---|---|
| `api_token` | Jeton Sanctum | global | **oui** : donne accès au compte (I7) |
| `valtheria:lastProfile` | `{ userId, pseudo }` | global | personnel |
| `valtheria:premiere-ouverture` | Étape, **prénom**, pseudo, objectif, leçons découvertes, jours | global | personnel |
| `valtheria:objectif:dernier` | Dernier objectif | global | faible |
| `valtheria:objectif:<compte>` | Objectif du compte | par compte | faible |
| `valtheria:rappel` | `{ enabled, time }` | global | non |
| `valtheria:sons` | `on` / `off` | global | non |
| `valtheria:flamme-allumee` | Jour | global | non |
| `valtheria:lecons-textes` | Texte de toutes les leçons chargées, **sans limite** | global (partagé entre comptes) | non |
| `valtheria:index-mots` | Index mots → leçons | global | non |
| `valtheria:patrimoine:<compte>` | Mode discret, **objectifs financiers, versements sur les livrets**, étapes | par compte | **oui** (financier) |
| `valtheria:carnet:<compte>` | Déclics | par compte | faible |
| `valtheria:journal:<compte>` | Journal de la semaine | par compte | faible |
| `valtheria:apprendre:lecons:<compte>` | Leçons faites | par compte | faible |
| `valtheria:mots-decouverts:<compte>` | Ancienne mémoire des mots | par compte | non |
| `valtheria:mots-etats:<compte>` | État de chaque mot | par compte | non |
| `valtheria:univers-vus:<compte>` | Univers vus | par compte | non |
| `valtheria:precision:<compte>` | Records de bonnes réponses | par compte | non |
| `valtheria:revision:<compte>` | Écrans notés de **chaque** leçon jouée (`lessons`, sans limite), historique, 3 derniers plans | par compte | non |
| `valtheria:journee-fetee:<compte>` | Jour fêté | par compte | non |
| `valtheria:recompenses-serie:<id>` | Récompenses de série | par id | non |
| `valtheria:apprendre:lastModuleId:<id>` | Dernier module | par id | non |
| `valtheria:apprendre:celebratedModules:<id>` | Modules fêtés | par id | non |
| `valtheria:dictionnaire:recents:<id>` | Mots récents | par id | non |
| `valtheria:dictionnaire:mesMots:<id>` | Favoris | par id | non |

`<compte>` vaut `invite` sans compte, sinon l'id. Rien n'est purgé à la déconnexion ni à la suppression du compte, à part `clearLastProfile` (I6).

### Parse JSON

Les 14 `JSON.parse` de `src/state/` sont tous protégés (`try/catch`, avec une valeur par défaut) ; celui de `ArticleDetailScreen.tsx:56` aussi. **Aucun parse non protégé.** Côté réseau, `response.json()` n'est pas protégé dans `ApiContext.tsx:166`, `:196`, `:221`, `:321`, `:331`, `:341` : une page HTML (portail Wi-Fi, 502) lève « JSON Parse error ». Ce n'est pas un plantage, mais ce message brut s'affiche (I9).

### Problèmes

| # | Fichier:ligne | Description | Scénario sur iPhone | Gravité | Correction |
|---|---|---|---|---|---|
| M1 | `userMemory.ts:81-88` (`update`) | Pas de file d'attente : deux `update` lancés à la suite lisent la même liste en cache, et le second écrase le premier, en mémoire comme sur le téléphone | Carnet, journal, leçons faites, univers vus : une entrée perdue si deux ajouts tombent dans la même image (fin de leçon qui ajoute deux déclics) | gênant | Même `queue` que `wordStates.ts:60-71` |
| M2 | `dictionaryMemory.ts:34-47` | `addRecentTerm` et `toggleFavoriteTerm` lisent, modifient et écrivent sur le stockage, sans file d'attente (G9) | Deux favoris touchés vite : seul le second reste | gênant | File d'attente, ou cache en mémoire comme les autres stores |
| M3 | `lastModule.ts:39-47` ; `state/accuracy.ts:65-75` | Même lire-modifier-écrire sans file d'attente | Deux modules finis presque en même temps : une célébration rejouée ; précision d'une leçon perdue | cosmétique | Même file d'attente |
| M4 | `userMemory.ts:38-47` (`read` renvoie `null` sur erreur), `accuracy.ts:25-31`, `wordStates.ts:20-27` | « Illisible » est traité comme « jamais vu » : la mémoire invitée est reprise, puis **écrite par-dessus** (G9) | Une lecture qui échoue une fois efface le carnet ou la précision du compte | gênant | Renvoyer `'absent'` ou `'illisible'`, et ne jamais écrire après une lecture illisible |
| M5 | `userMemory.ts:67-69`, `wordStates.ts:47`, `accuracy.ts:49-50` | Mémoire invitée reprise par **tout** compte qui ouvre l'app pour la première fois, jamais vidée (I5) | Un deuxième utilisateur du même iPhone reçoit les déclics et les mots du premier | important | Ne reprendre qu'à l'inscription, puis supprimer les clés `:invite` |
| M6 | `lessonTexts.ts:47-53` | Écriture retardée de 500 ms (`setTimeout`) | App fermée d'un balayage juste après la fin de la leçon : texte non gardé (il sera rechargé) | cosmétique | Écrire aussi au passage en arrière-plan (`AppState`) |
| M7 | `lessonTexts.ts` (`valtheria:lecons-textes`), `revisionMemory.ts` (`lessons`) | Croissance sans limite ; chaque écriture re-sérialise tout sur le fil JS | Sur iOS, pas de plafond, mais `JSON.stringify` grossit à chaque leçon (de quelques centaines de Ko à quelques Mo sur un an) et ralentit les fins de leçon ; Android plafonne à 6 Mo | gênant | Garder les N dernières leçons (`at`), comme `PLANS_KEPT` |
| M8 | `ApiContext.tsx:144`, `patrimoinePrefs.ts:50`, `onboarding.ts:40` | Jeton, données financières et prénom en clair, sauvegardés dans iCloud (I7) | Une sauvegarde Finder non chiffrée, ou un iCloud compromis, donne le jeton (accès au compte sans mot de passe) et les objectifs financiers | important | Jeton dans le trousseau (`expo-secure-store`, `keychainAccessible: AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`) ; purge par compte à la déconnexion et à la suppression |
| M9 | `ApiContext.tsx:155` | Lecture du jeton non protégée (voir N11) | Démarrage bloqué si la lecture échoue | gênant | `try/catch/finally` |
