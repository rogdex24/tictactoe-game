import { StyleSheet, View } from 'react-native';

import React from 'react';
import SvgComponent, { Circle, Line } from 'react-native-svg';

import { colors } from '../../../styles/colors';
import { iconSizes } from '../../../styles/dimensions';

export const GameIcons: React.FC = () => {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SvgComponent
        width={iconSizes.large}
        height={iconSizes.large}
        viewBox="0 0 120 120"
        style={[styles.icon, styles.iconTopLeft]}
      >
        <Circle
          cx="60"
          cy="60"
          r="46"
          stroke={colors.surfacePrimary}
          strokeWidth="12"
          fill="transparent"
          opacity={0.9}
        />
      </SvgComponent>
      <SvgComponent
        width={iconSizes.medium}
        height={iconSizes.medium}
        viewBox="0 0 120 120"
        style={[styles.icon, styles.iconBottomLeft]}
      >
        <Line
          x1="20"
          y1="20"
          x2="100"
          y2="100"
          stroke={colors.surfacePrimary}
          strokeWidth="12"
          strokeLinecap="round"
        />
        <Line
          x1="100"
          y1="20"
          x2="20"
          y2="100"
          stroke={colors.surfacePrimary}
          strokeWidth="12"
          strokeLinecap="round"
        />
      </SvgComponent>
      <SvgComponent
        width={iconSizes.medium}
        height={iconSizes.medium}
        viewBox="0 0 120 120"
        style={[styles.icon, styles.iconTopRight]}
      >
        <Circle
          cx="60"
          cy="60"
          r="40"
          stroke={colors.surfacePrimary}
          strokeWidth="10"
          fill="transparent"
          opacity={0.75}
        />
      </SvgComponent>
    </View>
  );
};

const styles = StyleSheet.create({
  icon: {
    position: 'absolute',
  },
  iconTopLeft: {
    top: 64,
    left: -40,
    transform: [{ rotate: '12deg' }],
  },
  iconBottomLeft: {
    bottom: 24,
    left: 32,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.7,
  },
  iconTopRight: {
    top: 120,
    right: -24,
    transform: [{ rotate: '-6deg' }],
  },
});
