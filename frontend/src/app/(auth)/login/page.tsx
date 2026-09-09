'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { UserRole } from '../../../types';
import { Sprout, LogIn, Lock, Mail, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('farmer@agritrace.dev');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<UserRole>('FARMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password, role);
      if (role === 'FARMER') router.push('/farmer/dashboard');
      else if (role === 'VENDOR') router.push('/vendor/dashboard');
      else router.push('/customer/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#061510] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl glass-card border border-emerald-500/30 p-8 space-y-6 shadow-2xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-700 text-[#081C15] shadow-glow mb-1">
            <Sprout className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign In to AgriTrace</h2>
          <p className="text-xs text-emerald-300/70">
            Access your Farmer, Vendor, or Customer dashboard
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-emerald-300 font-medium mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-emerald-400/60" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@agritrace.dev"
                className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 pl-9 pr-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-emerald-300 font-medium mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-emerald-400/60" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 pl-9 pr-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-emerald-300 font-medium mb-1">Login Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none font-medium"
            >
              <option value="FARMER">Farmer (Kisan Portal)</option>
              <option value="VENDOR">Vendor (Wholesale & Distribution)</option>
              <option value="CUSTOMER">Customer (Consumer Freshness & Shop)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-[#081C15] font-bold text-sm shadow-glow transition-all disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-emerald-300/70 pt-2 border-t border-emerald-900/50">
          Don't have an account?{' '}
          <Link href="/signup" className="text-emerald-400 font-semibold hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
