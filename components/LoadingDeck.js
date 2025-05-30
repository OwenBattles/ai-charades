import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const LoadingDeck = () => {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);

  useEffect(() => {
    const duration = 600;
    scale1.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration }),
        withTiming(1, { duration })
      ),
      -1
    );
    scale2.value = withRepeat(
      withSequence(
        withDelay(200,
          withTiming(1.4, { duration }),
        ),
        withDelay(200,
          withTiming(1, { duration })
        )
      ),
      -1
    );
    scale3.value = withRepeat(
      withSequence(
        withDelay(400,
          withTiming(1.4, { duration }),
        ),
        withDelay(400,
          withTiming(1, { duration })
        )
      ),
      -1
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Generating Deck</Text>
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
        <Animated.View style={[styles.dot, dot3Style]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: 30,
    fontSize: 28,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: COLORS.accent,
    marginHorizontal: 8,
  },
});

export default LoadingDeck; 