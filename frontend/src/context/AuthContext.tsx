'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { apiClient } from '../lib/apiClient';
import { UserProfile, UserRole } from '../types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  signup: (data: { email: string; password: string; fullName: string; role: UserRole; phone?: string; address?: string }) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Load user session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          // Fetch synced profile from backend
          const res: any = await apiClient.get('/auth/me');
          setUser(res.data);
        } else {
          // Check local storage for simulated demo user
          const savedDemo = localStorage.getItem('agritrace_demo_user');
          if (savedDemo) {
            setUser(JSON.parse(savedDemo));
          } else {
            // Default initial demo user: Farmer
            const defaultFarmer: UserProfile = {
              id: '00000000-0000-0000-0000-000000000001',
              email: 'farmer@agritrace.dev',
              full_name: 'Ramesh Patil (Kisan)',
              role: 'FARMER',
              language_preference: 'en',
              phone: '+91 98230 11223',
              address: 'Green Meadows Farm, Nashik, Maharashtra',
            };
            setUser(defaultFarmer);
            localStorage.setItem('agritrace_demo_user', JSON.stringify(defaultFarmer));
          }
        }
      } catch (err) {
        console.warn('Session init warning:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const res: any = await apiClient.get('/auth/me');
          setUser(res.data);
        } catch {
          // Fallback
        }
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string, fallbackRole: UserRole = 'FARMER') => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Fallback for demo testing when Supabase credentials are placeholder
        const demoUser: UserProfile = {
          id: `demo-${fallbackRole.toLowerCase()}-id`,
          email,
          full_name: email.split('@')[0],
          role: fallbackRole,
          language_preference: 'en',
        };
        setUser(demoUser);
        localStorage.setItem('agritrace_demo_user', JSON.stringify(demoUser));
      } else if (data.user) {
        const res: any = await apiClient.get('/auth/me');
        setUser(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    phone?: string;
    address?: string;
  }) => {
    setLoading(true);
    try {
      const { data: authResult, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: data.role,
            phone: data.phone,
          },
        },
      });

      if (error) {
        // Fallback demo user simulation
        const demoUser: UserProfile = {
          id: `demo-${data.role.toLowerCase()}-${Date.now()}`,
          email: data.email,
          full_name: data.fullName,
          role: data.role,
          language_preference: 'en',
          phone: data.phone,
          address: data.address,
        };
        setUser(demoUser);
        localStorage.setItem('agritrace_demo_user', JSON.stringify(demoUser));
      } else if (authResult.user) {
        // Sync profile to public.users via backend
        await apiClient.post('/auth/sync-profile', {
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          phone: data.phone,
          address: data.address,
        });
        const res: any = await apiClient.get('/auth/me');
        setUser(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('agritrace_demo_user');
    setUser(null);
    router.push('/login');
  };

  const switchDemoRole = (role: UserRole) => {
    const roleProfiles: Record<UserRole, UserProfile> = {
      FARMER: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'farmer@agritrace.dev',
        full_name: 'Ramesh Patil (Kisan)',
        role: 'FARMER',
        language_preference: 'en',
        phone: '+91 98230 11223',
        address: 'Green Meadows Farm, Nashik, Maharashtra',
      },
      VENDOR: {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'vendor@agritrace.dev',
        full_name: 'FreshDirect Organics (Vendor)',
        role: 'VENDOR',
        language_preference: 'en',
        phone: '+91 99341 55667',
        address: 'Vashi APMC Market, Navi Mumbai',
      },
      CUSTOMER: {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'customer@agritrace.dev',
        full_name: 'Priya Sharma (Consumer)',
        role: 'CUSTOMER',
        language_preference: 'en',
        phone: '+91 98112 33445',
        address: 'Bandra West, Mumbai, Maharashtra 400050',
      },
      BUYER: {
        id: '00000000-0000-0000-0000-000000000004',
        email: 'buyer@agritrace.dev',
        full_name: 'Wholesale Agri Buyer',
        role: 'BUYER',
        language_preference: 'en',
      },
      TRANSPORTER: {
        id: '00000000-0000-0000-0000-000000000005',
        email: 'logistics@agritrace.dev',
        full_name: 'ColdChain Agro Logistics',
        role: 'TRANSPORTER',
        language_preference: 'en',
      },
      ADMIN: {
        id: '00000000-0000-0000-0000-000000000006',
        email: 'admin@agritrace.dev',
        full_name: 'AgriTrace Platform Administrator',
        role: 'ADMIN',
        language_preference: 'en',
      },
    };

    const newProfile = roleProfiles[role] || roleProfiles.FARMER;
    setUser(newProfile);
    localStorage.setItem('agritrace_demo_user', JSON.stringify(newProfile));

    if (role === 'FARMER') router.push('/farmer/dashboard');
    else if (role === 'VENDOR') router.push('/vendor/dashboard');
    else if (role === 'CUSTOMER') router.push('/customer/dashboard');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
