import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, theme } from '../styles';
import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'Page'>;

export default function PageScreen({ route }: Props) {
  const { pageId, pageName } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>
        Page: {pageName} (ID: {pageId})
      </Text>
      <Text style={styles.subtext}>Section list coming in Phase 4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    color: colors.textPrimary,
    fontSize: theme.fontSize.lg,
  },
  subtext: {
    color: colors.textMuted,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.sm,
  },
});
