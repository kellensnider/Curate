import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  clearAuthToken,
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  setAuthToken,
  signup as apiSignup,
  type AuthUser,
} from '../lib/api';

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  userName: string;
  userEmail: string;
  loading: boolean;
  error: string | null;
  hydrateUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function userState(user: AuthUser) {
  return {
    isAuthenticated: true,
    user,
    userName: user.name,
    userEmail: user.email,
    error: null,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      userName: '',
      userEmail: '',
      loading: false,
      error: null,

      hydrateUser: async () => {
        set({ loading: true });
        try {
          const { user } = await getCurrentUser();
          set({ ...userState(user), loading: false });
        } catch {
          clearAuthToken();
          set({
            isAuthenticated: false,
            user: null,
            userName: '',
            userEmail: '',
            loading: false,
          });
        }
      },

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { user, token } = await apiLogin(email, password);
          setAuthToken(token);
          set({ ...userState(user), loading: false });
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : 'Login failed' });
          throw err;
        }
      },

      signup: async (name, email, password) => {
        set({ loading: true, error: null });
        try {
          const { user, token } = await apiSignup(name, email, password);
          setAuthToken(token);
          set({ ...userState(user), loading: false });
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : 'Signup failed' });
          throw err;
        }
      },

      signOut: async () => {
        try {
          await apiLogout();
        } catch {
          /* local logout still succeeds if backend is unavailable */
        }
        clearAuthToken();
        set({
          isAuthenticated: false,
          user: null,
          userName: '',
          userEmail: '',
          error: null,
        });
      },
    }),
    {
      name: 'curate-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        userName: state.userName,
        userEmail: state.userEmail,
      }),
    },
  ),
);
