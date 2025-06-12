import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { defaultDecks } from '../data/defaultDecks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_MARGIN = 12;
const TILES_PER_ROW = 2;
const TOTAL_HORIZONTAL_PADDING = SIZES.padding * 2;
const TOTAL_MARGIN = TILE_MARGIN * (TILES_PER_ROW + 1);
const TILE_WIDTH = (SCREEN_WIDTH - TOTAL_HORIZONTAL_PADDING - TOTAL_MARGIN) / TILES_PER_ROW;

const STORAGE_KEY = '@saved_decks';
const DECK_COLORS = [[COLORS.accent, COLORS.accent]];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const SavedDecksScreen = ({ navigation }) => {
  // State management
  const [savedDecks, setSavedDecks] = useState({...defaultDecks});
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckCategory, setNewDeckCategory] = useState('');
  const [selectedTime] = useState(60);

  // Animation values
  const scrollY = useSharedValue(0);
  const activeScale = useSharedValue(-1);

  // Create a single animated style that can be reused
  const getAnimatedStyle = useAnimatedStyle(() => {
    const scale = activeScale.value >= 0 ? 
      withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 100 })
      ) : 1;

    return {
      transform: [{ scale }],
    };
  });

  // Calculate static styles outside of the render loop
  const getDeckStyle = (index) => {
    const row = Math.floor(index / TILES_PER_ROW);
    const yOffset = row * (TILE_WIDTH + TILE_MARGIN);
    
    return {
      transform: [{
        translateY: interpolate(
          scrollY.value,
          [yOffset - SCREEN_WIDTH, yOffset, yOffset + SCREEN_WIDTH],
          [15, 0, -15],
          Extrapolate.CLAMP
        )
      }]
    };
  };

  // Load saved decks on mount
  useEffect(() => {
    loadSavedDecks();
  }, []);

  // Add portrait lock effect
  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
    lockOrientation();
  }, []);

  const loadSavedDecks = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedDecks = JSON.parse(saved);
        setSavedDecks(prevDecks => ({...defaultDecks, ...parsedDecks}));
      }
    } catch (error) {
      console.error('Error loading saved decks:', error);
    }
  };

  const deleteDeck = useCallback(async (deckName) => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (!saved) return false;

      const savedDecks = JSON.parse(saved);
      if (!savedDecks[deckName]) return false;

      delete savedDecks[deckName];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedDecks));
      
      setSavedDecks(prevDecks => {
        const newDecks = { ...prevDecks };
        delete newDecks[deckName];
        return newDecks;
      });

      return true;
    } catch (error) {
      console.error('Error deleting deck:', error);
      return false;
    }
  }, []);

  const handleLongPress = useCallback(async (deckName) => {
    // Don't allow deletion of default decks
    if (defaultDecks.hasOwnProperty(deckName)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Cannot Delete', 'Default decks cannot be deleted.');
      return;
    }

    // Trigger haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      'Delete Deck',
      `Are you sure you want to delete "${deckName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteDeck(deckName);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', 'Failed to delete deck');
            }
          },
        },
      ]
    );
  }, [deleteDeck]);

  const saveDeck = async (name, items) => {
    try {
      // Format the items to match the default deck format
      const formattedItems = items.map(item => 
        typeof item === 'string' ? item.trim() : item
      );

      const saved = await AsyncStorage.getItem(STORAGE_KEY) || '{}';
      const savedDecks = JSON.parse(saved);
      savedDecks[name] = formattedItems;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(savedDecks));
      setSavedDecks(prevDecks => ({...prevDecks, [name]: formattedItems}));
      return true;
    } catch (error) {
      console.error('Error saving deck:', error);
      return false;
    }
  };

  const handleGenerateAndSave = async () => {
    if (!newDeckName.trim() || !newDeckCategory.trim()) {
      Alert.alert('Error', 'Please enter both a deck name and category');
      return;
    }

    if (savedDecks[newDeckName]) {
      Alert.alert('Error', 'A deck with this name already exists');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('https://charaids.onrender.com/generate-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: newDeckCategory.trim(),
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

      const success = await saveDeck(newDeckName, data.items);
      if (success) {
        Alert.alert('Success', 'New deck has been created and saved!');
        setShowAddModal(false);
        setNewDeckName('');
        setNewDeckCategory('');
      } else {
        Alert.alert('Error', 'Failed to save the deck');
      }
    } catch (error) {
      console.error('API Error:', error);
      Alert.alert(
        'Error',
        'Failed to generate deck. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const handleDeckPress = (deckName, index) => {
    activeScale.value = index;
    setTimeout(() => {
      activeScale.value = -1;
    }, 200);

    navigation.navigate('TimeSelect', {
      onComplete: (time) => {
        navigation.navigate('Game', {
          items: shuffleArray(savedDecks[deckName]),
          category: deckName,
          timeLimit: time,
        });
      },
      defaultTime: selectedTime,
    });
  };

  const formatDeckName = (name) => {
    const words = name.split(' ');
    if (words.length <= 2) return name;
    const midPoint = Math.ceil(words.length / 2);
    const firstLine = words.slice(0, midPoint).join(' ');
    const secondLine = words.slice(midPoint).join(' ');
    return `${firstLine}\n${secondLine}`;
  };

  const renderDeckTile = useCallback(({ deckName, index }) => {
    const isCustomDeck = !defaultDecks.hasOwnProperty(deckName);

    return (
      <View 
        key={deckName} 
        style={styles.tileWrapper}
      >
        <Animated.View
          style={[
            styles.tileContainer,
            getAnimatedStyle,
            { transform: getDeckStyle(index).transform }
          ]}
        >
          <Pressable
            onPress={() => handleDeckPress(deckName, index)}
            onLongPress={() => handleLongPress(deckName)}
            delayLongPress={500}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
            style={({ pressed }) => [
              styles.deckTile,
              pressed && styles.deckTilePressed,
              isCustomDeck && styles.customDeckTile,
            ]}
          >
            <LinearGradient
              colors={DECK_COLORS[0]}
              style={styles.deckTileGradient}
            >
              <Text style={styles.deckTileText} numberOfLines={2} adjustsFontSizeToFit>
                {formatDeckName(deckName)}
              </Text>
              {isCustomDeck && (
                <View style={styles.customDeckIndicator} />
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    );
  }, [handleDeckPress, handleLongPress, getAnimatedStyle, getDeckStyle]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <LinearGradient colors={COLORS.gradient.primary} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Saved Decks</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          <View style={styles.decksGrid}>
            {Object.keys(savedDecks).map((deckName, index) => (
              renderDeckTile({ deckName, index })
            ))}
          </View>
        </Animated.ScrollView>

        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create New AI Deck</Text>
              
              <TextInput
                style={styles.modalInput}
                placeholder="Deck Name"
                placeholderTextColor={COLORS.textSecondary}
                value={newDeckName}
                onChangeText={setNewDeckName}
              />
              
              <TextInput
                style={styles.modalInput}
                placeholder="Category to Generate"
                placeholderTextColor={COLORS.textSecondary}
                value={newDeckCategory}
                onChangeText={setNewDeckCategory}
              />

              {isGenerating ? (
                <ActivityIndicator color={COLORS.accent} size="large" />
              ) : (
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowAddModal(false);
                      setNewDeckName('');
                      setNewDeckCategory('');
                    }}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.generateButton]}
                    onPress={handleGenerateAndSave}
                  >
                    <Text style={styles.modalButtonText}>Generate & Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SIZES.padding * 4,
    paddingHorizontal: SIZES.padding,
  },
  decksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    width: '100%',
  },
  tileWrapper: {
    width: `${100 / TILES_PER_ROW}%`,
    paddingHorizontal: TILE_MARGIN / 2,
    marginBottom: TILE_MARGIN,
  },
  tileContainer: {
    width: '100%',
    aspectRatio: 1,
  },
  deckTile: {
    flex: 1,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4.84,
  },
  deckTileGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.padding,
    width: '100%',
    position: 'relative',
  },
  deckTileText: {
    ...FONTS.body,
    color: COLORS.text,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    width: '100%',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.padding * 2,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    ...FONTS.title,
    color: COLORS.text,
    fontSize: 24,
    marginBottom: SIZES.padding,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: COLORS.secondary,
    color: COLORS.text,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: SIZES.padding,
    ...FONTS.body,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.padding,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.padding / 2,
  },
  cancelButton: {
    backgroundColor: COLORS.secondary,
  },
  generateButton: {
    backgroundColor: COLORS.accent,
  },
  modalButtonText: {
    ...FONTS.button,
    color: COLORS.text,
    textAlign: 'center',
  },
  customDeckTile: {
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  customDeckIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.text,
    opacity: 0.5,
  },
  deckTilePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

export default SavedDecksScreen;