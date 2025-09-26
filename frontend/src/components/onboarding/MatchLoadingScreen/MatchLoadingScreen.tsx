import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlayerStore } from '../../../state/usePlayerStore';
import { colors } from '../../../styles/colors';
import { layout, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { BackgroundGlow } from '../../home/BackgroundGlow';

export const MatchLoadingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayerStore();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    navigation.navigate('Home');
  };

  React.useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      navigation.navigate('Game');
    }, 3000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [navigation]);

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.screenBackground} />
      <BackgroundGlow />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.body}>
            <LoadingSpinner />
            <Text style={[typography.headingSecondary, styles.title]}>Finding a Player...</Text>
            <Text style={[typography.bodyPrimary, styles.subtitle]}>
              Hang tight, {playerName || 'Player'}! We’ll seat you at the next open board.
            </Text>
          </View>
          <View style={styles.footer}>
            <CustomButton label="Cancel" onPress={handleCancel} variant="danger" />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBackground,
    position: 'relative',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.hero,
    paddingBottom: spacing.hero,
    justifyContent: 'space-between',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textTealSoft,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  footer: {
    width: '100%',
    paddingTop: spacing.xl,
  },
});
