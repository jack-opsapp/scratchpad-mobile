import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, theme } from '../styles';
import type { RootStackScreenProps } from '../navigation/types';

type Props = RootStackScreenProps<'Section'>;

export default function SectionScreen({ route }: Props) {
  const { sectionId, sectionName } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>
        Section: {sectionName} (ID: {sectionId})
      </Text>
      <Text style={styles.subtext}>Note list coming in Phase 4</Text>
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
