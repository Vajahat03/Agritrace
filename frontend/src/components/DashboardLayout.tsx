'use client';

import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Menu, X } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const expectedRole = activePortal.toUpperCase();
    const userRole = user.role?.toUpperCase();

    // Check if user is attempting to access an unauthorized portal
    if (userRole !== expectedRole) {
      const destination =
        userRole === 'FARMER'
          ? '/farmer/dashboard'
          : userRole === 'VENDOR'
          ? '/vendor/dashboard'
          : '/customer/dashboard';
      router.replace(destination);
    }
  }, [activePortal, loading, pathname, router, user]);

  if (loading || !user || user.role?.toUpperCase() !== activePortal.toUpperCase()) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-600">Loading AgriTrace workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9] text-slate-900">
      <Navbar onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 p-4 shadow-2xl flex flex-col justify-between md:hidden border-r border-slate-200 animate-in slide-in-from-left duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <span className="font-bold text-slate-800 text-sm tracking-tight">Portal Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar portal={activePortal} onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        <Sidebar portal={activePortal} />
        <main className="flex-1 min-w-0 space-y-6">
          {(title || actionButton) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                {title && <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>}
                {subtitle && <p className="text-sm text-slate-600 mt-1">{subtitle}</p>}
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
