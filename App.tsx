import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Screens
import TournamentListScreen from './src/features/tournament/TournamentListScreen';
import CreateTournamentScreen from './src/features/tournament/CreateTournamentScreen';
import TournamentDetailScreen from './src/features/tournament/TournamentDetailScreen';
import CreateTeamScreen from './src/features/team/CreateTeamScreen';
import CreatePlayerScreen from './src/features/team/CreatePlayerScreen';
import AddPlayerToTeamScreen from './src/features/team/AddPlayerToTeamScreen';
import PlayersScreen from './src/features/team/PlayersScreen';
import TeamsScreen from './src/features/team/TeamsScreen';
import BulkAddPlayersScreen from './src/features/team/BulkAddPlayersScreen';
import CreateMatchScreen from './src/features/match/CreateMatchScreen';
import SelectPlayingXIScreen from './src/features/match/SelectPlayingXIScreen';
import TossScreen from './src/features/match/TossScreen';
import LiveScoreScreen from './src/features/match/LiveScoreScreen';
import SettingsScreen from './src/features/settings/SettingsScreen';

import { useSettingsStore } from './src/store/settingsStore';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const colorScheme = useColorScheme();
  const { theme: settingsTheme, primaryColor } = useSettingsStore();

  useEffect(() => {
    setTimeout(() => setIsReady(true), 100);
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isDark = settingsTheme === 'system' ? colorScheme === 'dark' : settingsTheme === 'dark';
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  const theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: primaryColor,
      // elevation: baseTheme.colors.elevation, // Ensure elevation exists if needed
    },
  };

  // Merge Navigation Theme with Paper Theme for consistency
  const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavDefaultTheme,
    reactNavigationDark: NavDarkTheme,
  });

  const navigationTheme = isDark ? DarkTheme : LightTheme;
  const combinedNavigationTheme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      primary: primaryColor,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <NavigationContainer theme={combinedNavigationTheme}>
          <Stack.Navigator initialRouteName="TournamentList">
            <Stack.Screen
              name="TournamentList"
              component={TournamentListScreen}
              options={{ title: 'Tournaments' }}
            />
            <Stack.Screen
              name="CreateTournament"
              component={CreateTournamentScreen}
              options={{ title: 'Create Tournament' }}
            />
            <Stack.Screen
              name="TournamentDetail"
              component={TournamentDetailScreen}
              options={{ title: 'Tournament Details' }}
            />
            <Stack.Screen
              name="CreateTeam"
              component={CreateTeamScreen}
              options={{ title: 'Create Team' }}
            />
            <Stack.Screen
              name="CreatePlayer"
              component={CreatePlayerScreen}
              options={{ title: 'Create Player' }}
            />
            <Stack.Screen
              name="Players"
              component={PlayersScreen}
              options={{ title: 'All Players' }}
            />
            <Stack.Screen
              name="Teams"
              component={TeamsScreen}
              options={{ title: 'All Teams' }}
            />
            <Stack.Screen
              name="BulkAddPlayers"
              component={BulkAddPlayersScreen}
              options={{ title: 'Bulk Add Players' }}
            />
            <Stack.Screen
              name="AddPlayerToTeam"
              component={AddPlayerToTeamScreen}
              options={{ title: 'Add Player to Team' }}
            />
            <Stack.Screen
              name="CreateMatch"
              component={CreateMatchScreen}
              options={{ title: 'Schedule Match' }}
            />
            <Stack.Screen
              name="SelectPlayingXI"
              component={SelectPlayingXIScreen}
              options={{ title: 'Select Playing XI' }}
            />
            <Stack.Screen
              name="Toss"
              component={TossScreen}
              options={{ title: 'Match Toss' }}
            />
            <Stack.Screen
              name="LiveScore"
              component={LiveScoreScreen}
              options={{ title: 'Live Score' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
