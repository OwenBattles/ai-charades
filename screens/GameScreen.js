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
  withRepeat,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import LoadingDeck from '../components/LoadingDeck';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TILT_THRESHOLD = 0.7; // Decreased threshold for more sensitivity
const DEBOUNCE_TIME = 1000; // ms
const COUNTDOWN_DURATION = 1000;

// Remove old orientation functions and add new orientation tracking
const GameScreen = ({ route, navigation }) => {
  const { items = [], category = '', timeLimit = 60 } = route.params;
  const [orientation, setOrientation] = useState('portrait');
  const [screenDimensions, setScreenDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height
  });
  
  // Computed dimensions based on orientation
  const isLandscape = orientation === 'landscape';
  const width = isLandscape
    ? Math.max(screenDimensions.width, screenDimensions.height)
    : Math.min(screenDimensions.width, screenDimensions.height);
  const height = isLandscape
    ? Math.min(screenDimensions.width, screenDimensions.height)
    : Math.max(screenDimensions.width, screenDimensions.height);

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
  const countdownRotate = useSharedValue(0);
  
  // New animated values for enhanced interactions
  const exitButtonScale = useSharedValue(1);
  const exitButtonRotate = useSharedValue(0);
  const categoryScale = useSharedValue(1);
  const categoryTranslateY = useSharedValue(0);
  const timeTextScale = useSharedValue(1);
  const timeTextRotate = useSharedValue(0);
  const startButtonScale = useSharedValue(1);
  const startButtonRotate = useSharedValue(0);
  const gameFooterTranslateY = useSharedValue(0);
  const scoreTextRotate = useSharedValue(0);
  const timerPulse = useSharedValue(1);

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

  // Add orientation change listener
  useEffect(() => {
    const updateOrientation = async () => {
      const current = await ScreenOrientation.getOrientationAsync();
      const isLandscape = (
        current === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        current === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
      );
      setOrientation(isLandscape ? 'landscape' : 'portrait');
    };

    const updateDimensions = () => {
      const { width, height } = Dimensions.get('window');
      setScreenDimensions({ width, height });
    };

    const orientationSub = ScreenOrientation.addOrientationChangeListener(() => {
      updateOrientation();
    });

    const dimensionsSub = Dimensions.addEventListener('change', updateDimensions);

    // Initial updates
    updateOrientation();
    updateDimensions();

    return () => {
      ScreenOrientation.removeOrientationChangeListeners();
      dimensionsSub.remove();
    };
  }, []);

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
            // Phone tilted up (toward ceiling) = correct answer
            if (data.z > TILT_THRESHOLD) {
              canTriggerAction.current = false;
              lastActionTime.current = now;
              handleCorrect();
            // Phone tilted down (toward floor) = skip
            } else if (data.z < -TILT_THRESHOLD) {
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
    
    // Initial haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Wait for state to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const countdownSteps = ['Place on Forehead', '3', '2', '1', 'Go!'];
    
    for (let i = 0; i < countdownSteps.length; i++) {
      setCountdownText(countdownSteps[i]);
      console.log('Setting countdown text to:', countdownSteps[i]);
      
      // Reset animation values
      countdownScale.value = 0;
      countdownOpacity.value = 0;
      countdownRotate.value = -180;
      
      // Entrance animation sequence
      countdownOpacity.value = withTiming(1, { duration: 200 });
      countdownScale.value = withSequence(
        withSpring(1.4, {
          damping: 12,
          stiffness: 100,
          mass: 1,
          velocity: 20
        }),
        withSpring(1, {
          damping: 8,
          stiffness: 100
        })
      );
      countdownRotate.value = withSpring(0, {
        damping: 10,
        stiffness: 80,
        mass: 0.8
      });
      
      // Add bounce effect for numbers
      if (i > 0 && i < countdownSteps.length - 1) {
        setTimeout(() => {
          countdownScale.value = withSequence(
            withSpring(1.2, { damping: 4, stiffness: 200 }),
            withSpring(0.8, { damping: 4, stiffness: 200 }),
            withSpring(1, { damping: 6, stiffness: 200 })
          );
        }, 300);
      }
      
      // Special animation for "Go!"
      if (i === countdownSteps.length - 1) {
        countdownScale.value = withSequence(
          withSpring(1.6, { damping: 3, stiffness: 150 }),
          withSpring(1, { damping: 8, stiffness: 100 })
        );
        countdownRotate.value = withSequence(
          withSpring(360, { damping: 10, stiffness: 50 }),
          withSpring(0, { damping: 12, stiffness: 100 })
        );
      }
      
      // Enhanced haptic feedback
      if (i === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (i === countdownSteps.length - 1) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 100);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      // Wait between steps with varying durations
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 2000 : 1000));
      
      // Exit animation
      if (i < countdownSteps.length - 1) {
        countdownOpacity.value = withTiming(0, { 
          duration: 300,
          easing: Easing.out(Easing.cubic)
        });
        countdownScale.value = withSpring(0.5, {
          damping: 12,
          stiffness: 100
        });
        countdownRotate.value = withSpring(180, {
          damping: 8,
          stiffness: 80
        });
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        // Final exit animation
        countdownScale.value = withSequence(
          withSpring(1.8, { damping: 4, stiffness: 100 }),
          withSpring(0, { damping: 8, stiffness: 100 })
        );
        countdownOpacity.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic)
        });
        countdownRotate.value = withSpring(720, {
          damping: 5,
          stiffness: 50
        });
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    }
    
    console.log('Countdown finished, starting game');
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
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 1000 })
    );
    
    // More dramatic card animation
    cardScale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );
    
    cardRotateY.value = withSequence(
      withTiming(20, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(-20, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(0, { duration: 200, easing: Easing.out(Easing.back(2)) })
    );
    
    // Enhanced word animation
    wordScale.value = withSequence(
      withSpring(1.5, { damping: 4, stiffness: 100 }),
      withSpring(1, { damping: 6, stiffness: 100 })
    );
    
    // Enhanced score animation
    scoreScale.value = withSequence(
      withSpring(1.6, { damping: 4, stiffness: 100 }),
      withSpring(1, { damping: 6, stiffness: 100 })
    );
    
    // Enhanced feedback overlay
    overlayOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(400, withTiming(0, { duration: 600 }))
    );
    
    overlayScale.value = withSequence(
      withSpring(1.1, { damping: 6, stiffness: 100 }),
      withSpring(1, { damping: 8, stiffness: 100 }),
      withDelay(400, withSpring(1.2, { damping: 6, stiffness: 100 }))
    );
    
    showFeedback('Correct!', true);
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
    
    // Enhanced skip shake animation
    skipShake.value = withSequence(
      withTiming(2, { duration: 50 }),
      withTiming(-2, { duration: 100 }),
      withTiming(2, { duration: 100 }),
      withTiming(-2, { duration: 100 }),
      withTiming(0, { duration: 50 })
    );
    
    // Enhanced vertical bounce
    wordTranslateY.value = withSequence(
      withSpring(-40, { damping: 6, stiffness: 150 }),
      withSpring(40, { damping: 6, stiffness: 150 }),
      withSpring(0, { damping: 8, stiffness: 100 })
    );
    
    // Enhanced card scale animation
    cardScale.value = withSequence(
      withSpring(0.9, { damping: 6, stiffness: 100 }),
      withSpring(1.1, { damping: 6, stiffness: 100 }),
      withSpring(1, { damping: 8, stiffness: 100 })
    );
    
    // Enhanced feedback overlay
    overlayOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(400, withTiming(0, { duration: 600 }))
    );
    
    overlayScale.value = withSequence(
      withSpring(1.1, { damping: 6, stiffness: 100 }),
      withSpring(1, { damping: 8, stiffness: 100 }),
      withDelay(400, withSpring(1.2, { damping: 6, stiffness: 100 }))
    );
    
    showFeedback('Skip', false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    nextCard();
  };

  const showFeedback = (text, isSuccess) => {
    setFeedbackText(text);
    setFeedbackColor(isSuccess ? '#4CAF50' : '#FF0000');
    
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
    transform: [
      { scale: countdownScale.value },
      { rotateZ: `${countdownRotate.value}deg` }
    ],
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

  // Initialize entry animations
  useEffect(() => {
    if (!gameStarted) {
      // Reset and trigger entry animations
      categoryScale.value = 0;
      categoryTranslateY.value = 50;
      timeTextScale.value = 0;
      startButtonScale.value = 0;
      exitButtonScale.value = 0;
      
      // Sequence the entry animations
      setTimeout(() => {
        exitButtonScale.value = withSpring(1, { damping: 8, stiffness: 100 });
        categoryScale.value = withSpring(1, { damping: 8, stiffness: 100 });
        categoryTranslateY.value = withSpring(0, { damping: 8, stiffness: 100 });
      }, 100);
      
      setTimeout(() => {
        timeTextScale.value = withSpring(1, { damping: 8, stiffness: 100 });
      }, 300);
      
      setTimeout(() => {
        startButtonScale.value = withSpring(1, { damping: 6, stiffness: 100 });
      }, 500);
    }
  }, [gameStarted]);

  // Add continuous animations
  useEffect(() => {
    if (isPlaying) {
      // Continuous subtle rotation for score text
      scoreTextRotate.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 2000 }),
          withTiming(5, { duration: 2000 })
        ),
        -1,
        true
      );
      
      // Timer pulse animation when time is low
      if (timeLeft <= 10) {
        timerPulse.value = withRepeat(
          withSequence(
            withSpring(1.2, { damping: 4 }),
            withSpring(1, { damping: 4 })
          ),
          -1,
          true
        );
      }
    }
  }, [isPlaying, timeLeft]);

  // Enhanced button press animations
  const handleButtonPress = (button, action) => {
    const buttonScale = button === 'exit' ? exitButtonScale :
                       button === 'start' ? startButtonScale : 1;
    
    buttonScale.value = withSequence(
      withSpring(0.8, { damping: 4, stiffness: 400 }),
      withSpring(1.2, { damping: 4, stiffness: 400 }),
      withSpring(1, { damping: 6, stiffness: 400 })
    );
    
    if (button === 'exit') {
      exitButtonRotate.value = withSequence(
        withSpring(-30, { damping: 4 }),
        withSpring(30, { damping: 4 }),
        withSpring(0, { damping: 6 })
      );
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => action(), 200);
  };

  // Enhanced animated styles
  const exitButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: exitButtonScale.value },
      { rotate: `${exitButtonRotate.value}deg` }
    ],
  }));

  const categoryStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: categoryScale.value },
      { translateY: categoryTranslateY.value }
    ],
  }));

  const timeTextStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: timeTextScale.value },
      { rotate: `${timeTextRotate.value}deg` }
    ],
  }));

  const startButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: startButtonScale.value },
      { rotate: `${startButtonRotate.value}deg` }
    ],
  }));

  const gameFooterStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: gameFooterTranslateY.value }],
  }));

  const scoreTextStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scoreScale.value },
      { rotate: `${scoreTextRotate.value}deg` }
    ],
  }));

  const timerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerPulse.value }],
  }));

  // Update the countdown screen render
  if (isCountingDown) {
    console.log('Rendering countdown screen');
    const countdownFontSize = isLandscape 
      ? countdownText === 'Place on Forehead' 
        ? height * 0.12 
        : height * 0.2
      : countdownText === 'Place on Forehead' 
        ? 48 
        : 72;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar hidden />
        <LinearGradient 
          colors={COLORS.gradient.primary}
          style={styles.fullScreenContainer}
        >
          <Animated.Text 
            style={[
              styles.countdownText,
              countdownAnimatedStyle,
              {
                fontSize: countdownFontSize,
                maxWidth: width * 0.9,
                textAlign: 'center',
              }
            ]}
          >
            {countdownText}
          </Animated.Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Update the main game screen render
  if (isPlaying && !gameEnded) {
    const wordFontSize = isLandscape ? height * 0.15 : 64;
    const timerFontSize = isLandscape ? height * 0.08 : 32;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar hidden />
        <LinearGradient
          colors={COLORS.gradient.primary}
          style={styles.container}
        >
          <Animated.View style={[styles.exitButtonContainer, exitButtonStyle]}>
            <TouchableOpacity 
              style={[styles.exitButton, { 
                top: isLandscape ? height * 0.05 : 20,
                left: isLandscape ? width * 0.02 : 20,
              }]} 
              onPress={() => handleButtonPress('exit', endGame)}
            >
              <Text style={[styles.exitButtonText, { 
                fontSize: isLandscape ? height * 0.06 : 24 
              }]}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
          
          <Animated.View style={[styles.wordContainer, wordStyle, {
            paddingHorizontal: isLandscape ? width * 0.1 : SIZES.padding * 2,
          }]}>
            <Text style={[styles.wordText, { 
              fontSize: wordFontSize,
              maxWidth: width * 0.8,
            }]}>{items[currentIndex]}</Text>
          </Animated.View>

          <Animated.View style={[styles.gameFooter, gameFooterStyle, {
            bottom: isLandscape ? height * 0.1 : 40,
            paddingHorizontal: isLandscape ? width * 0.05 : SIZES.padding * 2,
          }]}>
            <Animated.Text style={[styles.timer, timerStyle, { fontSize: timerFontSize }]}>
              {formatTime(timeLeft)}
            </Animated.Text>
            <Animated.Text style={[styles.score, scoreTextStyle, { fontSize: timerFontSize }]}>
              Score: {score.correct}
            </Animated.Text>
          </Animated.View>

          <Animated.View style={overlayStyle}>
            <View style={styles.feedbackContainer}>
              <Text style={[styles.overlayFeedbackText, { 
                fontSize: isLandscape ? height * 0.15 : 64 
              }]}>{feedbackText}</Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Show pre-game screen
  if (!gameStarted) {
    console.log('Rendering pre-game screen');
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar hidden />
        <LinearGradient
          colors={COLORS.gradient.primary}
          style={styles.container}
        >
          <Animated.View style={[styles.exitButtonContainer, exitButtonStyle]}>
            <TouchableOpacity 
              style={styles.exitButton} 
              onPress={() => handleButtonPress('exit', () => navigation.navigate('Home'))}
            >
              <Text style={styles.exitButtonText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
          
          <View style={styles.preGameContent}>
            <Animated.Text style={[styles.category, categoryStyle]}>
              {category}
            </Animated.Text>
            <Animated.Text style={[styles.timeText, timeTextStyle]}>
              {formatTime(timeLimit)}
            </Animated.Text>
            <Animated.View style={startButtonStyle}>
              <TouchableOpacity 
                style={styles.startButton} 
                onPress={() => handleButtonPress('start', startGame)}
              >
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (gameEnded) {
    console.log('Game ended, returning null');
    return null; // Return null since we're navigating away
  }

  console.log('Rendering main game screen');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar hidden />
      <LinearGradient
        colors={COLORS.gradient.primary}
        style={styles.container}
      >
        <Animated.View style={[styles.exitButtonContainer, exitButtonStyle]}>
          <TouchableOpacity 
            style={styles.exitButton} 
            onPress={() => handleButtonPress('exit', endGame)}
          >
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View style={[styles.wordContainer, wordStyle]}>
          <Text style={[styles.wordText, { fontSize: 64 }]}>{items[currentIndex]}</Text>
        </Animated.View>

        <Animated.View style={[styles.gameFooter, gameFooterStyle]}>
          <Animated.Text style={[styles.timer, timerStyle]}>
            {formatTime(timeLeft)}
          </Animated.Text>
          <Animated.Text style={[styles.score, scoreTextStyle]}>
            Score: {score.correct}
          </Animated.Text>
        </Animated.View>

        <Animated.View style={overlayStyle}>
          <View style={styles.feedbackContainer}>
            <Text style={[styles.overlayFeedbackText, { fontSize: 64 }]}>{feedbackText}</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  preGameContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
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
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding * 2,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
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
    fontSize: 42,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: SIZES.padding,
  },
  timeText: {
    ...FONTS.subtitle,
    color: COLORS.text,
    fontSize: 36,
    marginBottom: 50,
  },
  startButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: SIZES.padding * 3,
    paddingVertical: SIZES.padding,
  },
  startButtonText: {
    ...FONTS.button,
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  countdownText: {
    ...FONTS.title,
    color: COLORS.text,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    backfaceVisibility: 'visible',
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
    backgroundColor: 'transparent',
    paddingVertical: SIZES.padding,
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
    fontSize: 64,
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
  debugContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2000,
  },
  debugText: {
    color: COLORS.text,
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
    borderRadius: 5,
  },
  exitButtonContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
});

export default GameScreen; 