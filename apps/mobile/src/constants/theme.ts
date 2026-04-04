export const theme = {
  // Brand
  primary: '#1D9E75',       // Trolley green
  primaryDark: '#085041',   // Deep forest
  secondary: '#EF9F27',     // Savings amber
  danger: '#E24B4A',        // Alert red

  // Backgrounds
  background: '#F1EFE8',    // Off white
  surface: '#FFFFFF',       // Card white

  // Text
  textPrimary: '#2C2C2A',   // Almost black
  textSecondary: '#5F5E5A', // Muted
  textHint: '#888780',      // Hint

  // UI
  border: '#D3D1C7',        // Light border

  // Derived
  primaryLight: '#E8F7F2',  // Light green tint for backgrounds
  secondaryLight: '#FEF6E7', // Light amber tint
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
    shadowColor: '#2C2C2A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#2C2C2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
