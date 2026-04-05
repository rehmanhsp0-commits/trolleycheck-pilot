export const theme = {
  // Brand
  primary: '#14A566',       // Trolley green
  primaryDark: '#0A5C3A',   // Deep forest
  secondary: '#F0A020',     // Savings amber
  danger: '#E03535',        // Alert red

  // Backgrounds
  background: '#F4F6F5',    // Clean neutral — no warm tint
  surface: '#FFFFFF',       // Card white

  // Text
  textPrimary: '#111210',   // Near-black — crisp contrast
  textSecondary: '#4A4D4B', // Muted but readable
  textHint: '#8A8D8B',      // Hint

  // UI
  border: '#E2E5E3',        // Clean border

  // Derived
  primaryLight: '#E5F5EE',  // Light green tint
  secondaryLight: '#FEF5E4', // Light amber tint
  dangerLight: '#FDEEED',   // Light red tint
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
