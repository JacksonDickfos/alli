import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ComingSoonScreenProps {
  navigation: any;
}

export default function ComingSoonScreen(_props: ComingSoonScreenProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        content: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
        },
        iconContainer: {
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 30,
        },
        title: {
          fontSize: 24,
          fontWeight: 'bold',
          color: colors.textPrimary,
          marginBottom: 8,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: 20,
          fontWeight: '600',
          color: colors.accent,
          marginBottom: 20,
          textAlign: 'center',
        },
        description: {
          fontSize: 16,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 24,
        },
      }),
    [colors]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={64} color={colors.accent} />
        </View>
        <Text style={styles.title}>Meal Plan Section</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
        <Text style={styles.description}>
          We're working hard to bring you personalized meal planning features. 
          Stay tuned for updates!
        </Text>
      </View>
    </SafeAreaView>
  );
}
