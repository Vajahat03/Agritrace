'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Language } from '../types';
import {
  Sprout,
  Globe,
  Bell,
  User,
  LogOut,
  ChevronDown,
  ShoppingBag,
  Store,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const [langDropdown, setLangDropdown] = useState(false);

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'mr', label: 'मराठी (Marathi)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'hinglish', label: 'Hinglish' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-sm group-hover:scale-105 transition-transform">
              <Sprout className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                Agri<span className="text-emerald-700">Trace</span>
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                  AI Fresh
                </span>
              </span>
            </div>
          </Link>
        </div>

        {/* Center Portal Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <Link
            href="/farmer/dashboard"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname.startsWith('/farmer')
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'text-slate-600 hover:text-emerald-800 hover:bg-white'
            }`}
          >
            <Sprout className="h-4 w-4 text-emerald-400" />
            Farmer
          </Link>
          <Link
            href="/vendor/dashboard"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname.startsWith('/vendor')
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'text-slate-600 hover:text-amber-800 hover:bg-white'
            }`}
          >
            <Store className="h-4 w-4 text-amber-400" />
            Vendor
          </Link>
          <Link
            href="/customer/dashboard"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname.startsWith('/customer')
                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                : 'text-slate-600 hover:text-sky-800 hover:bg-white'
            }`}
          >
            <ShoppingBag className="h-4 w-4 text-sky-400" />
            Customer
          </Link>
          <Link
            href="/trace/batch/TOM-2026-0001"
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname.startsWith('/trace')
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'text-slate-600 hover:text-purple-800 hover:bg-white'
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-emerald-400 transition-all"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-400" />
              <span>{languages.find((l) => l.code === language)?.label.split(' ')[0]}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {langDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                        : 'text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Profile / Logout */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user.full_name}</p>
                <p className="text-[10px] text-emerald-700 font-medium">{user.role}</p>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
