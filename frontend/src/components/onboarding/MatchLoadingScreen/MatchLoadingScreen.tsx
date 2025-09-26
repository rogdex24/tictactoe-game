import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../../styles/colors';
import { layout, radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import { BackgroundGlow } from '../../home/BackgroundGlow';

export const MatchLoadingScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleCancel = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.cardWrapper}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={styles.card}
          >
            <BackgroundGlow />
            <View style={styles.cardContent}>
              <View style={styles.body}>
                <LoadingSpinner />
                <Text style={[typography.headingSecondary, styles.title]}>Finding a Player...</Text>
                <Text style={[typography.bodyPrimary, styles.subtitle]}>Please wait a moment.</Text>
              </View>
              <View style={styles.footer}>
                <CustomButton label="Cancel" onPress={handleCancel} variant="secondary" />
              </View>
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </View>
  );
};

const cardHeight = Math.min(
  layout.screenHeight * layout.homeCardHeightRatio,
  layout.homeCardMaxHeight,
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  cardWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: layout.homeCardMaxWidth,
    height: cardHeight,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 24 },
    shadowRadius: 60,
    elevation: 24,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
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
    paddingBottom: spacing.md,
  },
});
