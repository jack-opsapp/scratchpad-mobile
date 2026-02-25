import React, { useEffect, useRef, useCallback } from 'react';
import { ActivityIndicator, View, StyleSheet, StatusBar, AppState, NativeModules } from 'react-native';
import { NavigationContainer, LinkingOptions, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../contexts/ThemeContext';
import { colors as staticColors } from '../styles';

import AuthNavigator from './AuthNavigator';
import MainScreen from '../screens/MainScreen';
import VoiceInputScreen from '../screens/VoiceInputScreen';

import type { RootStackParamList } from './types';

const { VoiceInputBridge } = NativeModules;

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['slate://'],
  config: {
    screens: {
      VoiceInput: 'voice-input',
      Main: '',
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading, initialized, initialize } = useAuthStore();
  const colors = useTheme();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const checkedInitialRef = useRef(false);

  useEffect(() => {
    initialize();
  }, []);

  // Check for pending voice input from Action Button (ControlWidget)
  const checkPendingVoiceInput = useCallback(async () => {
    if (!VoiceInputBridge || !user) return;
    try {
      const pending = await VoiceInputBridge.checkPendingVoiceInput();
      if (pending && navigationRef.isReady()) {
        navigationRef.navigate('VoiceInput');
      }
    } catch (_e) {
      // Bridge not available (e.g., older iOS or dev builds)
    }
  }, [user, navigationRef]);

  // Check on app foregrounding
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkPendingVoiceInput();
      }
    });
    return () => subscription.remove();
  }, [checkPendingVoiceInput]);

  // Check on initial mount (cold start from Action Button)
  useEffect(() => {
    if (initialized && user && !checkedInitialRef.current) {
      checkedInitialRef.current = true;
      // Small delay to ensure navigation is ready
      setTimeout(() => checkPendingVoiceInput(), 500);
    }
  }, [initialized, user, checkPendingVoiceInput]);

  // Show loading while initializing
  if (!initialized || loading) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor={staticColors.bg} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: staticColors.bg,
          card: staticColors.surface,
          text: staticColors.textPrimary,
          border: staticColors.border,
          notification: colors.primary,
        },
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={staticColors.bg} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: staticColors.bg },
          animation: 'slide_from_right',
        }}
      >
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen
              name="VoiceInput"
              component={VoiceInputScreen}
              options={{
                animation: 'fade',
                presentation: 'fullScreenModal',
                gestureEnabled: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
});
