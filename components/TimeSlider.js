import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

const TimeSlider = ({ onValueChange, value = 60 }) => {
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleIncrement = () => {
    const newValue = Math.min(180, value + 30);
    onValueChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(30, value - 30);
    onValueChange(newValue);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleDecrement}
        disabled={value <= 30}
      >
        <Text style={[styles.buttonText, value <= 30 && styles.buttonTextDisabled]}>−</Text>
      </TouchableOpacity>
      
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{formatTime(value)}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleIncrement}
        disabled={value >= 180}
      >
        <Text style={[styles.buttonText, value >= 180 && styles.buttonTextDisabled]}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...FONTS.title,
    fontSize: 36,
    color: COLORS.text,
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  timeContainer: {
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    ...FONTS.title,
    fontSize: 48,
    color: COLORS.text,
  },
});

export default TimeSlider; 