import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNav from './src/navigation/AppNav';
import { AppStateProvider } from './src/state/AppState';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <AppNav />
        <StatusBar style="light" />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
