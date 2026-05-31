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
  /** Plaintext Curate password, kept in memory only (never persisted) so the
   *  subscription-automation agent can reuse it. Cleared on sign-out/refresh. */
  accountPassword: string | null;
  loading: boolean;
  error: string | null;
  hydrateUser: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// The Curate password is kept in sessionStorage (per-tab, cleared on tab close
// and sign-out) so the automation agent can reuse it across a refresh — but it
// never lands in localStorage.
const PW_KEY = 'curate-pw';
function readSessionPw(): string | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem(PW_KEY) : null;
  } catch {
    return null;
  }
}
function writeSessionPw(pw: string | null) {
  try {
    if (typeof window === 'undefined') return;
    if (pw) window.sessionStorage.setItem(PW_KEY, pw);
    else window.sessionStorage.removeItem(PW_KEY);
  } catch {
    /* ignore */
  }
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
      accountPassword: readSessionPw(),
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

      setUser: (user) => set(userState(user)),

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { user, token } = await apiLogin(email, password);
          setAuthToken(token);
          writeSessionPw(password);
          set({ ...userState(user), accountPassword: password, loading: false });
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
          writeSessionPw(password);
          set({ ...userState(user), accountPassword: password, loading: false });
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
        writeSessionPw(null);
        set({
          isAuthenticated: false,
          user: null,
          userName: '',
          userEmail: '',
          accountPassword: null,
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
