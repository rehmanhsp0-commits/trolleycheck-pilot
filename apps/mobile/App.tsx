import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuthStore } from './src/store/authStore';
import { theme } from './src/constants/theme';

import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { WeeklyListScreen } from './src/screens/WeeklyListScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { BrowseScreen } from './src/screens/BrowseScreen';
import { ListsScreen } from './src/screens/ListsScreen';
import { ListDetailScreen } from './src/screens/ListDetailScreen';
import { CompareScreen } from './src/screens/CompareScreen';
import { SplitShopScreen } from './src/screens/SplitShopScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import type { List } from './src/api/client';

// ── Param types ───────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  History: undefined;
  Compare: { listId: string };
  SplitShop: { listId: string };
};

export type TabParamList = {
  ThisWeek: undefined;
  Browse: undefined;
  AllLists: undefined;
  Dashboard: undefined;
};

export type ListsStackParamList = {
  AllListsHome: undefined;
  ListDetail: { list: List };
};

// ── Navigators ────────────────────────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const ListsStack = createNativeStackNavigator<ListsStackParamList>();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

// Consistent logout button used in header
function LogoutButton() {
  const logout = useAuthStore(s => s.logout);
  return (
    <Pressable onPress={logout} hitSlop={8} style={{ marginRight: 16 }}>
      <Text style={{ fontSize: 13, color: theme.textSecondary, fontWeight: '600' }}>Log out</Text>
    </Pressable>
  );
}

function ListsNavigator() {
  return (
    <ListsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.primaryDark,
        headerTitleStyle: { fontWeight: '800', color: theme.textPrimary, fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
        headerRight: () => <LogoutButton />,
      }}
    >
      <ListsStack.Screen name="AllListsHome" component={ListsScreen} options={{ headerShown: false }} />
      <ListsStack.Screen
        name="ListDetail"
        component={ListDetailScreen}
        options={({ route }) => ({ title: route.params.list.name })}
      />
    </ListsStack.Navigator>
  );
}

function TabBar() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textHint,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="ThisWeek"
        component={WeeklyListScreen}
        options={{
          tabBarLabel: 'This Week',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Browse"
        component={BrowseScreen}
        options={{
          tabBarLabel: 'Browse',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="AllLists"
        component={ListsNavigator}
        options={{
          tabBarLabel: 'Lists',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

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
        headerTitleStyle: { fontWeight: '800', color: theme.textPrimary, fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
        headerRight: () => <LogoutButton />,
      }}
    >
      <MainStack.Screen
        name="Tabs"
        component={TabBar}
        options={{ headerShown: false }}
      />
      <MainStack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'History' }}
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
              <StatusBar style="light" backgroundColor={theme.primary} />
              {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
            </View>
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: theme.surface,
    borderTopColor: theme.border,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});

registerRootComponent(App);
