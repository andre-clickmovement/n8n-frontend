import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User, AuthState } from '../types';
import type { Session, AuthError } from '@supabase/supabase-js';

// Check if we're in demo mode (no Supabase configured)
const isDemoMode = !import.meta.env.VITE_SUPABASE_URL ||
                   import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co';

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ error: Error | null }>;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo user for testing without Supabase
const DEMO_USER: User = {
  id: 'demo-user-123',
  email: 'demo@voiceclone.app',
  full_name: 'Demo User',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from our users table
  const fetchUserProfile = useCallback(async (userId: string): Promise<User | null> => {
    if (isDemoMode) return DEMO_USER;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data as User;
  }, []);

  // Create user profile in our users table
  const createUserProfile = useCallback(async (
    userId: string,
    email: string,
    fullName: string
  ): Promise<User | null> => {
    if (isDemoMode) return { ...DEMO_USER, email, full_name: fullName };

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return data as User;
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (isDemoMode) {
      // In demo mode, start not authenticated
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Safety timeout - never stay loading forever
    const timeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth initialization timeout - forcing load complete');
        setIsLoading(false);
      }
    }, 5000);

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          if (isMounted) setIsLoading(false);
          return;
        }

        if (isMounted) {
          setSession(session);
          if (session?.user) {
            try {
              const profile = await fetchUserProfile(session.user.id);
              if (isMounted) setUser(profile);
            } catch (profileError) {
              console.error('Error fetching profile:', profileError);
            }
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setSession(session);

        if (session?.user) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            if (isMounted) setUser(profile);
          } catch (err) {
            console.error('Error fetching profile on auth change:', err);
          }
        } else {
          setUser(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error: AuthError | null }> => {
    setIsLoading(true);

    if (isDemoMode) {
      // Demo mode: instant sign up
      const demoUser = { ...DEMO_USER, email, full_name: fullName };
      setUser(demoUser);
      setSession({ user: { id: demoUser.id } } as Session);
      setIsLoading(false);
      return { error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      return { error };
    }

    // Create user profile in our users table
    if (data.user) {
      await createUserProfile(data.user.id, email, fullName);
    }

    setIsLoading(false);
    return { error: null };
  }, [createUserProfile]);

  const signIn = useCallback(async (
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> => {
    setIsLoading(true);

    if (isDemoMode) {
      // Demo mode: instant sign in
      const demoUser = { ...DEMO_USER, email };
      setUser(demoUser);
      setSession({ user: { id: demoUser.id } } as Session);
      setIsLoading(false);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);

    if (!isDemoMode) {
      await supabase.auth.signOut();
    }

    setUser(null);
    setSession(null);
    setIsLoading(false);
  }, []);

  const updateProfile = useCallback(async (
    data: Partial<User>
  ): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    if (isDemoMode) {
      setUser({ ...user, ...data });
      return { error: null };
    }

    const { error } = await supabase
      .from('users')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      return { error };
    }

    // Refresh user data
    const updatedProfile = await fetchUserProfile(user.id);
    if (updatedProfile) {
      setUser(updatedProfile);
    }

    return { error: null };
  }, [user, fetchUserProfile]);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!session && !!user,
    signUp,
    signIn,
    signOut,
    updateProfile,
    isDemoMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
