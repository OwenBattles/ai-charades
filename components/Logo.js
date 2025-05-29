import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

const Logo = ({ size = 'large' }) => {
  const scale = size === 'large' ? 1 : 0.7;
  
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { fontSize: 48 * scale }]}>
        char
        <Text style={[styles.highlight, { fontSize: 48 * scale }]}>a.i.</Text>
        ds
      </Text>
      <Text style={[styles.subtitle, { fontSize: 14 * scale }]}>
        Charades powered by A.I.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  text: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 48,
    letterSpacing: 1,
  },
  highlight: {
    ...FONTS.title,
    color: COLORS.accent,
    fontSize: 48,
    letterSpacing: 1,
  },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 5,
  }
});

export default Logo; 