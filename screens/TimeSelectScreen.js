import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import TimeSlider from '../components/TimeSlider';
import LoadingDeck from '../components/LoadingDeck';

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const TimeSelectScreen = ({ route, navigation }) => {
  const { onComplete, defaultTime = 60, category, isCustomCategory = false } = route.params;
  const [selectedTime, setSelectedTime] = useState(defaultTime);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStart = async () => {
    if (isCustomCategory && category) {
      // For custom categories, call API and show generating animation
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

        console.log('Navigating to Game with items:', data.items.length);
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
      // For default categories, just call the callback
      onComplete(selectedTime);
    }
  };

  if (isGenerating) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={COLORS.gradient.primary} style={styles.gradient}>
          <LoadingDeck />
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={COLORS.gradient.primary} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select Time</Text>
        </View>

        <View style={styles.content}>
          <TimeSlider 
            value={selectedTime}
            onValueChange={setSelectedTime}
          />

          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : SIZES.padding * 2,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.padding,
  },
  backButtonText: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 24,
  },
  title: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.padding * 2,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.padding * 2,
    borderRadius: SIZES.radius,
    width: '100%',
    alignItems: 'center',
    marginTop: SIZES.padding * 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButtonText: {
    ...FONTS.button,
    color: COLORS.text,
    fontSize: 20,
  },
});

export default TimeSelectScreen; 