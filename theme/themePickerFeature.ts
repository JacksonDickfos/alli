/**
 * Experimental theme picker (More tab → Menu → gear → Appearance).
 *
 * Revert UI in one step: set ENABLE_THEME_PICKER to `false`.
 * - Hides the gear and unregisters the Appearance screen.
 * - App uses Alli Classic (`DEFAULT_THEME_ID`) until you turn this back on.
 * - Saved theme id in AsyncStorage is left intact so turning this back on restores it.
 *
 * Remove completely (optional):
 * - Delete `screens/ThemeSettingsScreen.tsx`
 * - Delete this file; remove its import from `contexts/ThemeContext.tsx`, `App.tsx`, `MenuScreen.tsx`
 * - Remove `ENABLE_THEME_PICKER &&` blocks and the `ThemeSettings` `Stack.Screen` line in `App.tsx`
 * - Remove the gear `TouchableOpacity` block in `MenuScreen.tsx`
 */
export const ENABLE_THEME_PICKER = true;
