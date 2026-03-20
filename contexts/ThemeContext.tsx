import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_THEME_ID,
  palettes,
  ThemeColors,
  ThemeId,
} from '../theme/palettes';
import { ENABLE_THEME_PICKER } from '../theme/themePickerFeature';

const STORAGE_KEY = 'app_theme_id';

type ThemeContextValue = {
  themeId: ThemeId;
  colors: ThemeColors;
  /** Pass persist: false for in-session preview only (not written to device storage). */
  setThemeId: (id: ThemeId, persist?: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    if (!ENABLE_THEME_PICKER) {
      setThemeIdState(DEFAULT_THEME_ID);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && raw && raw in palettes) {
          setThemeIdState(raw as ThemeId);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeId = useCallback((id: ThemeId, persist = true) => {
    if (!ENABLE_THEME_PICKER) {
      return;
    }
    setThemeIdState(id);
    if (persist) {
      AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
    }
  }, []);

  const colors = useMemo(() => palettes[themeId], [themeId]);

  const value = useMemo(
    () => ({ themeId, colors, setThemeId }),
    [themeId, colors, setThemeId]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
