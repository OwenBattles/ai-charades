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
  const { items = [], category = '', timeLimit = 60, isCustomCategory = false } = route.params;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownText, setCountdownText] = useState('Place on Forehead');
  const [score, setScore] = useState({ correct: 0, skipped: 0 });
  const [processedItems, setProcessedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#4CAF50');
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [gameItems, setGameItems] = useState(items);
  const [isGenerating, setIsGenerating] = useState(false);

  // Refs
  const timerRef = useRef(null);
  const lastActionTime = useRef(0);
  const canTriggerAction = useRef(true);

  // Animated values
  const overlayOpacity = useSharedValue(0);
  const overlayScale = useSharedValue(0);
  const wordOpacity = useSharedValue(1);
  const countdownOpacity = useSharedValue(1);
  const countdownScale = useSharedValue(1);
  const wordScale = useSharedValue(1);
  const wordRotateZ = useSharedValue(0);
  const wordTranslateY = useSharedValue(0);
  const scoreScale = useSharedValue(1);

  // Initialize game state
  useEffect(() => {
    setTimeLeft(timeLimit);
    setCurrentIndex(0);
    setScore({ correct: 0, skipped: 0 });
    setGameEnded(false);
    setIsPlaying(false);
    setIsCountingDown(false);
  }, [timeLimit]);

  // Process items
  useEffect(() => {
    if (gameItems.length > 0) {
      setProcessedItems(gameItems.map(item => ({ text: item, status: 'pending' })));
      setIsLoading(false);
    } else if (isCustomCategory) {
      // For custom categories, we start in preview mode (no items yet)
      setIsLoading(false);
    } else {
      // For default categories, items should already be provided
      setIsLoading(false);
    }
  }, [gameItems, isCustomCategory]);

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
    console.log('Current state - isCountingDown:', isCountingDown, 'isPlaying:', isPlaying);
    setIsCountingDown(true);
    console.log('isCountingDown set to true');
    const countdownSteps = ['Place on Forehead', '3', '2', '1', 'Go!'];
    
    for (let i = 0; i < countdownSteps.length; i++) {
      setCountdownText(countdownSteps[i]);
      console.log('Countdown step:', countdownSteps[i], 'isCountingDown state:', isCountingDown);
      
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
      
      // Reset animation values
      countdownOpacity.value = 0;
      countdownScale.value = 1.5;
      
      // Animate in
      countdownOpacity.value = withTiming(1, { duration: 300 });
      countdownScale.value = withSpring(1, { 
        damping: 12,
        stiffness: 100
      });
      
      // Wait
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Animate out
      countdownOpacity.value = withTiming(0, { duration: 300 });
      countdownScale.value = withTiming(0.5, { duration: 300 });
      
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    console.log('Countdown finished, setting isCountingDown to false and isPlaying to true');
    setIsCountingDown(false);
    setIsPlaying(true);
  };

  const handleCorrect = () => {
    setProcessedItems(prevItems => {
      const newItems = [...prevItems];
      if (currentIndex >= 0 && currentIndex < newItems.length) {
        newItems[currentIndex] = { ...newItems[currentIndex], status: 'correct' };
      }
      return newItems;
    });
    setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    
    // Enhanced animations for correct answer
    wordScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 100 }),
      withSpring(0.8, { damping: 8, stiffness: 100 })
    );
    wordRotateZ.value = withSequence(
      withTiming(5, { duration: 150 }),
      withTiming(-5, { duration: 150 }),
      withTiming(0, { duration: 150 })
    );
    
    // Score animation
    scoreScale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 100 }),
      withSpring(1, { damping: 8, stiffness: 100 })
    );
    
    showFeedback('Correct!', true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setTimeout(() => {
      nextCard();
    }, 600);
  };

  const handleIncorrect = () => {
    setProcessedItems(prevItems => {
      const newItems = [...prevItems];
      if (currentIndex >= 0 && currentIndex < newItems.length) {
        newItems[currentIndex] = { ...newItems[currentIndex], status: 'skipped' };
      }
      return newItems;
    });
    setScore(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    
    // Enhanced animations for skip
    wordTranslateY.value = withSequence(
      withSpring(-30, { damping: 8, stiffness: 100 }),
      withSpring(30, { damping: 8, stiffness: 100 }),
      withSpring(0, { damping: 10, stiffness: 100 })
    );
    wordScale.value = withSequence(
      withSpring(0.9, { damping: 8, stiffness: 100 }),
      withSpring(1.1, { damping: 8, stiffness: 100 }),
      withSpring(0.8, { damping: 8, stiffness: 100 })
    );
    
    showFeedback('Skip!', false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    setTimeout(() => {
      nextCard();
    }, 600);
  };

  const showFeedback = (text, isSuccess) => {
    setFeedbackText(text);
    setFeedbackColor(isSuccess ? '#4CAF50' : '#F44336');
    
    // Animate the overlay
    overlayScale.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(1, { duration: 200 })
    );
    overlayOpacity.value = withSequence(
      withTiming(0.9, { duration: 150 }),
      withDelay(800, withTiming(0, { duration: 300 }))
    );
    
    if (isSuccess) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const nextCard = () => {
    if (currentIndex < gameItems.length - 1) {
      // Reset word animations
      wordScale.value = withTiming(1, { duration: 200 });
      wordRotateZ.value = withTiming(0, { duration: 200 });
      wordTranslateY.value = withTiming(0, { duration: 200 });
      
      // Fade out current word
      wordOpacity.value = withSequence(
        withTiming(0, { duration: 200 }),
        withDelay(100, withTiming(1, { duration: 300 }))
      );
      
      // Update the current index after the fade animation
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
      }, 300);
    } else {
      endGame();
    }
  };

  const startGame = () => {
    console.log('startGame called');
    if (isCustomCategory && gameItems.length === 0) {
      // For custom categories, call API first
      handleStartGame();
    } else {
      // For default categories or when items are already loaded, start countdown
      startCountdown();
    }
  };

  const handleStartGame = async () => {
    console.log('handleStartGame called for custom category:', category);
    setIsGenerating(true);
    try {
      const response = await fetch('https://charaids.onrender.com/generate-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: category.trim(),
          count: 35,
        }),
      });

      console.log('API response status:', response.status);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid response format');
      }

      console.log('Setting game items - user will need to click Start again');
      setGameItems(shuffleArray(data.items));
      setIsGenerating(false);
      // Don't automatically start countdown - wait for user to click Start again
    } catch (error) {
      console.error('API Error:', error);
      Alert.alert(
        'Error',
        'The server is taking longer than expected. Please try again in a moment.',
        [{ text: 'OK' }]
      );
      setIsGenerating(false);
    }
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
      items: gameItems
    });
  };

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [
      { scale: wordScale.value },
      { rotateZ: `${wordRotateZ.value}deg` },
      { translateY: wordTranslateY.value }
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

  if (isLoading) {
    console.log('Rendering loading screen');
    return (
      <LinearGradient colors={COLORS.gradient.primary} style={styles.container}>
        <LoadingDeck />
      </LinearGradient>
    );
  }

  if (isGenerating) {
    console.log('Rendering generating deck animation');
    return (
      <View style={{ flex: 1 }}>
        <StatusBar hidden />
        <LinearGradient
          colors={COLORS.gradient.primary}
          style={[styles.container, styles.loadingContainer]}
        >
          <LoadingDeck />
        </LinearGradient>
      </View>
    );
  }

  if (isCountingDown) {
    console.log('Rendering countdown screen with text:', countdownText);
    console.log('isCountingDown:', isCountingDown, 'isPlaying:', isPlaying, 'isGenerating:', isGenerating);
    return (
      <LinearGradient 
        colors={COLORS.gradient.primary} 
        style={styles.fullScreenContainer}
      >
        <StatusBar hidden />
        <Animated.Text 
          style={[
            styles.countdownText,
            countdownAnimatedStyle
          ]}
        >
          {countdownText}
        </Animated.Text>
      </LinearGradient>
    );
  }

  if (!isPlaying) {
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
          <Text style={styles.wordText}>{gameItems[currentIndex]}</Text>
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
  countdownText: {
    ...FONTS.title,
    fontSize: 72,
    color: COLORS.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
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
    fontSize: 60,
    color: '#FFFFFF',
    textAlign: 'center',
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
  loadingContainer: {
    justifyContent: 'center',
  },
});

export default GameScreen; 