import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlayerStore } from '../../../state/usePlayerStore';
import { colors } from '../../../styles/colors';
import { layout, radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { BackButton } from '../../common/BackButton';
import { CustomButton } from '../../common/CustomButton';
import { BackgroundGlow } from '../../home/BackgroundGlow';

export const PlayerNameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName, setPlayerName } = usePlayerStore();
  const [name, setName] = React.useState(playerName);

  React.useEffect(() => {
    setName(playerName);
  }, [playerName]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleContinue = () => {
    const trimmedName = name.trim();
    const nextName = trimmedName.length > 0 ? trimmedName : 'Player';

    setPlayerName(nextName);
    navigation.navigate('MatchLoading');
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
              <View style={styles.headerRow}>
                <BackButton onPress={handleBack} />
              </View>
              <View style={styles.body}>
                <Text style={[typography.headingPrimary, styles.title]}>What’s your name?</Text>
                <TextInput
                  autoCapitalize="words"
                  autoComplete="name"
                  autoCorrect={false}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                  selectionColor={colors.accentMint}
                  style={styles.input}
                  value={name}
                />
              </View>
              <View style={styles.footer}>
                <CustomButton label="Continue" onPress={handleContinue} />
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
  headerRow: {
    alignItems: 'flex-start',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  input: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceOverlay,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyRegular,
    fontSize: 18,
    lineHeight: 24,
  },
  footer: {
    paddingTop: spacing.lg,
  },
});
