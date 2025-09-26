import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import React from 'react';

import { colors } from '../../../styles/colors';
import { radius } from '../../../styles/dimensions';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  accessibilityLabel,
  style,
}) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    android_ripple={{ color: colors.borderSubtle, borderless: true }}
    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
    onPress={onPress}
    style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
  >
    {icon}
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
