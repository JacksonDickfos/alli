export type ThemeId = 'alli' | 'midnight' | 'sunset' | 'forest' | 'dusk';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDark: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  border: string;
  headerBackground: string;
  buttonPrimary: string;
  link: string;
  /** Main CTA gradient (e.g. Log Food) */
  gradientPrimary: [string, string];
  /** Brand purple / multi-stop CTAs */
  gradientPurple: [string, string, string];
  /** Analysis / multi-accent row */
  gradientAnalyze: [string, string, string, string];
  alliChipInner: string;
  statusBarStyle: 'light' | 'dark';
}

export const THEME_OPTIONS: { id: ThemeId; name: string; description: string }[] = [
  { id: 'alli', name: 'Alli Classic', description: 'Teal & warm sand' },
  { id: 'midnight', name: 'Midnight', description: 'Dark with mint accents' },
  { id: 'sunset', name: 'Sunset', description: 'Warm terracotta & cream' },
  { id: 'forest', name: 'Forest', description: 'Deep greens & sage' },
  { id: 'dusk', name: 'Dusk', description: 'Indigo & soft lilac' },
];

export const palettes: Record<ThemeId, ThemeColors> = {
  alli: {
    background: '#CDC4B7',
    surface: '#E6E1D8',
    surfaceMuted: '#F3EEE7',
    textPrimary: '#2A2A2A',
    textSecondary: '#666666',
    textMuted: '#999999',
    accent: '#0090A3',
    accentDark: '#28657A',
    tabBar: '#28657A',
    tabBarActive: '#FFFFFF',
    tabBarInactive: '#CDC4B7',
    border: '#D0C7B8',
    headerBackground: '#28657A',
    buttonPrimary: '#0090A3',
    link: '#0090A3',
    gradientPrimary: ['#0090A3', '#28657A'],
    gradientPurple: ['#0090A3', '#6E006A', '#4F0232'],
    gradientAnalyze: ['#0090A3', '#6E006A', '#4F0232', '#3A86FF'],
    alliChipInner: '#28657A',
    statusBarStyle: 'light',
  },
  midnight: {
    background: '#12151c',
    surface: '#1e232e',
    surfaceMuted: '#2a3140',
    textPrimary: '#e8eaed',
    textSecondary: '#9aa0a6',
    textMuted: '#6b7280',
    accent: '#5dd4c8',
    accentDark: '#2d9a8f',
    tabBar: '#0c0e14',
    tabBarActive: '#e8eaed',
    tabBarInactive: '#6b7280',
    border: '#2a3140',
    headerBackground: '#0c0e14',
    buttonPrimary: '#5dd4c8',
    link: '#5dd4c8',
    gradientPrimary: ['#5dd4c8', '#3d8b9e'],
    gradientPurple: ['#5dd4c8', '#7c5cbf', '#4a2c6d'],
    gradientAnalyze: ['#5dd4c8', '#7c5cbf', '#4a2c6d', '#3A86FF'],
    alliChipInner: '#1e232e',
    statusBarStyle: 'light',
  },
  sunset: {
    background: '#f5e6dc',
    surface: '#fde8dc',
    surfaceMuted: '#fff5ef',
    textPrimary: '#3d2a24',
    textSecondary: '#6b5349',
    textMuted: '#8a7268',
    accent: '#c45c3e',
    accentDark: '#8b3d2e',
    tabBar: '#6b3d32',
    tabBarActive: '#fff8f4',
    tabBarInactive: '#d4b5a8',
    border: '#e8c9b8',
    headerBackground: '#6b3d32',
    buttonPrimary: '#c45c3e',
    link: '#c45c3e',
    gradientPrimary: ['#c45c3e', '#8b3d2e'],
    gradientPurple: ['#c45c3e', '#a8486a', '#5c2d4a'],
    gradientAnalyze: ['#c45c3e', '#a8486a', '#5c2d4a', '#3A86FF'],
    alliChipInner: '#6b3d32',
    statusBarStyle: 'light',
  },
  forest: {
    background: '#e4ebe4',
    surface: '#d4e0d4',
    surfaceMuted: '#eef4ee',
    textPrimary: '#1b3024',
    textSecondary: '#4a5c52',
    textMuted: '#6b7d72',
    accent: '#2d6a4f',
    accentDark: '#1b4332',
    tabBar: '#1b4332',
    tabBarActive: '#e8f5e9',
    tabBarInactive: '#95b8a4',
    border: '#b8cbb8',
    headerBackground: '#1b4332',
    buttonPrimary: '#2d6a4f',
    link: '#2d6a4f',
    gradientPrimary: ['#2d6a4f', '#1b4332'],
    gradientPurple: ['#2d6a4f', '#40916c', '#1b4332'],
    gradientAnalyze: ['#2d6a4f', '#40916c', '#1b4332', '#3A86FF'],
    alliChipInner: '#1b4332',
    statusBarStyle: 'light',
  },
  dusk: {
    background: '#e9e7f3',
    surface: '#f2f0f8',
    surfaceMuted: '#faf9fd',
    textPrimary: '#1c1833',
    textSecondary: '#564f6f',
    textMuted: '#8b849f',
    accent: '#6d5bd4',
    accentDark: '#4534a8',
    tabBar: '#35296b',
    tabBarActive: '#f5f4ff',
    tabBarInactive: '#b8b0d4',
    border: '#d4cfe8',
    headerBackground: '#35296b',
    buttonPrimary: '#6d5bd4',
    link: '#6d5bd4',
    gradientPrimary: ['#6d5bd4', '#4534a8'],
    gradientPurple: ['#6d5bd4', '#9b4d8c', '#4a2c5c'],
    gradientAnalyze: ['#6d5bd4', '#9b4d8c', '#4a2c5c', '#3A86FF'],
    alliChipInner: '#35296b',
    statusBarStyle: 'light',
  },
};

export const DEFAULT_THEME_ID: ThemeId = 'alli';
