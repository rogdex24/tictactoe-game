import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameScreen } from './src/components/game/GameScreen';
import { HomeScreen } from './src/components/home/HomeScreen';
import { MatchLoadingScreen } from './src/components/onboarding/MatchLoadingScreen';
import { PlayerNameScreen } from './src/components/onboarding/PlayerNameScreen';
import { PlayerProvider } from './src/state/PlayerContext';
import type { RootStackParamList } from './src/types/components';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* noop - the splash screen might already be hidden */
});

const Stack = createNativeStackNavigator<RootStackParamList>();

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
    <SafeAreaProvider>
      <PlayerProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="PlayerName" component={PlayerNameScreen} />
            <Stack.Screen name="MatchLoading" component={MatchLoadingScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
