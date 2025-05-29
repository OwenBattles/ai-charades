import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  Keyboard,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolateColor,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import Logo from '../components/Logo';
import TimeSlider from '../components/TimeSlider';
import LoadingDeck from '../components/LoadingDeck';
import { defaultDecks } from '../data/defaultDecks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TILE_MARGIN = 8;
const TILES_PER_ROW = 2;
const TILE_WIDTH = (SCREEN_WIDTH- (SIZES.padding * 2) - (TILE_MARGIN * (TILES_PER_ROW + 1))) / TILES_PER_ROW;

const DECK_COLORS = [
  ['#6366f1', '#818cf8'], // Modern Indigo
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const HomeScreen = ({ navigation }) => {
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState(60);
  const [showTimeSelect, setShowTimeSelect] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Animated values
  const scrollY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const timeSelectY = useSharedValue(SCREEN_HEIGHT);
  const deckScales = useRef(Object.keys(defaultDecks).map(() => useSharedValue(1))).current;
  const logoScale = useSharedValue(1);
  const logoTranslateY = useSharedValue(0);
  const inputTranslateX = useSharedValue(0);
  const buttonRotateZ = useSharedValue(0);

  const resetAnimatedValues = () => {
    scale.value = 1;
    opacity.value = 1;
    timeSelectY.value = SCREEN_HEIGHT;
    logoScale.value = 1;
    logoTranslateY.value = 0;
    inputTranslateX.value = 0;
    buttonRotateZ.value = 0;
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      scrollY.value = y;
      
      // Logo animations
      logoScale.value = interpolate(
        y,
        [-50, 0, 100],
        [1.1, 1, 0.95],
        Extrapolate.CLAMP
      );
      logoTranslateY.value = interpolate(
        y,
        [-50, 0, 100],
        [10, 0, -10],
        Extrapolate.CLAMP
      );

      // Input field animation
      inputTranslateX.value = interpolate(
        y,
        [0, 100],
        [0, -5],
        Extrapolate.CLAMP
      );

      // Button rotation
      buttonRotateZ.value = interpolate(
        y,
        [-50, 0, 100],
        [-2, 0, 2],
        Extrapolate.CLAMP
      );
    },
  });

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value }
    ],
  }));

  const inputAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: inputTranslateX.value }
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotateZ: `${buttonRotateZ.value}deg` }
    ],
  }));

  useEffect(() => {
    const resetHomeScreen = () => {
      setCategory('');
      setShowTimeSelect(false);
      setIsGenerating(false);
      setIsCustomCategory(false);
      resetAnimatedValues();
    };

    const unsubscribe = navigation.addListener('focus', resetHomeScreen);
    return unsubscribe;
  }, [navigation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const timeSelectStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: timeSelectY.value }],
  }));

  const handleDefaultDeckSelect = (deckName) => {
    setCategory(deckName);
    setIsCustomCategory(false);
    showTimeSelectScreen();
  };

  const handleCustomCategorySubmit = () => {
    if (category.trim()) {
      setIsCustomCategory(true);
      showTimeSelectScreen();
    }
  };

  const showTimeSelectScreen = () => {
    Keyboard.dismiss();
    scale.value = withSpring(20, { damping: 15 });
    opacity.value = withTiming(0, { duration: 400 });
    timeSelectY.value = withSpring(0, { damping: 15 });
    setShowTimeSelect(true);
  };

  const handleStartGame = async () => {
    if (!category.trim()) return;

    if (isCustomCategory) {
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

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.items || !Array.isArray(data.items)) {
          throw new Error('Invalid response format');
        }

        navigation.navigate('Game', {
          items: shuffleArray(data.items),
          category: category,
          timeLimit: selectedTime,
        });
      } catch (error) {
        console.error('API Error:', error);
        Alert.alert(
          'Error',
          'The server is taking longer than expected. Please try again in a moment.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Use local deck
      navigation.navigate('Game', {
        items: shuffleArray(defaultDecks[category]),
        category: category,
        timeLimit: selectedTime,
      });
    }
  };

  const handleDeckPress = (deckName, index) => {
    deckScales[index].value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    handleDefaultDeckSelect(deckName);
  };

  const getDeckStyle = (index) => {
    const yOffset = index * TILE_WIDTH;
    return useAnimatedStyle(() => {
      const scale = deckScales[index].value;
      
      const translateY = interpolate(
        scrollY.value,
        [yOffset - SCREEN_HEIGHT, yOffset, yOffset + SCREEN_HEIGHT],
        [25, 0, -25], // Reduced movement range for subtler effect
        Extrapolate.CLAMP
      );

      return {
        transform: [
          { scale },
          { translateY }
        ],
      };
    });
  };

  if (isGenerating) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <LinearGradient
          colors={COLORS.gradient.primary}
          style={[styles.container, styles.loadingContainer]}
        >
          <LoadingDeck />
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient
        colors={COLORS.gradient.primary}
        style={styles.container}
      >
        <Animated.View style={[styles.mainContent, animatedStyle]}>
          <Animated.ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
          >
            <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
              <Logo />
            </Animated.View>
            
            <Animated.View style={[styles.customCategoryContainer, inputAnimatedStyle]}>
              <TextInput
                style={styles.input}
                placeholder="Enter a custom category"
                placeholderTextColor={COLORS.textSecondary}
                value={category}
                onChangeText={setCategory}
                onSubmitEditing={handleCustomCategorySubmit}
              />
              <Animated.View style={buttonAnimatedStyle}>
                <TouchableOpacity
                  style={[
                    styles.playButton,
                    !category.trim() && styles.playButtonDisabled
                  ]}
                  onPress={handleCustomCategorySubmit}
                  disabled={loading || !category.trim()}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.text} />
                  ) : (
                    <Text style={styles.playButtonText}>PLAY</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.defaultDecksContainer}>
              {Object.keys(defaultDecks).map((deckName, index) => (
                <AnimatedTouchable
                  key={deckName}
                  style={[
                    styles.defaultDeckTile,
                    useAnimatedStyle(() => {
                      const yOffset = index * (TILE_WIDTH + TILE_MARGIN);
                      return {
                        transform: [
                          { scale: deckScales[index].value },
                          {
                            translateY: interpolate(
                              scrollY.value,
                              [yOffset - SCREEN_HEIGHT, yOffset, yOffset + SCREEN_HEIGHT],
                              [15, 0, -15],
                              Extrapolate.CLAMP
                            )
                          },
                          {
                            rotateZ: `${interpolate(
                              scrollY.value,
                              [yOffset - 100, yOffset, yOffset + 100],
                              [-1, 0, 1],
                              Extrapolate.CLAMP
                            )}deg`
                          }
                        ]
                      };
                    })
                  ]}
                  onPress={() => handleDeckPress(deckName, index)}
                >
                  <LinearGradient
                    colors={DECK_COLORS[0]}
                    style={styles.deckGradient}
                  >
                    <Text style={styles.deckName}>{deckName}</Text>
                    <Text style={styles.deckCount}>
                      {defaultDecks[deckName].length} items
                    </Text>
                  </LinearGradient>
                </AnimatedTouchable>
              ))}
            </View>

          </Animated.ScrollView>
        </Animated.View>

        <Animated.View style={[styles.timeSelectContainer, timeSelectStyle]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              timeSelectY.value = withSpring(SCREEN_HEIGHT);
              scale.value = withSpring(1);
              opacity.value = withTiming(1);
              setShowTimeSelect(false);
              if (isCustomCategory) {
                setCategory('');
              }
            }}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.selectTimeText}>Select Time</Text>
          <TimeSlider 
            value={selectedTime}
            onValueChange={setSelectedTime} 
          />
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartGame}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding * 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: SIZES.padding * 3,
    marginBottom: SIZES.padding * 2,
  },
  customCategoryContainer: {
    width: '100%',
    marginTop: SIZES.padding,
  },
  input: {
    backgroundColor: COLORS.secondary,
    color: COLORS.text,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    ...FONTS.body,
    width: '100%',
  },
  playButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.padding * 2,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding,
    width: '100%',
    alignItems: 'center',
  },
  playButtonText: {
    ...FONTS.button,
    color: COLORS.text,
  },
  timeSelectContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 24,
  },
  selectTimeText: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.padding * 2,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginTop: 50,
    width: '80%',
    alignItems: 'center',
  },
  startButtonText: {
    ...FONTS.button,
    color: COLORS.text,
  },
  playButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.7,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SIZES.padding,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.textSecondary,
  },
  dividerText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginHorizontal: SIZES.padding,
  },
  defaultDecksContainer: {
    marginTop: SIZES.padding * 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: TILE_MARGIN,
  },
  defaultDeckTile: {
    width: TILE_WIDTH,
    height: TILE_WIDTH,
    marginBottom: TILE_MARGIN * 2,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  deckGradient: {
    flex: 1,
    padding: SIZES.padding,
    justifyContent: 'space-between',
  },
  deckName: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 24,
  },
  deckCount: {
    ...FONTS.body,
    color: COLORS.text,
    opacity: 0.8,
  },
});

export default HomeScreen; 