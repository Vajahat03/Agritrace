'use client';

import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  portal?: 'farmer' | 'vendor' | 'customer';
  role?: 'farmer' | 'vendor' | 'customer';
  title?: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export function DashboardLayout({
  children,
  portal,
  role,
  title,
  subtitle,
  actionButton,
}: DashboardLayoutProps) {
  const activePortal = portal || role || 'customer';
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const expectedRole = activePortal.toUpperCase();
    if (!user) {
      router.replace('/login');
    } else if (user.role !== expectedRole) {
      const destination = user.role === 'FARMER' ? '/farmer/dashboard' : user.role === 'VENDOR' ? '/vendor/dashboard' : '/customer/dashboard';
      router.replace(destination);
    }
  }, [activePortal, loading, pathname, router, user]);

  if (loading || !user || user.role !== activePortal.toUpperCase()) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-emerald-700">Loading your workspace...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        <Sidebar portal={activePortal} />
        <main className="flex-1 min-w-0 space-y-6">
          {(title || actionButton) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
              <div>
                {title && <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>}
                {subtitle && <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>}
              </div>
              {actionButton && <div>{actionButton}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
