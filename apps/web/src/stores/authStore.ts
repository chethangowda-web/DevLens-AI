import { create } from 'zustand';
import { UserProfileResponse, ApiResponse } from '@devlens/types';
import { apiClient } from '../services/apiClient';

interface AuthState {
  user: UserProfileResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.get<ApiResponse<{ user: UserProfileResponse }>>('/auth/me');
      if (res.data.data?.user) {
        set({ user: res.data.data.user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<ApiResponse<{ user: UserProfileResponse; token: string }>>(
        '/auth/login',
        { email, password }
      );
      if (res.data.data?.user) {
        set({ user: res.data.data.user, isAuthenticated: true, isLoading: false });
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post<ApiResponse<{ user: UserProfileResponse; token: string }>>(
        '/auth/register',
        { email, password, fullName }
      );
      if (res.data.data?.user) {
        set({ user: res.data.data.user, isAuthenticated: true, isLoading: false });
      }
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.post('/auth/logout');
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
