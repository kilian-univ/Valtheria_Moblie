import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { getSplashStyles, palette } from '@/src/constants/style/Style';
import { useTheme } from '@/src/context/ThemeContext';

const VAL_NEUTRE = require('@/assets/images/md/val-neutre.webp');
const VAL_YEUX_FERMES = require('@/assets/images/md/val-neutre-yeux-fermes.webp');
const VAL_COMPLICE = require('@/assets/images/md/val-complice.webp');

export default function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const { colorScheme } = useTheme();
  const colors = palette[colorScheme];
  const styles = getSplashStyles(colorScheme);

  const valTranslateY = useRef(new Animated.Value(40)).current;
  const valOpacity = useRef(new Animated.Value(0)).current;
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  // Trois calques d'image superposés, un par expression de Val — fondu croisé.
  const neutreOpacity = useRef(new Animated.Value(1)).current;
  const closedOpacity = useRef(new Animated.Value(0)).current;
  const complinceOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Val (neutre) : rebond depuis le bas (0 → 400ms)
      Animated.parallel([
        Animated.timing(valOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(valTranslateY, {
          toValue: 0,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      // 2. Message de bienvenue en dessous
      Animated.timing(welcomeOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // 3. Petite pause, Val reste neutre un instant
      Animated.delay(200),
      // 4. Clignement : neutre → yeux fermés → neutre
      Animated.timing(closedOpacity, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(neutreOpacity, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.delay(80),
      Animated.timing(closedOpacity, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }),
      // 5. Bascule vers l'expression complice (sourire final)
      Animated.timing(complinceOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      // 6. Courte pause pour laisser voir l'expression complice + lire le message
      Animated.delay(400),
      // 7. Fondu de sortie de tout l'écran (révèle l'app en dessous)
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      <Animated.View
        style={[
          styles.valAvatar,
          { opacity: valOpacity, transform: [{ translateY: valTranslateY }] },
        ]}
      >
        <Animated.Image
          source={VAL_NEUTRE}
          resizeMode="cover"
          style={[styles.valImage, { opacity: neutreOpacity }]}
        />
        <Animated.Image
          source={VAL_YEUX_FERMES}
          resizeMode="cover"
          style={[styles.valImage, { opacity: closedOpacity }]}
        />
        <Animated.Image
          source={VAL_COMPLICE}
          resizeMode="cover"
          style={[styles.valImage, { opacity: complinceOpacity }]}
        />
      </Animated.View>

      <Animated.Text style={[styles.welcomeText, { opacity: welcomeOpacity }]}>
        Bienvenue sur Valtheria
      </Animated.Text>
      <Animated.Text style={[styles.welcomeSubtext, { opacity: welcomeOpacity }]}>
        Vous allez apprendre la finance
      </Animated.Text>
    </Animated.View>
  );
}