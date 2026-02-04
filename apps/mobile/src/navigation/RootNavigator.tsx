import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../styles';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import PageScreen from '../screens/PageScreen';
import SectionScreen from '../screens/SectionScreen';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading, initialized, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  // Show loading while initializing
  if (!initialized || loading) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.backgroundSecondary,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.primary,
        },
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen
              name="Page"
              component={PageScreen}
              options={({ route }) => ({
                headerShown: true,
                headerTitle: route.params.pageName,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.textPrimary,
              })}
            />
            <Stack.Screen
              name="Section"
              component={SectionScreen}
              options={({ route }) => ({
                headerShown: true,
                headerTitle: route.params.sectionName,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.textPrimary,
              })}
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
    backgroundColor: colors.background,
  },
});
