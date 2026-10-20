import { StyleSheet, TextStyle } from "react-native";

// Thème unique : sombre (le thème clair a été retiré le 20/10/2026)
export type ColorScheme = 'dark';

// Polices chargées dans app/_layout.tsx. La graisse est portée par la famille :
// ne pas ajouter de fontWeight en plus (iOS retomberait sur la police système).
export const fonts = {
  title: 'Fraunces_500Medium',
  titleItalic: 'Fraunces_500Medium_Italic', // « enfin » de l'écran de bienvenue
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  bodyExtraBold: 'Inter_800ExtraBold',
  // Emphase dans la bulle de Val (**mot**)
  bodyEmphasis: 'Inter_600SemiBold_Italic',
} as const;

// Titres Fraunces : interlettrage resserré proportionnel à la taille
export const titleLetterSpacing = (fontSize: number) => Math.round(-0.022 * fontSize * 100) / 100;

// Intitulé de section : petites capitales dorées
export function sectionLabel(colors: { gold: string }): TextStyle {
  return {
    color: colors.gold,
    fontFamily: fonts.bodySemibold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  };
}

export const palette = {
  // Thème sombre — reprend le fond confirmé du site (#0D0D0F)
  dark: {
    background: '#0D0D0F',
    surface: '#18181C',       // cartes, inputs, panneaux légèrement plus clairs
    surfaceAlt: '#232328',
    text: '#F2EFE8',
    subtitle: 'rgba(242,239,232,0.52)',  // texte atténué
    textFaint: 'rgba(242,239,232,0.26)', // texte faible
    border: 'rgba(255,255,255,0.055)',   // filet de séparation
    controlBorder: 'rgba(255,255,255,0.13)', // bordures de champs et de contrôles
    gold: '#C9A84C',
    goldDeep: '#977E39',                 // tranche du relief sous l'or (bouton, rond en cours)
    goldHalo: 'rgba(201,168,76,0.15)',   // centre des halos dorés (0,15 au plus : discret)
    goldLine: 'rgba(201,168,76,0.25)',   // filet doré discret (bulle de Val)
    goldRing: 'rgba(201,168,76,0.45)',   // anneau autour de la leçon en cours
    goldSoft: 'rgba(201,168,76,0.13)',   // fond de sélection discret
    frost: 'rgba(143,190,224,0.18)',     // jour sauvé par un gel (bleu glacier discret)
    frostInk: '#8FBEE0',                 // flocon du gel de série
    bubble: '#F7F4EE',                   // bulle de Val (ivoire)
    onBubble: '#0D0D0F',                 // texte de la bulle de Val
    onGold: '#0D0D0F',                   // texte posé sur l'or
    success: '#3FA876',
    error: '#E0715F',
    successDeep: '#2B7A55',              // tranche du relief sous le vert (bouton, option juste)
    dangerDeep: '#A9503F',               // tranche du relief sous le rouge
    successSoft: 'rgba(63,168,118,0.13)', // fond teinté d'une option juste
    dangerSoft: 'rgba(224,113,95,0.13)',  // fond teinté d'une option fausse
    successSheet: '#12261C',             // feuille de réponse juste
    dangerSheet: '#2A1715',              // feuille de réponse fausse
    reliefEdge: 'rgba(255,255,255,0.13)', // tranche d'une option en relief
    progressShine: 'rgba(255,255,255,0.35)', // reflet de la barre de progression
    goldGlint: 'rgba(255,236,170,0.8)',  // éclat doré qui parcourt la barre (série d'affilée)
    pathLockedFace: '#2B2F38',           // rond verrouillé du chemin
    pathLockedDeep: '#171A20',           // sa tranche (et celle du bouton flottant)
    pathShine: 'rgba(255,255,255,0.25)', // reflet en haut à gauche des ronds
    ivory: '#F7F4EE',                    // étoile et icônes des ronds, bulle « COMMENCER »
    nodeHighlight: '#FFFFFF',            // reflet radial (dégradé de 35 % à 0)
    nodeShade: '#000000',                // ombre radiale en bas à droite (18 %)
    nodeInnerLight: 'rgba(255,255,255,0.25)', // fine lumière intérieure en haut
    groundShadow: '#000000',             // ombres au sol (ronds, Val, décors)
    pathScrim: 'rgba(0,0,0,0.35)',       // voile sous la carte de leçon
    cardEdge: 'rgba(0,0,0,0.25)',        // tranche du bouton de la carte de leçon
    shadow: '#000000',
    blobLight: '#FFFFFF',                // taches du fond d'écran
    blobDark: '#000000',
    surface2: '#202026',                 // surface pressée, deuxième niveau
    surfaceEdge: '#08080A',              // tranche d'une carte en relief posée sur surface (mot du jour)
    optionFace: '#1D1D23',               // face d'une carte en relief du lecteur (option, carte, ligne)
    optionEdge: '#0E0E11',               // sa tranche
    optionBorder: 'rgba(255,255,255,0.10)', // son filet
    disabledFace: '#2A2A31',             // bouton en relief inactif (gris foncé neutre)
    disabledEdge: '#1F1F25',             // sa tranche
    disabledText: 'rgba(242,239,232,0.38)', // son libellé (ivoire à 38 %)
    panel: 'rgba(255,255,255,0.04)',     // encart posé sur le fond (barres d'une révélation)
    panelStrong: 'rgba(255,255,255,0.05)', // bande de chiffres du profil
    cardSurface: 'rgba(255,255,255,0.03)', // carte de couleur (UniverseCard) : fond
    cardBorder: 'rgba(255,255,255,0.07)',  // son filet
    artFrame: '#121216',                   // cadre arrondi d'une illustration d'univers (UniverseArt)
    track: 'rgba(255,255,255,0.08)',       // piste d'une barre de progression sur une carte
    goldPill: 'rgba(201,168,76,0.14)',     // pastille du niveau
    goldTile: 'rgba(201,168,76,0.16)',     // carré d'une icône dorée (carnet)
    goldLight: '#E8C97A',                  // barre du jour (graphique de la semaine)
    barEmpty: '#18181C',                   // barre d'un jour sans leçon
    pileBack: '#18181D',                 // cartes sous la pile du vrai ou faux
    pileBackDeep: '#141418',             // la plus basse
    chatBubble: '#23232A',               // bulle d'un personnage (dialogue)
    streak: '#E08A4A',                   // série de jours : flamme, tuile SÉRIE, « jours d'affilée »
    streakGlow: 'rgba(224,138,74,0.35)', // lueur orange sous la grande flamme
    scrim: 'rgba(0,0,0,0.6)',            // voile sous les feuilles et modales
    focusRing: '#C9A84C',                // = gold
    skeletonShine: 'rgba(255,255,255,0.06)', // reflet des squelettes de chargement
    logoShine: 'rgba(242,239,232,0.35)',   // reflet qui traverse le logo au démarrage
    chart1: '#C9A84C',                   // = gold
    chart2: '#D9D2C3',
    chart3: '#7C9CC4',
    chart4: '#A06E48',
    chart5: '#64646E',
  },
};

// Couleurs propres à chaque module (chemin, bannière, carte de leçon).
// face : aplat ; deep : tranche du relief ; onFace : texte et icônes posés
// dessus.
// Les leçons terminées sont en or (récompense), pas dans la couleur du module. Quel module prend quelle couleur : moduleColorKey (utils/modulePath).
// L'or reste réservé à l'XP, aux Vals, aux coffres et aux trophées.
export const moduleColors = {
  ardoise: { face: '#7C9CC4', deep: '#4F6B8F', onFace: '#0D0D0F' },
  sarcelle: { face: '#5E9E9A', deep: '#3F6F6C', onFace: '#0D0D0F' },
  cuivre: { face: '#C9855A', deep: '#8E5A39', onFace: '#0D0D0F' },
  ivoire: { face: '#D9D2C3', deep: '#A39C8D', onFace: '#0D0D0F' },
} as const;

export type ModuleColors = (typeof moduleColors)[keyof typeof moduleColors];

// Fond commun (AppBackground), thème sombre : deux halos radiaux par-dessus
// le fond #0D0D0F, puis le grain. Bleu nuit dans le coin propre à l'onglet,
// or dans le coin opposé. reach : rayon où le halo s'éteint, en part de la
// largeur de l'écran (l'or un peu plus court).
// Carte de couleur (UniverseCard) : rayon, liseré gauche (largeur, retrait
// en haut et en bas). Sa lueur qui suit la progression : utils/universeGlow.
export const universeCard = {
  radius: 20,
  bar: 4,
  barInset: 14,
} as const;

// Illustration d'un univers (UniverseArt) : halo radial de la couleur de
// l'univers (centre, mi-chemin, éteint à `fade`, centré un peu au-dessus du
// milieu), part de la zone occupée par l'image, rayon du cadre en part de la
// taille
export const universeArt = {
  haloCenter: 0.33,
  haloMid: 0.06,
  haloMidAt: 0.6,
  fade: 0.8,
  haloY: 0.45,
  imageScale: 0.92,
  frameRadius: 0.21,
} as const;

// Couleur de la pastille d'un niveau de difficulté (accueil, page d'un
// univers) : un ton de la palette par niveau du site ; inconnu : l'or
export const levelTone: Record<string, 'success' | 'gold' | 'streak' | 'frostInk'> = {
  entree: 'success',
  debutant: 'success',
  inter: 'gold',
  avance: 'streak',
  expert: 'frostInk',
};

// Accueil d'Apprendre : carte de la leçon du jour, ligne de la révision,
// carrousel des univers
export const learnHome = {
  valWidth: 118,
  valHeight: 122,
  lessonArt: 76,
  lessonTitle: 20,
  rowRadius: 18,
  tileWidth: 168,
  tileArt: 150,
  tileRadius: 20,
  tileGap: 12,
  tileName: 18,
} as const;

// Série de bonnes réponses d'affilée (lecteur de leçon) : échelles de la
// pastille ⚡ (apparition, pulsation), durées (ms) de la traînée
// d'étincelles, de la gerbe des paliers et de la sortie ; nombre
// d'étincelles et portée de la gerbe ; grand texte et barre en feu
export const runBadgeFx = {
  peak: 1.2,
  pulse: 1.15,
  trail: 650,
  burst: 700,
  exit: 200,
  trailSparks: 7,
  burstSparks: 10,
  burstReach: 30,
  // Grand texte « 3 d'affilée ! » : arrivée, tenue, sortie (ms)
  shoutIn: 180,
  shoutHold: 800,
  shoutOut: 300,
  // Barre qui « prend feu » : passage de l'or à l'orange et retour (ms),
  // reflet qui la parcourt en boucle (ms par passage), lueur autour
  fireFade: 300,
  fireShine: 1800,
  fireGlow: 0.55,
} as const;

// Lumière du coffre ouvert, selon sa rareté : couleur et intensité du halo
// et des rayons (pâle et douce pour commun, bleutée pour rare, violette
// pour épique, or intense pour légendaire)
export const chestLight = {
  commun: { color: '#EFE6CC', strength: 0.55 },
  rare: { color: '#7FB6F2', strength: 0.75 },
  epique: { color: '#B387F2', strength: 0.85 },
  legendaire: { color: '#F5BF36', strength: 1 },
} as const;

// Lueur dorée derrière l'en-tête du profil : or au cœur, diamètre
export const headerGlow = { opacity: 0.16, size: 300 } as const;

// Grain du fond commun : juste assez pour lisser les dégradés des halos
export const backgroundGrain = 0.02;

export const backgroundHalo = {
  night: { color: '#4664AA', opacity: 0.3, reach: 0.78 },
  gold: { color: '#C9A84C', opacity: 0.2, reach: 0.7 },
} as const;

// Une couleur « #RRGGBB » de la palette, avec une opacité (0 à 1)
export function withOpacity(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

// Bulle de Val : forme, texte, ombre
export const bubble = {
  radius: 18,
  paddingX: 16,
  paddingY: 12,
  maxWidth: 280,
  fontSize: 17,
  lineHeight: 24,
  tailBase: 16, // largeur de la pointe à sa base
  shadowOpacity: 0.35,
} as const;

// Ombre de la bulle de Val : noire à 35 %, flou moyen, décalée vers le bas
export function bubbleShadow(groundShadow: string) {
  return [{ offsetX: 0, offsetY: 6, blurRadius: 14, color: withOpacity(groundShadow, bubble.shadowOpacity) }];
}

// Ombre douce sous une carte en relief qui flotte (accueil sans compte) :
// noire à 45 %, floue et décalée vers le bas, en plus de la tranche
export function softShadow(groundShadow: string) {
  return [{ offsetX: 0, offsetY: 16, blurRadius: 32, color: withOpacity(groundShadow, 0.45) }];
}

// ---------------------------------------------------------------------------
// Jetons de mise en page (grille de 4 px)
// ---------------------------------------------------------------------------
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;

// option : réponses de QCM en relief
// card : cartes plates (surface, rayon 16)
export const radius = { sm: 6, md: 12, option: 14, card: 16, lg: 20, pill: 999 } as const;

export const size = {
  tapMin: 44,
  buttonHeight: 52,
  rowMin: 56,
  icon: 24,
  tabBar: 49,
  valSm: 90,
} as const;

export const opacityDisabled = 0.42;
// Élément secondaire estompé (ligne « dim » d'une révélation)
export const opacityDim = 0.52;

// Épaisseur de la tranche sous les éléments en relief (bouton principal,
// rond de la leçon en cours) ; la face s'y enfonce à l'appui.
export const reliefDepth = 4;

// ---------------------------------------------------------------------------
// Mouvement (ms). Toute animation du lecteur de leçon part de ces durées ;
// courbe par défaut : ease-out (constants/motion.ts), ressorts existants
// pour les rebonds. Rien au-delà de max, sauf le défilement d'un chiffre de
// révélation (roll).
// ---------------------------------------------------------------------------
export const motion = {
  tap: 90,          // retour simple : appui, sélection
  state: 150,       // changement d'état (couleur, humeur de Val)
  shake: 200,       // tremblement d'une réponse fausse
  sheet: 250,       // feuille qui monte, élément d'une cascade
  screen: 300,      // passage d'un écran au suivant, avance de la progression
  suspense: 300,    // silence avant la révélation d'un chiffre
  max: 500,
  roll: 1000,       // chiffre de révélation qui défile
  stagger: 40,      // décalage entre deux éléments d'une cascade
  // Attentes (pas des animations)
  reveal: 80,       // une ligne corrigée de plus (ordre), toutes les 80 ms
  typing: 600,      // un personnage « écrit » avant chaque message
  nextCard: 1500,   // la carte suivante du vrai ou faux arrive seule
  chestStep: 450,   // le coffre monte d'une rareté
} as const;

// ---------------------------------------------------------------------------
// Styles de texte. maxFontSizeMultiplier est une prop de <Text>, pas un style :
// chaque variante porte donc son style ET son plafond d'agrandissement.
// Utiliser <AppText variant="..."> (src/components/common/AppText.tsx) qui
// applique les deux. Aucune couleur ici : elle dépend du thème.
// ---------------------------------------------------------------------------
type TextVariant = { style: TextStyle; maxFontSizeMultiplier: number };

export const textVariants = {
  hero: {
    style: {
      fontFamily: fonts.title,
      fontSize: 44,
      lineHeight: 48,
      letterSpacing: -0.97,
      fontVariant: ['tabular-nums'],
    },
    maxFontSizeMultiplier: 1.2,
  },
  title1: {
    style: { fontFamily: fonts.title, fontSize: 30, lineHeight: 36, letterSpacing: titleLetterSpacing(30) },
    maxFontSizeMultiplier: 1.3,
  },
  title2: {
    style: { fontFamily: fonts.title, fontSize: 24, lineHeight: 30, letterSpacing: titleLetterSpacing(24) },
    maxFontSizeMultiplier: 1.3,
  },
  title3: {
    style: { fontFamily: fonts.title, fontSize: 20, lineHeight: 26, letterSpacing: titleLetterSpacing(20) },
    maxFontSizeMultiplier: 1.3,
  },
  body: {
    style: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
    maxFontSizeMultiplier: 1.6,
  },
  bodyMedium: {
    style: { fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 22 },
    maxFontSizeMultiplier: 1.6,
  },
  callout: {
    style: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
    maxFontSizeMultiplier: 1.6,
  },
  caption: {
    style: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
    maxFontSizeMultiplier: 1.4,
  },
  button: {
    style: { fontFamily: fonts.bodySemibold, fontSize: 16, lineHeight: 20 },
    maxFontSizeMultiplier: 1.3,
  },
  tabLabel: {
    style: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 13 },
    maxFontSizeMultiplier: 1.2,
  },
  sectionLabel: {
    style: {
      fontFamily: fonts.bodySemibold,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    maxFontSizeMultiplier: 1.2,
  },
} as const satisfies Record<string, TextVariant>;

export type TextVariantName = keyof typeof textVariants;


export function getHeaderStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    side: {
      minWidth: 32,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      padding: 4,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBtn: {
      padding: 4,
    },
    textBtn: {
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    textBtnLabel: {
      fontSize: 14,
      fontFamily: fonts.bodyMedium,
      color: colors.background,
    },
    pillBtn: {
      backgroundColor: colors.gold,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
    },
    pillBtnLabel: {
      color: colors.onGold,
      fontSize: 14,
      fontFamily: fonts.bodySemibold,
    },
  });
}


export function getArticlesStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    listContent: {
      padding: 20,
      gap: 16,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 16,
    },
    cover: {
      width: '100%',
      height: 160,
      backgroundColor: colors.surfaceAlt,
    },
    cardBody: {
      padding: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    categoryBadge: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    categoryBadgeText: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.bodyMedium,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.bodySemibold,
      marginBottom: 4,
    },
    excerpt: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      lineHeight: 18,
    },
    date: {
      color: colors.subtitle,
      fontSize: 11,
      fontFamily: fonts.body,
      marginTop: 8,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 60,
      gap: 8,
    },
    emptyText: {
      color: colors.subtitle,
      fontSize: 14,
      fontFamily: fonts.body,
    },
  });
}

export function getArticleDetailStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scroll: {
      paddingBottom: 40,
    },
    cover: {
      width: '100%',
      height: 220,
      backgroundColor: colors.surfaceAlt,
    },
    content: {
      padding: 20,
    },
    categoryBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 12,
    },
    categoryBadgeText: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.bodyMedium,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(24),
      lineHeight: 30,
      marginBottom: 8,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    date: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
    },
    actions: {
      flexDirection: 'row',
      gap: 16,
    },
    body: {
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.body,
      lineHeight: 26,
    },
    error: {
      color: colors.error,
      fontFamily: fonts.body,
      padding: 20,
    },
  });
}

export function getBlockStyles(colorScheme: ColorScheme) {
  const colors = palette[colorScheme];

  return StyleSheet.create({
    h2: {
      color: colors.text,
      fontSize: 21,
      fontFamily: fonts.bodySemibold,
      marginTop: 24,
      marginBottom: 10,
    },
    h3: {
      color: colors.text,
      fontSize: 18,
      fontFamily: fonts.bodySemibold,
      marginTop: 20,
      marginBottom: 8,
    },
    paragraph: {
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.body,
      lineHeight: 25,
      marginBottom: 14,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 20,
    },
    quoteBlock: {
      borderLeftWidth: 3,
      borderLeftColor: colors.gold,
      paddingLeft: 14,
      marginVertical: 16,
    },
    quoteText: {
      color: colors.text,
      fontSize: 17,
      fontFamily: fonts.body,
      fontStyle: 'italic',
      lineHeight: 24,
    },
    quoteAuthor: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      marginTop: 6,
    },
    calloutBlock: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginVertical: 14,
    },
    calloutText: {
      fontSize: 14,
      fontFamily: fonts.body,
      lineHeight: 21,
    },
    listBlock: {
      marginVertical: 10,
      gap: 8,
    },
    listRow: {
      flexDirection: 'row',
      gap: 8,
    },
    listBullet: {
      color: colors.gold,
      fontSize: 16,
      fontFamily: fonts.body,
      lineHeight: 22,
    },
    listItemText: {
      flex: 1,
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.body,
      lineHeight: 22,
    },
    statCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 26,
      fontFamily: fonts.title,
      letterSpacing: titleLetterSpacing(26),
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      color: colors.subtitle,
      fontSize: 12,
      fontFamily: fonts.body,
      textAlign: 'center',
      marginTop: 6,
    },
    twoColumns: {
      flexDirection: 'row',
      gap: 16,
      marginVertical: 10,
    },
    column: {
      flex: 1,
    },
    quizCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 16,
      gap: 10,
    },
    quizQuestion: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bodySemibold,
      marginBottom: 4,
    },
    quizChoice: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    quizChoiceText: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.body,
    },
    quizExplanation: {
      color: colors.subtitle,
      fontSize: 13,
      fontFamily: fonts.body,
      lineHeight: 19,
      marginTop: 4,
    },
      termLink: {
      color: colors.gold,
      fontFamily: fonts.body,
      textDecorationLine: 'underline',
      textDecorationStyle: 'dotted',
    },
  });
}
