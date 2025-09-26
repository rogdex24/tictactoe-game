import { StyleSheet, View } from 'react-native';

import React from 'react';

import { colors } from '../../../styles/colors';

export const BackgroundGlow: React.FC = () => {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, styles.glowTopLeft]} />
      <View style={[styles.glow, styles.glowBottomRight]} />
      <View style={[styles.glow, styles.glowCenter]} />
    </View>
  );
};

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.28,
  },
  glowTopLeft: {
    width: 320,
    height: 320,
    backgroundColor: colors.accentCoral,
    top: -120,
    left: -120,
  },
  glowBottomRight: {
    width: 260,
    height: 260,
    backgroundColor: colors.accentSky,
    bottom: -80,
    right: -80,
  },
  glowCenter: {
    width: 200,
    height: 200,
    backgroundColor: colors.accentSun,
    top: '35%',
    right: '15%',
  },
});
