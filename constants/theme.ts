/**
 * Below are the colors that are used in the app.
 * Colors are defined for light and dark mode.
 */

import { Platform } from 'react-native';

/* ---------------------------------------
   Brand Colors
--------------------------------------- */

const brandBlue = '#1f3fad';   // PRIMARY
const brandOrange = '#FCB100'; // ACCENT

/* ---------------------------------------
   Theme Colors
--------------------------------------- */

export const Colors = {
  light: {
    // Core
    text: '#11181C',
    background: '#FFFFFF',

    // Brand
    primary: brandBlue,
    accent: brandOrange,

    // Legacy compatibility
    tint: brandBlue,

    // Icons / Tabs
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: brandBlue,

    // UI helpers
    border: '#E5E7EB',
    mutedText: '#6B7280',
    surface: '#F9FAFB',
  },

  dark: {
    // Core
    text: '#ECEDEE',
    background: '#151718',

    // Brand
    primary: brandBlue,
    accent: brandOrange,

    // Legacy compatibility
    tint: '#FFFFFF',

    // Icons / Tabs
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#FFFFFF',

    // UI helpers
    border: '#2A2F33',
    mutedText: '#9BA1A6',
    surface: '#1E2022',
  },
};

/* ---------------------------------------
   Fonts
--------------------------------------- */

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
