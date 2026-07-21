import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, Role } from '../types/models';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No se encontró el perfil del usuario autenticado.');
    }

    return data as Profile;
  }

  async function loadProfile(userId?: string) {
    if (!userId) {
      setProfile(null);
      return null;
    }

    try {
      const profileData = await fetchProfile(userId);
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error('No se pudo cargar el perfil', error);
      setProfile(null);
      return null;
    }
  }

  async function refreshProfile() {
    await loadProfile(session?.user.id);
  }

  async function signIn(email: string, password: string) {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (!data.session || !data.user) {
        throw new Error('No se pudo iniciar sesión correctamente.');
      }

      const profileData = await fetchProfile(data.user.id);

      setSession(data.session);
      setProfile(profileData);

      return profileData;
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);

    try {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      setLoading(true);

      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(data.session);

        if (data.session?.user?.id) {
          await loadProfile(data.session.user.id);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('No se pudo inicializar la sesión', error);
        setSession(null);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) return;

        setLoading(true);

        try {
          setSession(nextSession);

          if (nextSession?.user?.id) {
            await loadProfile(nextSession.user.id);
          } else {
            setProfile(null);
          }
        } catch (error) {
          console.error('No se pudo sincronizar la sesión', error);
          setProfile(null);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signIn,
    refreshProfile,
    signOut,
    hasRole: (roles: Role[]) => Boolean(profile && roles.includes(profile.role))
  }), [session, profile, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}