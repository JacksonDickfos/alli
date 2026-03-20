import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';

interface AccountScreenProps {
  navigation: any;
  onLogout: () => void;
}

export default function AccountScreen({ navigation, onLogout }: AccountScreenProps) {
  const { colors } = useTheme();
  const { state, dispatch } = useApp();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: colors.headerBackground,
        },
        headerBackButton: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.12)',
        },
        headerTitle: {
          flex: 1,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: '800',
          color: colors.tabBarInactive,
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          padding: 20,
          paddingBottom: 100,
        },
        title: {
          fontSize: 28,
          fontWeight: 'bold',
          color: colors.accent,
          marginBottom: 20,
          textAlign: 'center',
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 4,
            },
          }),
        },
        cardHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 20,
        },
        avatarContainer: {
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        },
        profileInfo: {
          flex: 1,
        },
        profileName: {
          fontSize: 20,
          fontWeight: 'bold',
          color: colors.textPrimary,
          marginBottom: 4,
        },
        profileEmail: {
          fontSize: 14,
          color: colors.textSecondary,
        },
        editButton: {
          padding: 8,
        },
        profileStats: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingTop: 20,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        statItem: {
          alignItems: 'center',
        },
        statValue: {
          fontSize: 24,
          fontWeight: 'bold',
          color: colors.accent,
        },
        statLabel: {
          fontSize: 12,
          color: colors.textSecondary,
          marginTop: 4,
        },
        cardTitle: {
          fontSize: 20,
          fontWeight: 'bold',
          color: colors.accent,
          marginBottom: 16,
        },
        settingItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        settingInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        settingText: {
          marginLeft: 12,
          flex: 1,
        },
        settingLabel: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.textPrimary,
        },
        settingDescription: {
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: 2,
        },
        menuItem: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        menuItemContent: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        },
        menuItemText: {
          fontSize: 16,
          color: colors.textPrimary,
          marginLeft: 12,
        },
        menuItemSubtitle: {
          fontSize: 13,
          color: colors.textSecondary,
          marginTop: 2,
          marginLeft: 12,
        },
        logoutButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 16,
        },
        logoutText: {
          fontSize: 16,
          fontWeight: '600',
          color: '#FF6B6B',
          marginLeft: 8,
        },
        versionContainer: {
          alignItems: 'center',
          marginTop: 20,
        },
        versionText: {
          fontSize: 14,
          color: colors.textSecondary,
        },
        versionSubtext: {
          fontSize: 12,
          color: colors.textMuted,
          marginTop: 4,
        },
      }),
    [colors]
  );

  const user = state.user;
  const preferences = state.preferences;

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This feature will allow you to export your nutrition data. Coming soon!',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Account deletion will be available in a future update.');
          }
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all your nutrition logs and reset your progress. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Data clearing will be available in a future update.');
          }
        },
      ]
    );
  };


  const toggleUnits = () => {
    const newUnits = preferences.units === 'metric' ? 'imperial' : 'metric';
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { units: newUnits } 
    });
  };

  const toggleEnergy = () => {
    const newEnergy = preferences.energy === 'calories' ? 'kilojoules' : 'calories';
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { energy: newEnergy } 
    });
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { notifications: !notificationsEnabled } 
    });
  };

  const renderProfileSection = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons name="account" size={32} color={colors.textMuted} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="pencil" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.profileStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>7</Text>
          <Text style={styles.statLabel}>Days Streak</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>42</Text>
          <Text style={styles.statLabel}>Meals Logged</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>85%</Text>
          <Text style={styles.statLabel}>Goal Achievement</Text>
        </View>
      </View>
    </View>
  );

  const renderSettingsSection = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Settings</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <MaterialCommunityIcons name="lightning-bolt" size={24} color={colors.textMuted} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Energy</Text>
            <Text style={styles.settingDescription}>
              {preferences.energy === 'calories' ? 'Calories' : 'Kilojoules (kJ)'}
            </Text>
          </View>
        </View>
        <Switch
          value={preferences.energy === 'kilojoules'}
          onValueChange={toggleEnergy}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={preferences.energy === 'kilojoules' ? colors.tabBarActive : colors.surfaceMuted}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <MaterialCommunityIcons name="ruler" size={24} color={colors.textMuted} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Units</Text>
            <Text style={styles.settingDescription}>
              {preferences.units === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft)'}
            </Text>
          </View>
        </View>
        <Switch
          value={preferences.units === 'imperial'}
          onValueChange={toggleUnits}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={preferences.units === 'imperial' ? colors.tabBarActive : colors.surfaceMuted}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <MaterialCommunityIcons name="bell" size={24} color={colors.textMuted} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>
              {notificationsEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>
        <Switch
          value={notificationsEnabled}
          onValueChange={toggleNotifications}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={notificationsEnabled ? colors.tabBarActive : colors.surfaceMuted}
        />
      </View>
    </View>
  );

  const renderDataSection = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Data & Privacy</Text>
      
      <TouchableOpacity style={styles.menuItem} onPress={handleExportData}>
        <View style={styles.menuItemContent}>
          <MaterialCommunityIcons name="download" size={24} color={colors.textMuted} />
          <Text style={styles.menuItemText}>Export Data</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={handleClearData}>
        <View style={styles.menuItemContent}>
          <MaterialCommunityIcons name="delete-sweep" size={24} color="#FF6B6B" />
          <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>Clear All Data</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
        <View style={styles.menuItemContent}>
          <MaterialCommunityIcons name="account-remove" size={24} color="#FF6B6B" />
          <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>Delete Account</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const renderConnectedDevicesSection = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Connected Devices</Text>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('ConnectedDevices')}
      >
        <View style={styles.menuItemContent}>
          <MaterialCommunityIcons name="ring" size={24} color={colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.menuItemText}>Oura Ring</Text>
            <Text style={styles.menuItemSubtitle}>Connect and manage your first wearable</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const renderSupportSection = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Support</Text>
      
      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuItemContent}>
          <MaterialCommunityIcons name="help-circle" size={24} color={colors.textMuted} />
          <Text style={styles.menuItemText}>Help & FAQ</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuItemContent}>
          <MaterialCommunityIcons name="email" size={24} color={colors.textMuted} />
          <Text style={styles.menuItemText}>Contact Support</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuItemContent}>
          <MaterialCommunityIcons name="star" size={24} color={colors.textMuted} />
          <Text style={styles.menuItemText}>Rate App</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <View style={styles.menuItemContent}>
          <MaterialCommunityIcons name="information" size={24} color={colors.textMuted} />
          <Text style={styles.menuItemText}>About</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const renderLogoutSection = () => (
    <View style={styles.card}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialCommunityIcons name="logout" size={24} color="#FF6B6B" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack?.()}
          style={styles.headerBackButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.tabBarInactive} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Account</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderProfileSection()}
        {renderSettingsSection()}
        {renderConnectedDevicesSection()}
        {renderDataSection()}
        {renderSupportSection()}
        {renderLogoutSection()}

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Alli Nutrition v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with ❤️ for your health</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
