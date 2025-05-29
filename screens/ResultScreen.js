import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import * as ScreenOrientation from 'expo-screen-orientation';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const ResultScreen = ({ route, navigation }) => {
  const { score, category, items = [] } = route.params;
  const total = score.correct + score.skipped;
  const accuracy = total > 0 ? ((score.correct / total) * 100).toFixed(1) : 0;
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    const setOrientation = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
    setOrientation();
  }, []);

  const handlePlayAgain = () => {
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    setTimeout(() => {
      navigation.navigate('TimeSelect', {
        onComplete: (time) => {
          navigation.navigate('Game', {
            category: category,
            timeLimit: time,
            items: shuffleArray(items),
          });
        },
      });
    }, 200);
  };

  const handleExit = () => {
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    setTimeout(() => {
      navigation.navigate('Home');
    }, 200);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <LinearGradient colors={COLORS.gradient.primary} style={styles.gradient}>
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>Game Over</Text>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.finalScore}>{score.correct}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <AnimatedTouchable
            style={[styles.button, buttonAnimatedStyle]}
            onPress={handlePlayAgain}
          >
            <Text style={styles.buttonText}>Play Again</Text>
          </AnimatedTouchable>

          <AnimatedTouchable
            style={[styles.button, buttonAnimatedStyle]}
            onPress={handleExit}
          >
            <Text style={styles.buttonText}>Exit</Text>
          </AnimatedTouchable>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : SIZES.padding * 2,
    paddingBottom: Platform.OS === 'ios' ? 50 : SIZES.padding * 2,
  },
  gameOverContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  gameOverTitle: {
    ...FONTS.title,
    fontSize: 36,
    color: COLORS.text,
    marginBottom: SIZES.padding,
  },
  scoreLabel: {
    ...FONTS.subtitle,
    fontSize: 24,
    color: COLORS.text,
    opacity: 0.8,
  },
  finalScore: {
    ...FONTS.title,
    fontSize: 72,
    color: COLORS.text,
    marginVertical: SIZES.padding,
  },
  buttonContainer: {
    paddingHorizontal: SIZES.padding * 2,
    gap: SIZES.padding,
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    ...FONTS.button,
    color: COLORS.text,
    fontSize: 18,
  },
});

export default ResultScreen; 