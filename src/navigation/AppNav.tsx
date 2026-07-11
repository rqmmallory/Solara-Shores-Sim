import React from 'react';
import { Text } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import LearnScreen from '../screens/LearnScreen';
import MathScreen from '../screens/MathScreen';
import SimListScreen from '../screens/SimListScreen';
import ModuleScreen from '../screens/ModuleScreen';
import QuizScreen from '../screens/QuizScreen';
import DecisionScreen from '../screens/DecisionScreen';
import SimRunScreen from '../screens/SimRunScreen';
import { colors } from '../ui/theme';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

const TAB_ICONS: Record<keyof TabParamList, string> = {
  Home: '⌂',
  Learn: '▤',
  Math: '∑',
  Sim: '⚒',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 18 }}>{TAB_ICONS[route.name as keyof TabParamList]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
      <Tab.Screen name="Math" component={MathScreen} />
      <Tab.Screen name="Sim" component={SimListScreen} />
    </Tab.Navigator>
  );
}

export default function AppNav() {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Module" component={ModuleScreen} options={{ title: 'Module' }} />
        <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: 'Quiz' }} />
        <Stack.Screen name="Decision" component={DecisionScreen} options={{ title: 'Decision' }} />
        <Stack.Screen name="SimRun" component={SimRunScreen} options={{ title: 'Simulation' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
