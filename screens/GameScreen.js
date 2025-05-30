import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import LoadingDeck from '../components/LoadingDeck';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TILT_THRESHOLD = 0.7; // Decreased threshold for more sensitivity
const DEBOUNCE_TIME = 1000; // ms
const COUNTDOWN_DURATION = 1000;

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const GameScreen = ({ route, navigation }) => {
  const { items = [], category = '', timeLimit = 60 } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownText, setCountdownText] = useState('3');
  const [score, setScore] = useState({ correct: 0, skipped: 0 });
  const [processedItems, setProcessedItems] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#4CAF50');
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [gameStarted, setGameStarted] = useState(false);

  // Refs
  const timerRef = useRef(null);
  const lastActionTime = useRef(0);
  const canTriggerAction = useRef(true);

  // Animated values
  const overlayOpacity = useSharedValue(0);
  const overlayScale = useSharedValue(0);
  const wordOpacity = useSharedValue(1);
  const countdownOpacity = useSharedValue(0);
  const countdownScale = useSharedValue(0.5);
  const wordScale = useSharedValue(1);
  const wordRotateZ = useSharedValue(0);
  const wordTranslateY = useSharedValue(0);
  const scoreScale = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const cardRotateY = useSharedValue(0);
  const correctParticles = useSharedValue(0);
  const skipShake = useSharedValue(0);

  // Initialize game state
  useEffect(() => {
    setTimeLeft(timeLimit);
    setCurrentIndex(0);
    setScore({ correct: 0, skipped: 0 });
    setGameEnded(false);
    setIsPlaying(false);
    setIsCountingDown(false);
    setGameStarted(false);
  }, [timeLimit]);

  // Process items
  useEffect(() => {
    if (items.length > 0) {
      setProcessedItems(items.map(item => ({ text: item, status: 'pending' })));
    }
  }, [items]);

  // Timer effect
  useEffect(() => {
    let timer;
    if (isPlaying && timeLeft > 0 && !gameEnded) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isPlaying, gameEnded]);

  useEffect(() => {
    const setupOrientation = async () => {
      if (isPlaying || isCountingDown) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      }
    };
    setupOrientation();
  }, [isPlaying, isCountingDown]);

  useEffect(() => {
    const startAccelerometer = async () => {
      if (isPlaying) {
        // Add initial delay to prevent accidental scoring on first item
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await Accelerometer.setUpdateInterval(100); // Update every 100ms
        
        const subscription = Accelerometer.addListener(data => {
          setAccelerometerData(data);
          
          const now = Date.now();
          if (now - lastActionTime.current < DEBOUNCE_TIME) {
            return;
          }

          // Only process if we can trigger an action
          if (canTriggerAction.current) {
            // Phone tilted down (toward floor) = correct answer
            if (data.z < -TILT_THRESHOLD) {
              canTriggerAction.current = false;
              lastActionTime.current = now;
              handleCorrect();
            // Phone tilted up (toward ceiling) = skip
            } else if (data.z > TILT_THRESHOLD) {
              canTriggerAction.current = false;
              lastActionTime.current = now;
              handleIncorrect();
            }
          }

          // Reset action trigger if phone is roughly level
          if (Math.abs(data.z) < 0.3) {
            canTriggerAction.current = true;
          }
        });

        return () => subscription.remove();
      }
    };

    startAccelerometer();
    return () => {
      Accelerometer.removeAllListeners();
    };
  }, [isPlaying]);

  const startCountdown = async () => {
    console.log('startCountdown called');
    setIsCountingDown(true);
    setGameStarted(true);
    
    const countdownSteps = ['Place on Forehead', '3', '2', '1', 'Go!'];
    
    for (let i = 0; i < countdownSteps.length; i++) {
      setCountdownText(countdownSteps[i]);
      console.log('Countdown step:', countdownSteps[i]);
      
      // Reset animation values
      countdownOpacity.value = 0;
      countdownScale.value = 0.5;
      
      // Animate in
      countdownOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
      countdownScale.value = withSpring(1.2, { 
        damping: 12,
        stiffness: 100,
        mass: 1
      });
      
      // Add haptic feedback for numbers and Go!
      if (i > 0) { // Skip haptics for "Place on Forehead"
        if (i === countdownSteps.length - 1) {
          // Stronger haptic for "Go!"
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          // Light haptic for numbers
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
      
      // Wait longer for "Place on Forehead"
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 1500 : 800));
      
      // Animate out (except for the last step)
      if (i < countdownSteps.length - 1) {
        countdownOpacity.value = withTiming(0, { duration: 200 });
        countdownScale.value = withTiming(0.8, { duration: 200 });
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Final animation for "Go!"
    countdownOpacity.value = withTiming(0, { duration: 400 });
    countdownScale.value = withTiming(2, { duration: 400 });
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    console.log('Countdown finished, setting isCountingDown to false and isPlaying to true');
    setIsCountingDown(false);
    setIsPlaying(true);
  };

  const handleCorrect = () => {
    console.log('Correct answer!');
    setProcessedItems(prevItems => {
      const newItems = [...prevItems];
      if (currentIndex >= 0 && currentIndex < newItems.length) {
        newItems[currentIndex] = { ...newItems[currentIndex], status: 'correct' };
      }
      return newItems;
    });
    setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    
    // Enhanced animations for correct answer
    correctParticles.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 800 })
    );
    
    cardScale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 100 }),
      withSpring(1, { damping: 12, stiffness: 100 })
    );
    
    cardRotateY.value = withSequence(
      withTiming(10, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(-10, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) })
    );
    
    wordScale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 100 }),
      withSpring(1, { damping: 8, stiffness: 100 })
    );
    
    // Score animation
    scoreScale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 100 }),
      withSpring(1, { damping: 8, stiffness: 100 })
    );
    
    showFeedback('✓ Correct!', true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    nextCard();
  };

  const handleIncorrect = () => {
    console.log('Skipped answer!');
    setProcessedItems(prevItems => {
      const newItems = [...prevItems];
      if (currentIndex >= 0 && currentIndex < newItems.length) {
        newItems[currentIndex] = { ...newItems[currentIndex], status: 'skipped' };
      }
      return newItems;
    });
    setScore(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    
    // Enhanced animations for skip
    skipShake.value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(-1, { duration: 100 }),
      withTiming(1, { duration: 100 }),
      withTiming(-1, { duration: 100 }),
      withTiming(0, { duration: 50 })
    );
    
    wordTranslateY.value = withSequence(
      withSpring(-20, { damping: 8, stiffness: 150 }),
      withSpring(20, { damping: 8, stiffness: 150 }),
      withSpring(0, { damping: 10, stiffness: 100 })
    );
    
    cardScale.value = withSequence(
      withSpring(0.95, { damping: 8, stiffness: 100 }),
      withSpring(1.05, { damping: 8, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );
    
    showFeedback('⏭ Skip!', false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    nextCard();
  };

  const showFeedback = (text, isSuccess) => {
    setFeedbackText(text);
    setFeedbackColor(isSuccess ? '#4CAF50' : '#FF9800');
    
    // Animate the overlay with improved timing
    overlayScale.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.7)) }),
      withTiming(1, { duration: 600 })
    );
    overlayOpacity.value = withSequence(
      withTiming(0.85, { duration: 200 }),
      withDelay(600, withTiming(0, { duration: 400 }))
    );
  };

  const nextCard = () => {
    if (currentIndex < items.length - 1) {
      // Enhanced card transition
      wordOpacity.value = withSequence(
        withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
        withDelay(100, withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }))
      );
      
      // Update the current index after the animation
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        // Reset card animations
        cardScale.value = 1;
        cardRotateY.value = 0;
        wordScale.value = 1;
        wordTranslateY.value = 0;
        wordRotateZ.value = 0;
      }, 300);
    } else {
      endGame();
    }
  };

  const startGame = () => {
    console.log('startGame called');
    startCountdown();
  };

  const endGame = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    Accelerometer.removeAllListeners();
    setGameEnded(true);
    
    // Reset orientation to portrait and wait for it to complete before navigating
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    // Small delay to ensure orientation change is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Navigate to ResultScreen with items included
    navigation.navigate('Result', {
      score: score,
      category: category,
      items: items
    });
  };

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [
      { scale: wordScale.value * cardScale.value },
      { rotateZ: `${wordRotateZ.value}deg` },
      { rotateY: `${cardRotateY.value}deg` },
      { translateY: wordTranslateY.value },
      { translateX: skipShake.value * 10 }
    ],
  }));

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const overlayStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: feedbackColor,
      opacity: overlayOpacity.value,
      transform: [{ scale: overlayScale.value }],
    };
  });

  const countdownAnimatedStyle = useAnimatedStyle(() => ({
    opacity: countdownOpacity.value,
    transform: [{ scale: countdownScale.value }],
  }));

  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const particlesStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      correctParticles.value,
      [0, 1],
      [0, -100],
      Extrapolate.CLAMP
    );
    const opacity = interpolate(
      correctParticles.value,
      [0, 0.2, 0.8, 1],
      [0, 1, 1, 0],
      Extrapolate.CLAMP
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Show countdown screen
  if (isCountingDown && gameStarted) {
    console.log('Rendering countdown screen with text:', countdownText);
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar hidden />
        <LinearGradient 
          colors={COLORS.gradient.primary} 
          style={styles.fullScreenContainer}
        >
          <Animated.View 
            style={[
              styles.countdownContainer,
              countdownAnimatedStyle,
            ]}
          >
            <Animated.Text 
              style={[
                styles.countdownText,
                {
                  fontSize: countdownText === 'Place on Forehead' ? 48 : 96,
                }
              ]}
            >
              {countdownText}
            </Animated.Text>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  // Show pre-game screen
  if (!gameStarted) {
    console.log('Rendering pre-game screen');
    return (
      <View style={{ flex: 1 }}>
        <StatusBar hidden />
        <LinearGradient
          colors={COLORS.gradient.primary}
          style={styles.container}
        >
          <TouchableOpacity 
            style={styles.exitButton} 
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.category}>{category}</Text>
          <Text style={styles.timeText}>{formatTime(timeLimit)}</Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (gameEnded) {
    console.log('Game ended, returning null');
    return null; // Return null since we're navigating away
  }

  console.log('Rendering main game screen');
  return (
    <View style={{ flex: 1 }}>
      <StatusBar hidden />
      <LinearGradient
        colors={COLORS.gradient.primary}
        style={styles.container}
      >
        <TouchableOpacity 
          style={styles.exitButton} 
          onPress={endGame}
        >
          <Text style={styles.exitButtonText}>✕</Text>
        </TouchableOpacity>
        
        <Animated.View style={[styles.wordContainer, wordStyle]}>
          <Text style={styles.wordText}>{items[currentIndex]}</Text>
          
          {/* Particles effect for correct answers */}
          <Animated.View style={[styles.particlesContainer, particlesStyle]}>
            <Text style={styles.particleText}>🎉</Text>
            <Text style={styles.particleText}>✨</Text>
            <Text style={styles.particleText}>🎊</Text>
          </Animated.View>
        </Animated.View>

        <View style={styles.gameFooter}>
          <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
          <Animated.Text style={[styles.score, scoreStyle]}>Score: {score.correct}</Animated.Text>
        </View>

        <Animated.View style={overlayStyle}>
          <View style={styles.feedbackContainer}>
            <Text style={styles.overlayFeedbackText}>{feedbackText}</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  gameHeader: {
    position: 'absolute',
    top: 80,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding * 2,
  },
  timer: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 32,
  },
  score: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 32,
  },
  card: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding * 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  cardText: {
    ...FONTS.title,
    fontSize: 48,
    color: COLORS.text,
    textAlign: 'center',
  },
  feedback: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  feedbackText: {
    ...FONTS.title,
    fontSize: 40,
  },
  exitButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  exitButtonText: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 24,
  },
  category: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 36,
    textAlign: 'center',
    marginBottom: 20,
  },
  timeText: {
    ...FONTS.subtitle,
    color: COLORS.text,
    fontSize: 28,
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.padding * 2,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
  },
  startButtonText: {
    ...FONTS.button,
    color: COLORS.text,
  },
  countdownContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    zIndex: 1000,
  },
  countdownText: {
    ...FONTS.title,
    color: COLORS.text,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    paddingHorizontal: SIZES.padding,
  },
  summaryHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    ...FONTS.title,
    fontSize: 64,
    color: COLORS.text,
    marginBottom: SIZES.padding * 2,
  },
  summaryScore: {
    ...FONTS.title,
    fontSize: 96,
    color: COLORS.text,
  },
  wordList: {
    flex: 1,
    width: '100%',
    paddingHorizontal: SIZES.padding,
  },
  wordListContent: {
    paddingBottom: SIZES.padding * 2,
  },
  wordItem: {
    width: '100%',
    padding: SIZES.padding * 0.8,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding * 0.5,
  },
  wordText: {
    ...FONTS.title,
    fontSize: 64,
    color: COLORS.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  correctWordText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  skippedWordText: {
    color: COLORS.text,
  },
  homeButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: Platform.OS === 'ios' ? 50 : SIZES.padding * 2,
    marginHorizontal: SIZES.padding * 2,
    width: '90%',
    alignSelf: 'center',
  },
  homeButtonText: {
    ...FONTS.button,
    color: COLORS.text,
    fontSize: 20,
    textAlign: 'center',
  },
  gameFooter: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding * 2,
  },
  feedbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayFeedbackText: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  wordContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.padding * 2,
  },
  summaryWordText: {
    ...FONTS.body,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'left',
  },
  summarySubtitle: {
    ...FONTS.subtitle,
    fontSize: 20,
    color: COLORS.text,
    marginBottom: 20,
  },
  listSection: {
    marginBottom: SIZES.padding * 1.5,
  },
  sectionHeader: {
    marginBottom: SIZES.padding,
    paddingHorizontal: SIZES.padding * 0.5,
  },
  listSectionTitle: {
    ...FONTS.title,
    fontSize: 24,
    color: COLORS.text,
    textAlign: 'left',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : SIZES.padding * 2,
  },
  gameOverTitle: {
    ...FONTS.title,
    fontSize: 36,
    color: COLORS.text,
    marginBottom: SIZES.padding,
  },
  finalScore: {
    ...FONTS.title,
    fontSize: 72,
    color: COLORS.text,
    marginVertical: SIZES.padding,
  },
  scoreLabel: {
    ...FONTS.subtitle,
    fontSize: 24,
    color: COLORS.text,
    opacity: 0.8,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleText: {
    fontSize: 48,
    color: '#FFFFFF',
    margin: 5,
  },
});

export default GameScreen; 