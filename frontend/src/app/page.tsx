'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '../components/Navbar';
import { useLanguage } from '../context/LanguageContext';
import {
  Sprout,
  Store,
  ShoppingBag,
  QrCode,
  ShieldCheck,
  Zap,
  Leaf,
  Layers,
  ArrowRight,
  ScanLine,
  CloudSun,
  Activity,
} from 'lucide-react';

export default function LandingPage() {
  const { t } = useLanguage();

  const features = [
    {
      title: 'Farmer Crop & Fertilizer Management',
      desc: 'Multi-crop simultaneous tracking, farm and plot hierarchies, timestamped independent fertilizer history, and harvest batch minting.',
      icon: Sprout,
      href: '/farmer/dashboard',
      color: 'from-emerald-600 to-green-800',
      badge: 'Farmer Portal',
    },
    {
      title: 'Vendor Inventory & Batch Procurement',
      desc: 'Procure directly from farmer produce batches with immutable stock deduction, inventory damage/adjustment tracking, and order fulfillment.',
      icon: Store,
      href: '/vendor/dashboard',
      color: 'from-amber-600 to-yellow-800',
      badge: 'Vendor Portal',
    },
    {
      title: 'Digital Freshness Bag & Marketplace',
      desc: 'Multimodal freshness assessment, calibrated shelf-life uncertainty intervals, re-scan produce lifecycle, and fresh produce store.',
      icon: ShoppingBag,
      href: '/customer/dashboard',
      color: 'from-sky-600 to-cyan-800',
      badge: 'Customer Portal',
    },
    {
      title: 'Farm-to-Consumer QR Traceability',
      desc: 'Inspect origin farm, plot, planting and harvest dates, fertilizer logs, cold-chain handoffs, and verified batch lineage.',
      icon: QrCode,
      href: '/trace/batch/TOM-2026-0001',
      color: 'from-purple-600 to-indigo-800',
      badge: 'Public Traceability',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#061510]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-glow">
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
          <span>Next-Generation Agricultural Freshness & Traceability</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          AI-Powered Multimodal <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-mint to-teal-300 bg-clip-text text-transparent">
            Produce Freshness & Traceability
          </span>
        </h1>

        <p className="text-base sm:text-lg text-emerald-200/80 max-w-3xl mx-auto leading-relaxed">
          AgriTrace bridges farmers, wholesale vendors, and consumers through real-time shelf-life intelligence, immutable batch event ledgers, and seamless farm-to-table traceability.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/farmer/dashboard"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-[#081C15] font-bold text-sm shadow-glow hover:scale-105 transition-all"
          >
            <Sprout className="h-4 w-4" />
            <span>Enter Farmer Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/trace/batch/TOM-2026-0001"
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#132A20] border border-emerald-600/40 text-emerald-200 font-semibold text-sm hover:bg-emerald-900/40 hover:border-emerald-500 transition-all"
          >
            <QrCode className="h-4 w-4 text-emerald-400" />
            <span>Verify Batch Traceability</span>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Full-Platform Ecosystem</h2>
          <p className="text-sm text-emerald-300/70">
            Dedicated portals tailored for agricultural producers, distributors, and smart shoppers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <Link
                key={i}
                href={feat.href}
                className="group rounded-3xl glass-card-interactive p-6 sm:p-8 flex flex-col justify-between border border-emerald-800/40 space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${feat.color} text-white shadow-lg`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700/50 text-emerald-300">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore Portal</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-emerald-900/40 bg-[#081C15]/60 py-8 px-4 text-center text-xs text-emerald-400/60">
        <p>© 2026 AgriTrace Platform. Powered by Supabase PostgreSQL, Next.js, and Decoupled AI Adapters.</p>
      </footer>
    </div>
  );
}
