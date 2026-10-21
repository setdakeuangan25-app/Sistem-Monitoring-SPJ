import { createClient, type Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Cek apakah kredensial Supabase nyata sudah disetel
export const isRealSupabase = Boolean(
  url && key && url !== 'http://localhost:54321' && !url.includes('your-project-id')
);

// App selalu siap dijalankan (menggunakan mock storage jika Supabase belum dikonfigurasi)
export const isConfigured = true;

// Real client atau fallback client
const realClient = createClient(url || 'http://localhost:54321', key || 'missing-key');

type AuthListener = (event: string, session: Session | null) => void;
const authListeners = new Set<AuthListener>();

function notifyAuth(event: string, session: Session | null) {
  authListeners.forEach((fn) => {
    try {
      fn(event, session);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
}

function getStoredMockSession(): Session | null {
  try {
    const raw = localStorage.getItem('spj_mock_session');
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function createMockSession(email: string): Session {
  return {
    access_token: 'mock-access-token-' + Date.now(),
    refresh_token: 'mock-refresh-token-' + Date.now(),
    expires_in: 3600 * 24 * 7,
    token_type: 'bearer',
    user: {
      id: 'mock-user-uuid',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: email || 'setdakeuangan25@gmail.com',
    },
  };
}

// Proxy auth untuk mode demo / mock bila Supabase belum dihubungkan
const mockAuth = {
  async getSession() {
    return { data: { session: getStoredMockSession() }, error: null };
  },
  async signInWithPassword({ email }: { email: string; password?: string }) {
    const session = createMockSession(email);
    try {
      localStorage.setItem('spj_mock_session', JSON.stringify(session));
    } catch (e) {
      console.warn('Could not save session to localStorage:', e);
    }
    notifyAuth('SIGNED_IN', session);
    return { data: { user: session.user, session }, error: null };
  },
  async signOut() {
    try {
      localStorage.removeItem('spj_mock_session');
    } catch (e) {
      console.warn('Could not remove session from localStorage:', e);
    }
    notifyAuth('SIGNED_OUT', null);
    return { error: null };
  },
  onAuthStateChange(callback: AuthListener) {
    authListeners.add(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
          },
        },
      },
    };
  },
};

export const supabase = isRealSupabase
  ? realClient
  : (new Proxy(realClient, {
      get(target, prop, receiver) {
        if (prop === 'auth') {
          return mockAuth;
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as typeof realClient);
