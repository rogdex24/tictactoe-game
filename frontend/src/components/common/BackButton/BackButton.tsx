import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import React from 'react';

import { colors } from '../../../styles/colors';
import { radius, spacing } from '../../../styles/dimensions';

type BackButtonProps = {
  onPress: () => void;
};

export const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <Svg height={24} viewBox="0 0 24 24" width={24}>
        <Path
          d="M14.5 6.5L9 12l5.5 5.5"
          fill="none"
          stroke={colors.accentMint}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </Svg>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
