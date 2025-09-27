import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import React from 'react';

import { colors } from '../../../styles/colors';
import { spacing } from '../../../styles/dimensions';

const SPINNER_SIZE = 80;
const STROKE_WIDTH = 10;
const RADIUS = (SPINNER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const LoadingSpinner: React.FC = () => {
  const rotation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      style={[styles.spinner, { transform: [{ rotate }] }]}
    >
      <Svg
        height={SPINNER_SIZE}
        width={SPINNER_SIZE}
        viewBox={`0 0 ${SPINNER_SIZE} ${SPINNER_SIZE}`}
      >
        <Circle
          cx={SPINNER_SIZE / 2}
          cy={SPINNER_SIZE / 2}
          r={RADIUS}
          stroke={colors.accentMint}
          strokeOpacity={0.2}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={SPINNER_SIZE / 2}
          cy={SPINNER_SIZE / 2}
          r={RADIUS}
          stroke={colors.accentMint}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * 0.65} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * 0.2}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  spinner: {
    marginBottom: spacing.lg,
  },
});
