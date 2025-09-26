import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { HomeScreen } from './src/components/home/HomeScreen';
import { colors } from './src/styles/colors';
import { spacing } from './src/styles/dimensions';
import { typography } from './src/styles/typography';
import type { RootStackParamList } from './src/types/components';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* noop - the splash screen might already be hidden */
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const GameScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.gameSafeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.gameContainer}>
        <Text style={styles.gameTitle}>Multiplayer Arena</Text>
        <Text style={styles.gameSubtitle}>Matchmaking and gameplay coming soon.</Text>
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Montserrat-Regular': require('./assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Bold': require('./assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-ExtraBold': require('./assets/fonts/Montserrat-ExtraBold.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        /* ignore */
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  gameSafeArea: {
    flex: 1,
    backgroundColor: colors.gradientEnd,
  },
  gameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  gameTitle: {
    fontFamily: typography.fontFamilyExtraBold,
    fontSize: 28,
    color: colors.textPrimary,
  },
  gameSubtitle: {
    fontFamily: typography.fontFamilyRegular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
