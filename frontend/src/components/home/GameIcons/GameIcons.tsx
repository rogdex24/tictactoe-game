import { StyleSheet, View } from 'react-native';
import SvgComponent, { Circle, Path } from 'react-native-svg';

import React from 'react';

import { colors } from '../../../styles/colors';
import { iconSizes } from '../../../styles/dimensions';

interface GameIconsProps {
  small?: boolean;
}

export const GameIcons: React.FC<GameIconsProps> = ({ small = false }) => {
  const circleSize = small ? 96 : iconSizes.homeCircle; // was 144
  const crossSize = small ? 110 : iconSizes.homeCross; // was 176
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <SvgComponent
        width={circleSize}
        height={circleSize}
        viewBox="0 0 100 100"
        style={[styles.icon, styles.circle]}
      >
        <Circle
          cx="50"
          cy="50"
          r="40"
          stroke={colors.surfacePrimary}
          strokeWidth="12"
          opacity={0.7}
          fill="none"
        />
      </SvgComponent>
      <SvgComponent
        width={crossSize}
        height={crossSize}
        viewBox="0 0 100 100"
        style={[styles.icon, styles.cross]}
      >
        <Path
          d="M20 20 L80 80"
          stroke={colors.surfacePrimary}
          strokeWidth="12"
          strokeLinecap="round"
          opacity={0.7}
        />
        <Path
          d="M80 20 L20 80"
          stroke={colors.surfacePrimary}
          strokeWidth="12"
          strokeLinecap="round"
          opacity={0.7}
        />
      </SvgComponent>
    </View>
  );
};

const styles = StyleSheet.create({
  icon: {
    position: 'absolute',
  },
  circle: {
    top: 0,
    left: -24,
    transform: [{ rotate: '15deg' }],
  },
  cross: {
    bottom: 0,
    right: -24,
    transform: [{ rotate: '-15deg' }],
  },
});
