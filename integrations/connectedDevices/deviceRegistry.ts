import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { startOuraAuthorization } from '../oura/ouraOAuth';

export type ConnectedDeviceId = 'oura' | 'whoop' | 'apple_health' | 'fitbit';

export type ConnectedDeviceDefinition = {
  id: ConnectedDeviceId;
  title: string;
  description: string;
  enabled: boolean;
  iconName: string;
  renderRight?: (args: { connected: boolean }) => ReactNode;
  onPress?: () => Promise<void>;
};

export const connectedDeviceDefinitions: ConnectedDeviceDefinition[] = [
  {
    id: 'oura',
    title: 'Oura Ring',
    description: 'Sync sleep, readiness, heart rate, stress, and workouts.',
    enabled: true,
    iconName: 'ring',
    onPress: async () => startOuraAuthorization(),
  },
  {
    id: 'whoop',
    title: 'Whoop',
    description: 'Sync recovery, strain, sleep, and heart rate variability.',
    enabled: false,
    iconName: 'arm-flex',
    onPress: async () => {
      Alert.alert('Whoop', 'Coming soon.');
    },
  },
  {
    id: 'apple_health',
    title: 'Apple Health',
    description: 'Sync steps, workouts, heart rate, sleep, and activity.',
    enabled: false,
    iconName: 'apple',
    onPress: async () => {
      Alert.alert('Apple Health', 'Coming soon.');
    },
  },
  {
    id: 'fitbit',
    title: 'Fitbit',
    description: 'Sync steps, sleep, heart rate, and exercise.',
    enabled: false,
    iconName: 'watch',
    onPress: async () => {
      Alert.alert('Fitbit', 'Coming soon.');
    },
  },
];

