import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ENABLE_THEME_PICKER } from '../theme/themePickerFeature';

interface MenuScreenProps {
  navigation: any;
}

export default function MenuScreen({ navigation }: MenuScreenProps) {
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
          padding: 20,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        },
        title: {
          fontSize: 28,
          fontWeight: 'bold',
          color: colors.textPrimary,
          flex: 1,
        },
        gearBtn: {
          padding: 8,
          marginRight: -4,
        },
        subtitle: {
          fontSize: 13,
          color: colors.textSecondary,
          marginBottom: 24,
        },
        menuContainer: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        menuItem: {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        menuItemContent: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
        },
        menuItemLeft: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        iconContainer: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        },
        menuItemText: {
          flex: 1,
        },
        menuItemTitle: {
          fontSize: 18,
          fontWeight: '600',
          color: colors.textPrimary,
          marginBottom: 4,
        },
        menuItemSubtitle: {
          fontSize: 14,
          color: colors.textSecondary,
        },
        chevron: {
          color: colors.textMuted,
        },
      }),
    [colors]
  );

  const menuItems = [
    {
      title: 'Goals',
      subtitle: 'Nutrition Goals & Targets',
      icon: 'target',
      iconType: 'MaterialCommunityIcons',
      onPress: () => navigation.navigate('Goals'),
    },
    {
      title: 'Profile',
      subtitle: 'Profile Settings',
      icon: 'person-outline',
      iconType: 'Ionicons',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      title: 'Account',
      subtitle: 'Account Settings & Logout',
      icon: 'settings-outline',
      iconType: 'Ionicons',
      onPress: () => navigation.navigate('Account'),
    },
    {
      title: 'Connected Devices',
      subtitle: 'Oura Ring & other integrations',
      icon: 'watch',
      iconType: 'MaterialCommunityIcons',
      onPress: () => navigation.navigate('ConnectedDevices'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Menu</Text>
          {ENABLE_THEME_PICKER ? (
            <TouchableOpacity
              style={styles.gearBtn}
              onPress={() => navigation.navigate('ThemeSettings')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Open appearance and theme settings"
            >
              <Ionicons name="cog-outline" size={26} color={colors.accent} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.subtitle}>Goals, Profile, Account, Connected Devices</Text>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.iconContainer}>
                    {item.iconType === 'MaterialCommunityIcons' ? (
                      <MaterialCommunityIcons name={item.icon as any} size={24} color={colors.accent} />
                    ) : (
                      <Ionicons name={item.icon as any} size={24} color={colors.accent} />
                    )}
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} style={styles.chevron} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
