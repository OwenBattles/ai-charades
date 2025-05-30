import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
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
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import Logo from '../components/Logo';
import TimeSlider from '../components/TimeSlider';
import LoadingDeck from '../components/LoadingDeck';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [category, setCategory] = useState('');
  const [selectedTime, setSelectedTime] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);

  // Enhanced animated values
  const scrollY = useSharedValue(0);
  const logoScale = useSharedValue(1);
  const logoTranslateY = useSharedValue(0);
  const inputTranslateX = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const buttonRotateZ = useSharedValue(0);
  const inputScale = useSharedValue(1);
  const inputOpacity = useSharedValue(1);

  const resetAnimatedValues = () => {
    logoScale.value = 1;
    logoTranslateY.value = 0;
    inputTranslateX.value = 0;
    buttonRotateZ.value = 0;
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      
      // Parallax effect for logo
      logoTranslateY.value = event.contentOffset.y * 0.5;
      
      // Scale effect for logo based on scroll
      logoScale.value = interpolate(
        event.contentOffset.y,
        [0, 100],
        [1, 0.8],
        Extrapolate.CLAMP
      );
      
      // Input field animation based on scroll
      inputScale.value = interpolate(
        event.contentOffset.y,
        [0, 150],
        [1, 0.95],
        Extrapolate.CLAMP
      );
      
      inputOpacity.value = interpolate(
        event.contentOffset.y,
        [0, 150],
        [1, 0.8],
        Extrapolate.CLAMP
      );
    },
  });

  const handleButtonPress = (action) => {
    // Enhanced button press animation
    buttonScale.value = withSequence(
      withSpring(0.9, { damping: 4, stiffness: 400 }),
      withSpring(1.1, { damping: 4, stiffness: 400 }),
      withSpring(1, { damping: 6, stiffness: 400 })
    );
    
    buttonRotateZ.value = withSequence(
      withSpring(-0.1, { damping: 4, stiffness: 400 }),
      withSpring(0.1, { damping: 4, stiffness: 400 }),
      withSpring(0, { damping: 6, stiffness: 400 })
    );
    
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Execute the action after animation
    setTimeout(() => action(), 200);
  };

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value }
    ],
  }));

  const inputStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: inputScale.value },
      { translateX: inputTranslateX.value }
    ],
    opacity: inputOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: buttonScale.value },
      { rotateZ: `${buttonRotateZ.value}rad` }
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
        category: category.trim(),
        isCustomCategory: true,
        onComplete: (selectedTime) => {
          console.log('Time selected for default category flow:', selectedTime);
          // This won't be called for custom categories since they navigate directly to Game
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
            <Animated.View style={[styles.logoContainer, logoStyle]}>
              <Logo />
            </Animated.View>
            
            <Animated.View style={[styles.customCategoryContainer, inputStyle]}>
              <TextInput
                style={styles.input}
                placeholder="Enter a custom category"
                placeholderTextColor={COLORS.textSecondary}
                value={category}
                onChangeText={setCategory}
                onSubmitEditing={handleCustomCategorySubmit}
              />
              <Animated.View style={buttonStyle}>
                <AnimatedTouchableOpacity
                  style={[
                    styles.playButton,
                    !category.trim() && styles.playButtonDisabled
                  ]}
                  onPress={() => handleButtonPress(() => {
                    if (category) {
                      navigation.navigate('TimeSelect', {
                        onComplete: (time) => {
                          setIsGenerating(true);
                          generateCustomDeck(category, time);
                        },
                      });
                    }
                  })}
                  disabled={isGenerating || !category.trim()}
                >
                  {isGenerating ? (
                    <ActivityIndicator color={COLORS.text} />
                  ) : (
                    <Text style={styles.playButtonText}>PLAY</Text>
                  )}
                </AnimatedTouchableOpacity>
              </Animated.View>
            </Animated.View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <AnimatedTouchableOpacity
              style={[styles.defaultDecksButton, buttonStyle]}
              onPress={() => handleButtonPress(() => navigation.navigate('SavedDecks'))}
            >
              <Text style={styles.defaultDecksButtonText}>Play Default Decks</Text>
            </AnimatedTouchableOpacity>

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
    marginVertical: SIZES.padding * 2,
    paddingHorizontal: SIZES.padding,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.textSecondary,
    opacity: 0.3,
  },
  dividerText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginHorizontal: SIZES.padding,
    fontSize: 16,
  },
  defaultDecksButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.padding * 2,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.padding,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.padding,
  },
  defaultDecksButtonText: {
    ...FONTS.button,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HomeScreen; 