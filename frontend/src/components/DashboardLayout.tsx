'use client';

import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

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
  return (
    <div className="min-h-screen flex flex-col bg-[#061510]">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        <Sidebar portal={activePortal} />
        <main className="flex-1 min-w-0 space-y-6">
          {(title || actionButton) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-emerald-900/40">
              <div>
                {title && <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>}
                {subtitle && <p className="text-sm text-emerald-300/70 mt-0.5">{subtitle}</p>}
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
