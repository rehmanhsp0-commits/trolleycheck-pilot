import { create } from 'zustand';
import { authApi, clearTokens, saveTokens, type User } from '../api/client';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, accessToken, refreshToken } = await authApi.login(email, password);
      await saveTokens(accessToken, refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message ?? 'Login failed' });
    }
  },

  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, accessToken, refreshToken } = await authApi.register(email, password);
      await saveTokens(accessToken, refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message ?? 'Registration failed' });
    }
  },

  logout: async () => {
    await clearTokens().catch(() => {});
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));
