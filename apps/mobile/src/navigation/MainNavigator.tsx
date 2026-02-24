import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, MessageSquare, Settings } from 'lucide-react-native';
import { colors as staticColors, theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import SettingsScreen from '../screens/SettingsScreen';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainNavigator() {
  const colors = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: staticColors.bg,
          borderTopColor: staticColors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: staticColors.textMuted,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.medium,
          fontSize: theme.fontSize.xs,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Pages',
          tabBarIcon: ({ color }) => (
            <Home color={color} size={20} strokeWidth={1.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => (
            <MessageSquare color={color} size={20} strokeWidth={1.5} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => (
            <Settings color={color} size={20} strokeWidth={1.5} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
