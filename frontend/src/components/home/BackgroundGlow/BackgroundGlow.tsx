import { StyleSheet, View } from 'react-native';

import React from 'react';

import { colors } from '../../../styles/colors';

export const BackgroundGlow: React.FC = () => {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={[styles.glow, styles.topGlow]} />
      <View style={[styles.glow, styles.bottomGlow]} />
    </View>
  );
};

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    borderRadius: 999,
  },
  topGlow: {
    width: 256,
    height: 256,
    backgroundColor: colors.glowTeal,
    opacity: 0.5,
    top: 0,
    left: '50%',
    marginLeft: -128,
    marginTop: -128,
  },
  bottomGlow: {
    width: 288,
    height: 288,
    backgroundColor: colors.glowTeal,
    opacity: 0.6,
    bottom: 0,
    right: '50%',
    marginRight: -144,
    marginBottom: -144,
  },
});
