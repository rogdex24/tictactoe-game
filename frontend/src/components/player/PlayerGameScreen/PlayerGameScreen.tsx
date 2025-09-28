import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePlayer } from '../../../state/PlayerContext';
import { colors } from '../../../styles/colors';
import { layout, radius, spacing } from '../../../styles/dimensions';
import { typography } from '../../../styles/typography';
import type { RootStackParamList } from '../../../types/components';
import { CustomButton } from '../../common/CustomButton';
import { TextButton } from '../../common/TextButton';
import { GameBoard, GameSymbol } from '../../game/GameBoard';
import { BackgroundGlow } from '../../home/BackgroundGlow';

type PlayerMark = 'X' | 'O';

const MARK_OPTIONS: PlayerMark[] = ['X', 'O'];

export const PlayerGameScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { playerName } = usePlayer();
  const displayName = playerName.trim().length > 0 ? playerName.trim() : 'Player';

  const [selectedMark, setSelectedMark] = React.useState<PlayerMark>('X');
  const [boardState, setBoardState] = React.useState<(PlayerMark | null)[]>(Array(9).fill(null));

  const handleCellPress = React.useCallback(
    (index: number) => {
      setBoardState((previous) => {
        const next = [...previous];
        next[index] = selectedMark;
        return next;
      });
    },
    [selectedMark],
  );

  const handleResetBoard = React.useCallback(() => {
    setBoardState(Array(9).fill(null));
  }, []);

  const handleBackHome = React.useCallback(() => {
    navigation.navigate('Home');
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
          <View style={styles.header}>
            <Text style={[typography.headingSecondary, styles.title]}>Player Mode Preview</Text>
            <Text style={[typography.bodyPrimary, styles.subtitle]}>
              Multiplayer matches are on the way. Use the board below to stage moves that we will
              sync with the server soon.
            </Text>
            <Text style={[typography.bodyPrimary, styles.playerTag]}>
              Signed in as {displayName}
            </Text>
          </View>
          <View style={styles.body}>
            <View style={styles.selector}>
              <Text style={[typography.bodyPrimary, styles.selectorLabel]}>
                Choose the next mark
              </Text>
              <View style={styles.selectorOptions}>
                {MARK_OPTIONS.map((mark) => (
                  <Pressable
                    key={mark}
                    accessibilityHint={`Set the next placement to ${mark}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedMark === mark }}
                    onPress={() => setSelectedMark(mark)}
                    style={({ pressed }) => [
                      styles.selectorOption,
                      selectedMark === mark && styles.selectorOptionActive,
                      pressed && styles.selectorOptionPressed,
                    ]}
                  >
                    <View style={styles.selectorIcon}>
                      <GameSymbol mark={mark} />
                    </View>
                    <Text
                      style={[
                        typography.bodyPrimary,
                        styles.selectorOptionText,
                        selectedMark === mark && styles.selectorOptionTextActive,
                      ]}
                    >
                      {mark === 'X' ? 'Cross' : 'Circle'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[typography.bodyPrimary, styles.selectorHint]}>
                Tap a square to place your selected mark.
              </Text>
            </View>
            <GameBoard cells={boardState} onCellPress={handleCellPress} />
            <Text style={[typography.bodyPrimary, styles.boardNote]}>
              We will share this board state with your opponent once matchmaking is live.
            </Text>
          </View>
          <View style={styles.footer}>
            <CustomButton label="Back to Home" onPress={handleBackHome} />
            <TextButton label="Clear Board" onPress={handleResetBoard} style={styles.resetButton} />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.hero,
    paddingBottom: spacing.hero,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textTealSoft,
    textAlign: 'center',
  },
  playerTag: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamilyBold,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  selector: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectorLabel: {
    color: colors.textSecondary,
  },
  selectorOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceOverlay,
  },
  selectorOptionPressed: {
    backgroundColor: colors.borderTealSoft,
  },
  selectorOptionActive: {
    backgroundColor: colors.accentTealOverlay,
    borderWidth: 1,
    borderColor: colors.accentTealBorder,
    shadowColor: colors.accentTeal,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  selectorIcon: {
    width: 28,
    height: 28,
  },
  selectorOptionText: {
    color: colors.textSecondary,
  },
  selectorOptionTextActive: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyBold,
  },
  selectorHint: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  boardNote: {
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  footer: {
    width: '100%',
    paddingTop: spacing.lg,
  },
  resetButton: {
    marginTop: spacing.sm,
  },
});
