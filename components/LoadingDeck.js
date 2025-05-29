import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { COLORS, FONTS } from '../constants/theme';

const LoadingDeck = () => {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);

  useEffect(() => {
    const duration = 600;
    scale1.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration }),
        withTiming(1, { duration })
      ),
      -1
    );
    scale2.value = withRepeat(
      withSequence(
        withDelay(200,
          withTiming(1.2, { duration }),
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
          withTiming(1.2, { duration }),
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...FONTS.title,
    color: COLORS.text,
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    marginHorizontal: 5,
  },
});

export default LoadingDeck; 