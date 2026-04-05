import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from './src/store/authStore';
import { theme } from './src/constants/theme';

import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ListsScreen } from './src/screens/ListsScreen';
import { ListDetailScreen } from './src/screens/ListDetailScreen';
import { CompareScreen } from './src/screens/CompareScreen';
import { SplitShopScreen } from './src/screens/SplitShopScreen';
import type { List } from './src/api/client';

// ── Navigation param types ────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Lists: undefined;
  ListDetail: { list: List };
  Compare: { listId: string };
  SplitShop: { listId: string };
};

// ── Stack navigators ──────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.primaryDark,
        headerTitleStyle: { fontWeight: '700', color: theme.textPrimary },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <MainStack.Screen
        name="Lists"
        component={ListsScreen}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="ListDetail"
        component={ListDetailScreen}
        options={({ route }) => ({ title: route.params.list.name })}
      />
      <MainStack.Screen
        name="Compare"
        component={CompareScreen}
        options={{ title: 'Price Comparison' }}
      />
      <MainStack.Screen
        name="SplitShop"
        component={SplitShopScreen}
        options={{ title: 'Split Shop' }}
      />
    </MainStack.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <View style={{ flex: 1, backgroundColor: theme.background }}>
              <StatusBar style="dark" backgroundColor={theme.background} />
              {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
            </View>
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
