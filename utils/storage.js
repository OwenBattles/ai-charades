import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_DECKS = {
  animals: [
    'Lion', 'Elephant', 'Giraffe', 'Penguin', 'Kangaroo',
    'Dolphin', 'Tiger', 'Panda', 'Koala', 'Zebra'
  ],
  countries: [
    'United States', 'China', 'France', 'Brazil', 'Japan',
    'Italy', 'Australia', 'India', 'Canada', 'Mexico'
  ],
  'historical figures': [
    'Albert Einstein', 'Leonardo da Vinci', 'Marie Curie', 'Martin Luther King Jr.', 'Gandhi',
    'Nelson Mandela', 'William Shakespeare', 'Cleopatra', 'Mozart', 'Isaac Newton'
  ],
  cars: [
    'Ferrari', 'Lamborghini', 'Tesla', 'Porsche', 'BMW',
    'Mercedes-Benz', 'Toyota', 'Honda', 'Ford Mustang', 'Audi'
  ],
  celebrities: [
    'Tom Hanks', 'Jennifer Lawrence', 'Brad Pitt', 'Meryl Streep', 'Leonardo DiCaprio',
    'Beyoncé', 'Morgan Freeman', 'Julia Roberts', 'Will Smith', 'Emma Stone'
  ],
  movies: [
    'The Godfather', 'Star Wars', 'Titanic', 'Avatar', 'Jurassic Park',
    'The Matrix', 'Forrest Gump', 'The Lion King', 'Harry Potter', 'Inception'
  ]
};

const STORAGE_KEY = 'HEADS_UP_DECKS';

export const initializeDefaultDecks = async () => {
  try {
    const existingDecks = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existingDecks) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DECKS));
    }
  } catch (error) {
    console.error('Error initializing default decks:', error);
  }
};

export const getAllDecks = async () => {
  try {
    const decks = await AsyncStorage.getItem(STORAGE_KEY);
    return decks ? JSON.parse(decks) : DEFAULT_DECKS;
  } catch (error) {
    console.error('Error getting decks:', error);
    return DEFAULT_DECKS;
  }
};

export const saveDeck = async (name, items) => {
  try {
    const decks = await getAllDecks();
    const updatedDecks = {
      ...decks,
      [name.toLowerCase()]: items
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDecks));
    return true;
  } catch (error) {
    console.error('Error saving deck:', error);
    return false;
  }
};

export const deleteDeck = async (name) => {
  try {
    const decks = await getAllDecks();
    const isDefaultDeck = name.toLowerCase() in DEFAULT_DECKS;
    if (isDefaultDeck) {
      return false;
    }
    delete decks[name.toLowerCase()];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
    return true;
  } catch (error) {
    console.error('Error deleting deck:', error);
    return false;
  }
}; 