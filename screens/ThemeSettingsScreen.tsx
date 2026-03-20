import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { THEME_OPTIONS, palettes, ThemeId } from '../theme/palettes';

interface ThemeSettingsScreenProps {
  navigation: { goBack: () => void };
}

export default function ThemeSettingsScreen({ navigation }: ThemeSettingsScreenProps) {
  const { colors, themeId, setThemeId } = useTheme();

  const themeIdRef = useRef(themeId);
  themeIdRef.current = themeId;

  const enteredAtFocusRef = useRef<ThemeId>(themeId);
  const committedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      enteredAtFocusRef.current = themeIdRef.current;
      committedRef.current = false;
      return () => {
        if (!committedRef.current) {
          setThemeId(enteredAtFocusRef.current, false);
        }
      };
    }, [setThemeId])
  );

  const commitAndLeave = useCallback(() => {
    committedRef.current = true;
    setThemeId(themeIdRef.current, true);
    navigation.goBack();
  }, [navigation, setThemeId]);

  const discardAndLeave = useCallback(() => {
    committedRef.current = true;
    setThemeId(enteredAtFocusRef.current, false);
    navigation.goBack();
  }, [navigation, setThemeId]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scroll: {
          flex: 1,
        },
        scrollContent: {
          padding: 20,
          paddingBottom: 24,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
        },
        backBtn: {
          paddingVertical: 8,
          paddingRight: 12,
          marginLeft: -4,
        },
        headerTitle: {
          fontSize: 22,
          fontWeight: '700',
          color: colors.textPrimary,
          flex: 1,
        },
        intro: {
          fontSize: 14,
          color: colors.textSecondary,
          marginBottom: 20,
          lineHeight: 20,
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        option: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        optionLast: {
          borderBottomWidth: 0,
        },
        swatches: {
          flexDirection: 'row',
          gap: 6,
          marginRight: 12,
        },
        swatch: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(0,0,0,0.12)',
        },
        optionText: {
          flex: 1,
        },
        optionName: {
          fontSize: 17,
          fontWeight: '600',
          color: colors.textPrimary,
          marginBottom: 2,
        },
        optionDesc: {
          fontSize: 13,
          color: colors.textSecondary,
        },
        actions: {
          flexDirection: 'row',
          gap: 12,
          marginTop: 24,
        },
        btnSecondary: {
          flex: 1,
          paddingVertical: 14,
          borderRadius: 12,
          marginLeft: 0,
          marginRight: 0,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
        },
        btnSecondaryText: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.textPrimary,
        },
        btnPrimary: {
          flex: 1,
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.buttonPrimary,
        },
        btnPrimaryText: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.tabBarActive,
        },
      }),
    [colors]
  );

  const previewColors = (id: ThemeId) => {
    const p = palettes[id];
    return [p.background, p.accent, p.buttonPrimary, p.surface];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style={colors.statusBarStyle === 'light' ? 'light' : 'dark'} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={discardAndLeave} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={26} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appearance</Text>
        </View>
        <Text style={styles.intro}>
          Tap a theme to preview app background, accents, primary buttons, and card surfaces. Nothing is saved until you tap Save — Cancel or Back discards changes.
        </Text>

        <View style={styles.card}>
          {THEME_OPTIONS.map((opt, index) => {
            const selected = themeId === opt.id;
            const last = index === THEME_OPTIONS.length - 1;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, last && styles.optionLast]}
                onPress={() => setThemeId(opt.id, false)}
                activeOpacity={0.7}
              >
                <View style={styles.swatches}>
                  {previewColors(opt.id).map((c, i) => (
                    <View key={i} style={[styles.swatch, { backgroundColor: c }]} />
                  ))}
                </View>
                <View style={styles.optionText}>
                  <Text style={styles.optionName}>{opt.name}</Text>
                  <Text style={styles.optionDesc}>{opt.description}</Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                ) : (
                  <View style={{ width: 24 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnSecondary} onPress={discardAndLeave} activeOpacity={0.75}>
            <Text style={styles.btnSecondaryText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={commitAndLeave} activeOpacity={0.75}>
            <Text style={styles.btnPrimaryText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
