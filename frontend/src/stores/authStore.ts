import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export interface User {
  id: string;
  username: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await api.post('/auth/login', { username, password });
          const { token, user } = response.data;

          // Set token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            token,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          const message = error.response?.data?.error || 'Login fehlgeschlagen';
          set({ isLoading: false, error: message });
          throw new Error(message);
        }
      },

      logout: () => {
        // Clear token from API client
        delete api.defaults.headers.common['Authorization'];

        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          // Set token in API client
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          const response = await api.get('/auth/me');
          set({ user: response.data.user, isAuthenticated: true });
        } catch {
          // Token invalid, clear auth state
          get().logout();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'edergpt-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

// Initialize auth on app load
useAuthStore.getState().checkAuth();

