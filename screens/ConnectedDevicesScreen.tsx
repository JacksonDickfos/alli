import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { connectedDeviceDefinitions, type ConnectedDeviceDefinition } from '../integrations/connectedDevices/deviceRegistry';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

type OuraConnectionState = 'connected' | 'not_connected' | 'exchanging' | 'error';

const OURA_CONNECTED_KEY = 'oura_connected';
const OURA_CONNECT_STATUS_KEY = 'oura_connect_status';
const OURA_CONNECT_ERROR_KEY = 'oura_connect_error';
const OURA_EXCHANGING_STARTED_AT_KEY = 'oura_exchanging_started_at';
const STALE_EXCHANGING_MS = 90 * 1000; // treat "exchanging" as stale after 90s

function getOuraConnectionState(connected: boolean, status: string | null, error: string | null): OuraConnectionState {
  if (error) return 'error';
  if (status === 'exchanging') return 'exchanging';
  if (connected) return 'connected';
  return 'not_connected';
}

export default function ConnectedDevicesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [ouraConnected, setOuraConnected] = useState(false);
  const [ouraState, setOuraState] = useState<OuraConnectionState>('not_connected');
  const [ouraError, setOuraError] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollView: {
          flex: 1,
        },
        scrollContent: {
          padding: 20,
          paddingBottom: 100,
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
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
            android: { elevation: 4 },
          }),
        },
        cardTitle: {
          fontSize: 20,
          fontWeight: 'bold',
          color: colors.accent,
          marginBottom: 12,
        },
        deviceRow: {
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          paddingVertical: 14,
        },
        deviceLeft: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
        },
        deviceLeftDisabled: {
          opacity: 0.65,
        },
        deviceIconContainer: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        },
        deviceTitle: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.textPrimary,
          marginBottom: 4,
        },
        deviceDescription: {
          fontSize: 13,
          color: colors.textSecondary,
        },
        deviceRight: {
          width: 120,
          alignItems: 'flex-end',
          paddingLeft: 10,
        },
        ouraRight: {
          alignItems: 'flex-end',
        },
        comingSoonPill: {
          backgroundColor: colors.surfaceMuted,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 16,
        },
        comingSoonPillText: {
          color: colors.textSecondary,
          fontWeight: '600',
          fontSize: 12,
        },
        connectedPill: {
          backgroundColor: colors.surfaceMuted,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 16,
          marginBottom: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.accent,
        },
        connectedPillText: {
          color: colors.accent,
          fontWeight: '700',
          fontSize: 12,
        },
        secondaryButton: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: '#FF6B6B',
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 12,
        },
        secondaryButtonText: {
          color: '#FF6B6B',
          fontWeight: '700',
          fontSize: 12,
        },
        primaryButton: {
          backgroundColor: colors.buttonPrimary,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.buttonPrimary,
          marginTop: 6,
        },
        primaryButtonText: {
          color: colors.tabBarActive,
          fontWeight: '700',
          fontSize: 12,
        },
      }),
    [colors]
  );

  const refresh = useCallback(async () => {
    const connected = (await AsyncStorage.getItem(OURA_CONNECTED_KEY)) === 'true';
    let status = await AsyncStorage.getItem(OURA_CONNECT_STATUS_KEY);
    const error = await AsyncStorage.getItem(OURA_CONNECT_ERROR_KEY);

    // Only clear "exchanging" if it's stale (e.g. after app restart), not when we just started the flow
    if (status === 'exchanging') {
      const startedAt = await AsyncStorage.getItem(OURA_EXCHANGING_STARTED_AT_KEY);
      const age = startedAt ? Date.now() - parseInt(startedAt, 10) : Infinity;
      if (age > STALE_EXCHANGING_MS) {
        await AsyncStorage.removeItem(OURA_CONNECT_STATUS_KEY).catch(() => {});
        await AsyncStorage.removeItem(OURA_EXCHANGING_STARTED_AT_KEY).catch(() => {});
        status = null;
      }
    }

    setOuraConnected(connected);
    setOuraError(error);
    setOuraState(getOuraConnectionState(connected, status, error));
  }, []);

  useFocusEffect(() => {
    // React Navigation expects a synchronous effect callback; call async refresh safely.
    void refresh();
    return undefined;
  });

  useEffect(() => {
    // Ensure we render something quickly on first load even before focus events.
    refresh();
  }, [refresh]);

  // When app comes back from OAuth browser (or disconnect), refresh so "Connecting…" resets to button
  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') void refresh();
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [refresh]);

  const renderDeviceRow = useCallback(
    (device: ConnectedDeviceDefinition) => {
      const connected = device.id === 'oura' ? ouraConnected : false;
      const isEnabled = device.enabled && (device.id !== 'oura' || !ouraConnected);

      const handleOuraConnect = async () => {
        if (device.id !== 'oura') return;
        if (ouraState === 'exchanging') return;

        try {
          setOuraState('exchanging');
          await AsyncStorage.setItem(OURA_CONNECT_STATUS_KEY, 'exchanging').catch(() => {});
          await AsyncStorage.setItem(OURA_EXCHANGING_STARTED_AT_KEY, Date.now().toString()).catch(() => {});
          await AsyncStorage.removeItem(OURA_CONNECT_ERROR_KEY).catch(() => {});
          setOuraError(null);

          if (device.onPress) {
            await device.onPress();
          }

          refresh();
        } catch (e: any) {
          const msg = e?.message || 'Failed to start Oura authorization.';
          await AsyncStorage.setItem(OURA_CONNECT_STATUS_KEY, 'error').catch(() => {});
          await AsyncStorage.setItem(OURA_CONNECT_ERROR_KEY, msg).catch(() => {});
          setOuraError(msg);
          setOuraState('error');
        }
      };

      const right =
        device.id === 'oura' ? (
          <View style={styles.ouraRight}>
            {ouraState === 'connected' ? (
              <View style={styles.connectedPill}>
                <Text style={styles.connectedPillText}>Connected</Text>
              </View>
            ) : ouraState === 'exchanging' ? (
              <View style={styles.connectedPill}>
                <Text style={styles.connectedPillText}>Connecting…</Text>
              </View>
            ) : null}

            {ouraState === 'connected' && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  Alert.alert('Disconnect', 'Revoking tokens is not implemented yet. Disconnecting locally.');
                  AsyncStorage.setItem(OURA_CONNECTED_KEY, 'false').catch(() => {});
                  AsyncStorage.removeItem(OURA_CONNECT_STATUS_KEY).catch(() => {});
                  AsyncStorage.removeItem(OURA_EXCHANGING_STARTED_AT_KEY).catch(() => {});
                  AsyncStorage.removeItem(OURA_CONNECT_ERROR_KEY).catch(() => {});
                  refresh();
                }}
              >
                <Text style={styles.secondaryButtonText}>Disconnect</Text>
              </TouchableOpacity>
            )}

            {ouraState !== 'connected' && ouraState !== 'exchanging' && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  void handleOuraConnect();
                }}
              >
                <Text style={styles.primaryButtonText}>Connect</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonPillText}>Coming soon</Text>
          </View>
        );

      return (
        <View key={device.id} style={styles.deviceRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.deviceLeft, !isEnabled && styles.deviceLeftDisabled]}
            onPress={async () => {
              if (!device.enabled) {
                Alert.alert(device.title, 'Coming soon.');
                return;
              }
              if (device.id === 'oura' && ouraConnected) {
                Alert.alert('Oura', 'Already connected. Disconnect (local) or reconnect.');
                return;
              }
              if (device.onPress) {
                await AsyncStorage.setItem(OURA_CONNECT_STATUS_KEY, 'exchanging').catch(() => {});
                await AsyncStorage.setItem(OURA_EXCHANGING_STARTED_AT_KEY, Date.now().toString()).catch(() => {});
                await AsyncStorage.removeItem(OURA_CONNECT_ERROR_KEY).catch(() => {});
                setOuraState('exchanging');
                await device.onPress();
                refresh();
              }
            }}
            disabled={!isEnabled}
          >
            <View style={styles.deviceIconContainer}>
              <MaterialCommunityIcons name={device.iconName as any} size={22} color={colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceTitle}>{device.title}</Text>
              <Text style={styles.deviceDescription}>{device.description}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.deviceRight}>{right}</View>
        </View>
      );
    },
    [ouraConnected, ouraState, refresh, styles, colors.textMuted]
  );

  const deviceList = useMemo(() => connectedDeviceDefinitions, []);

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
        <Text style={styles.headerTitle}>Connected Devices</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Integrations</Text>

          {deviceList.map(renderDeviceRow)}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

