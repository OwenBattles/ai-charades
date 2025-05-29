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
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import Logo from '../components/Logo';
import TimeSlider from '../components/TimeSlider';
import LoadingDeck from '../components/LoadingDeck';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [selectedTime, setSelectedTime] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);

  // Animated values
  const scrollY = useSharedValue(0);
  const logoScale = useSharedValue(1);
  const logoTranslateY = useSharedValue(0);
  const inputTranslateX = useSharedValue(0);
  const buttonRotateZ = useSharedValue(0);

  const resetAnimatedValues = () => {
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
      setIsGenerating(false);
      resetAnimatedValues();
    };

    const unsubscribe = navigation.addListener('focus', resetHomeScreen);
    return unsubscribe;
  }, [navigation]);

  const handleCustomCategorySubmit = () => {
    console.log('handleCustomCategorySubmit called with category:', category);
    if (category.trim()) {
      console.log('Navigating to TimeSelect screen');
      navigation.navigate('TimeSelect', {
        defaultTime: 60,
        onComplete: (selectedTime) => {
          console.log('Time selected:', selectedTime);
          // Navigate to GameScreen in preview mode (don't call API yet)
          navigation.navigate('Game', {
            category: category.trim(),
            timeLimit: selectedTime,
            isCustomCategory: true,
            items: [] // Empty items array - will be populated after API call
          });
        }
      });
    } else {
      console.log('No category entered, not showing time select');
    }
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
        <View style={styles.mainContent}>
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
                  disabled={isGenerating || !category.trim()}
                >
                  {isGenerating ? (
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

            <Animated.View style={[styles.defaultDecksButtonContainer, buttonAnimatedStyle]}>
              <TouchableOpacity
                style={styles.defaultDecksButton}
                onPress={() => navigation.navigate('SavedDecks')}
              >
                <Text style={styles.defaultDecksButtonText}>Play Default Decks</Text>
              </TouchableOpacity>
            </Animated.View>

          </Animated.ScrollView>
        </View>
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
  defaultDecksButtonContainer: {
    marginTop: SIZES.padding * 2,
    alignItems: 'center',
  },
  defaultDecksButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.padding * 2,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding,
    width: '80%',
    alignItems: 'center',
  },
  defaultDecksButtonText: {
    ...FONTS.button,
    color: COLORS.text,
  },
});

export default HomeScreen; 