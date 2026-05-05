import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch, GOOGLE_CLIENT_ID } from '../lib/api';

interface AetherUser {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  isGuest?: boolean;
}

interface AuthCtx {
  user: AetherUser | null;
  loading: boolean;
  gisReady: boolean;
  handleGoogleCredential: (credential: string) => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
}

const GUEST_USER: AetherUser = {
  uid: 'guest',
  email: 'guest@aether.local',
  name: 'Guest',
  isGuest: true,
};

const AUTH_KEY = 'aether_auth_user';
const TOKEN_KEY = 'aether_auth_token';

function decodeGoogleJWT(token: string): AetherUser {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  const payload = JSON.parse(jsonPayload);
  return {
    uid: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  gisReady: false,
  handleGoogleCredential: async () => {},
  continueAsGuest: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AetherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [gisReady, setGisReady] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: AetherUser | null }>('/auth/me');
      const serverUser = data?.user ?? null;
      if (serverUser) {
        setUser(serverUser);
        localStorage.setItem(AUTH_KEY, JSON.stringify(serverUser));
        return;
      }
    } catch {
      // server unreachable — fall through to cached
    }
    // Fall back to cached user (localStorage)
    try {
      const cached = localStorage.getItem(AUTH_KEY);
      if (cached) setUser(JSON.parse(cached));
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [fetchMe]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existingScript = document.getElementById('gsi-script');
    if (existingScript) { setGisReady(true); return; }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGisReady(true);
    document.head.appendChild(script);
  }, []);

  const handleGoogleCredential = useCallback(async (credential: string) => {
    // Decode JWT immediately so UI updates right away
    const decoded = decodeGoogleJWT(credential);
    setUser(decoded);
    localStorage.setItem(AUTH_KEY, JSON.stringify(decoded));
    localStorage.setItem(TOKEN_KEY, credential);

    // Establish server session so /generate works
    try {
      const data = await apiFetch<{ user: AetherUser }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ id_token: credential }),
      });
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
      }
    } catch {
      // Keep the locally decoded user if backend fails
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setUser(GUEST_USER);
    localStorage.setItem(AUTH_KEY, JSON.stringify(GUEST_USER));
  }, []);

  const signOut = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, gisReady, handleGoogleCredential, continueAsGuest, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
