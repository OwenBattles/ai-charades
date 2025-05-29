import { Platform } from 'react-native';

export const COLORS = {
  primary: '#001F54',
  secondary: '#034078',
  accent: '#1282A2',
  highlight: '#0A7BC2',
  background: '#0A1128',
  text: '#FEFCFB',
  textSecondary: '#A9A9A9',
  success: '#28A745',
  error: '#DC3545',
  disabled: 'rgba(169, 169, 169, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  gradient: {
    primary: ['#001F54', '#034078', '#1282A2'],
    secondary: ['#0A1128', '#001F54'],
    accent: ['#1282A2', '#0A7BC2']
  }
};

export const FONTS = {
  title: Platform.select({
    ios: {
      fontFamily: 'System',
      fontWeight: '700',
      fontSize: 32,
    },
    android: {
      fontFamily: 'sans-serif',
      fontWeight: '700',
      fontSize: 32,
    },
  }),
  subtitle: Platform.select({
    ios: {
      fontFamily: 'System',
      fontWeight: '600',
      fontSize: 24,
    },
    android: {
      fontFamily: 'sans-serif',
      fontWeight: '600',
      fontSize: 24,
    },
  }),
  body: Platform.select({
    ios: {
      fontFamily: 'System',
      fontWeight: '400',
      fontSize: 16,
      lineHeight: 24,
    },
    android: {
      fontFamily: 'sans-serif',
      fontWeight: '400',
      fontSize: 16,
      lineHeight: 24,
    },
  }),
  button: Platform.select({
    ios: {
      fontFamily: 'System',
      fontWeight: '600',
    },
    android: {
      fontFamily: 'sans-serif',
      fontWeight: '600',
    },
  }),
};

export const SIZES = {
  padding: 20,
  radius: 12,
  buttonHeight: 56,
  iconSize: {
    small: 16,
    medium: 24,
    large: 32,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  }
}; 