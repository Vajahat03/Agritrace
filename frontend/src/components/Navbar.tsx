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
  Menu,
  ShieldCheck,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const [langDropdown, setLangDropdown] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी (Hindi)' },
    { code: 'mr', label: 'मराठी (Marathi)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'hinglish', label: 'Hinglish' },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'FARMER':
        return { label: 'Farmer Portal', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'VENDOR':
        return { label: 'Vendor Portal', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'CUSTOMER':
        return { label: 'Customer Marketplace', color: 'bg-sky-50 text-sky-800 border-sky-200' };
      default:
        return { label: 'AgriTrace', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side: Hamburger (mobile) + Brand Logo */}
        <div className="flex items-center gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden transition-colors"
              aria-label="Open portal navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-xs group-hover:bg-emerald-700 transition-colors">
              <Sprout className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                Agri<span className="text-emerald-700">Trace</span>
              </span>
            </div>
          </Link>

          {/* Active Portal Badge */}
          {user && (
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${roleInfo.color} ml-2`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleInfo.label}
            </span>
          )}
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setLangDropdown(!langDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-all"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              <span>{languages.find((l) => l.code === language)?.label.split(' ')[0]}</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {langDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-slate-200 shadow-lg p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
              <Link
                href={
                  user.role === 'FARMER'
                    ? '/farmer/profile'
                    : user.role === 'VENDOR'
                    ? '/vendor/profile'
                    : '/customer/profile'
                }
                className="hidden lg:flex flex-col text-right hover:opacity-80 transition-opacity"
              >
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user.full_name}</p>
                <p className="text-[10px] text-emerald-700 font-medium capitalize">{user.role.toLowerCase()}</p>
              </Link>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
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
