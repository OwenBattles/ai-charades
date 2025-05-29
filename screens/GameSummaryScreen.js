import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES } from '../constants/theme';

const GameSummaryScreen = ({ route, navigation }) => {
  const { score, items, correctItems, skippedItems } = route.params;

  const isCorrect = (item) => correctItems.includes(item);
  const isSkipped = (item) => skippedItems.includes(item);

  return (
    <LinearGradient colors={COLORS.gradient.primary} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.scoreText}>Final Score: {score}</Text>
      </View>
      
      <ScrollView style={styles.wordList} contentContainerStyle={styles.wordListContent}>
        {items.map((item, index) => (
          <View
            key={index}
            style={[
              styles.wordItem,
              isCorrect(item) && styles.correctWord,
              isSkipped(item) && styles.skippedWord,
            ]}
          >
            <Text
              style={[
                styles.wordText,
                isCorrect(item) && styles.correctWordText,
                isSkipped(item) && styles.skippedWordText,
              ]}
            >
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.playAgainButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.playAgainText}>Play Again</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SIZES.padding * 2,
  },
  header: {
    alignItems: 'center',
    padding: SIZES.padding,
  },
  scoreText: {
    ...FONTS.h1,
    color: COLORS.text,
    marginBottom: SIZES.padding,
  },
  wordList: {
    flex: 1,
    padding: SIZES.padding,
  },
  wordListContent: {
    paddingBottom: SIZES.padding * 2,
  },
  wordItem: {
    backgroundColor: COLORS.secondary,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding / 2,
  },
  correctWord: {
    backgroundColor: COLORS.success,
  },
  skippedWord: {
    backgroundColor: COLORS.secondary,
    opacity: 0.6,
  },
  wordText: {
    ...FONTS.body,
    color: COLORS.text,
    textAlign: 'center',
  },
  correctWordText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  skippedWordText: {
    color: COLORS.textSecondary,
  },
  playAgainButton: {
    backgroundColor: COLORS.accent,
    margin: SIZES.padding,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  playAgainText: {
    ...FONTS.button,
    color: COLORS.text,
  },
});

export default GameSummaryScreen; 