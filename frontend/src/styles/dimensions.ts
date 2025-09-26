import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  hero: 64,
};

export const radius = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  pill: 999,
};

export const layout = {
  screenWidth: width,
  screenHeight: height,
  maxContentWidth: 420,
};

export const iconSizes = {
  homeCircle: 144,
  homeCross: 176,
};

export const offsets = {
  homeGraphicLift: -64,
};
