'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Language, UserRole } from '../types';
import {
  Sprout,
  Globe,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  Store,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

export function Navbar() {
  const { user, logout, switchDemoRole } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const [langDropdown, setLangDropdown] = useState(false);
  const [roleDropdown, setRoleDropdown] = useState(false);

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'mr', label: 'मराठी (Marathi)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'hinglish', label: 'Hinglish' },
  ];

  const roles: { role: UserRole; label: string; icon: any; color: string }[] = [
    { role: 'FARMER', label: 'Farmer Portal', icon: Sprout, color: 'text-emerald-400' },
    { role: 'VENDOR', label: 'Vendor Portal', icon: Store, color: 'text-amber-400' },
    { role: 'CUSTOMER', label: 'Customer Portal', icon: ShoppingBag, color: 'text-sky-400' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-500/20 bg-[#081C15]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-700 shadow-glow group-hover:scale-105 transition-transform">
              <Sprout className="h-6 w-6 text-[#081C15]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Agri<span className="text-emerald-400">Trace</span>
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  AI Fresh
                </span>
              </span>
            </div>
          </Link>
        </div>

        {/* Center Portal Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-emerald-950/40 p-1 rounded-xl border border-emerald-800/40">
          <Link
            href="/farmer/dashboard"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname.startsWith('/farmer')
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'text-emerald-100/70 hover:text-white hover:bg-emerald-900/30'
            }`}
          >
            <Sprout className="h-4 w-4 text-emerald-400" />
            Farmer
          </Link>
          <Link
            href="/vendor/dashboard"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname.startsWith('/vendor')
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                : 'text-emerald-100/70 hover:text-white hover:bg-emerald-900/30'
            }`}
          >
            <Store className="h-4 w-4 text-amber-400" />
            Vendor
          </Link>
          <Link
            href="/customer/dashboard"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname.startsWith('/customer')
                ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40'
                : 'text-emerald-100/70 hover:text-white hover:bg-emerald-900/30'
            }`}
          >
            <ShoppingBag className="h-4 w-4 text-sky-400" />
            Customer
          </Link>
          <Link
            href="/trace/batch/TOM-2026-0001"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname.startsWith('/trace')
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                : 'text-emerald-100/70 hover:text-white hover:bg-emerald-900/30'
            }`}
          >
            <QrCode className="h-4 w-4 text-purple-400" />
            Traceability
          </Link>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangDropdown(!langDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/40 text-xs font-medium text-emerald-200 hover:border-emerald-500/60 transition-all"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-400" />
              <span>{languages.find((l) => l.code === language)?.label.split(' ')[0]}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {langDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0D281E] border border-emerald-600/30 shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setLangDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      language === l.code
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-200 hover:bg-emerald-800/40'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdown(!roleDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline font-semibold">{user?.role || 'FARMER'}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {roleDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0D281E] border border-emerald-600/30 shadow-2xl p-1.5 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Switch Active Portal
                </div>
                {roles.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.role}
                      onClick={() => {
                        switchDemoRole(r.role);
                        setRoleDropdown(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        user?.role === r.role
                          ? 'bg-emerald-600/40 text-white border border-emerald-500/40'
                          : 'text-emerald-200 hover:bg-emerald-800/40'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${r.color}`} />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Profile / Logout */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-emerald-800/50">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold text-white leading-tight">{user.full_name}</p>
                <p className="text-[10px] text-emerald-400 font-medium">{user.role}</p>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 hover:text-red-400 hover:border-red-500/40 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg bg-emerald-500 text-[#081C15] font-semibold text-xs hover:bg-emerald-400 transition-colors shadow-glow"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
