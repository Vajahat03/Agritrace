'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  Tractor,
  Layers,
  Sprout,
  Calendar,
  CloudSun,
  Bell,
  User,
  Package,
  ShoppingCart,
  ShoppingBag,
  Heart,
  QrCode,
  ScanLine,
  Truck,
  DollarSign,
  Bot,
  Eye,
} from 'lucide-react';

interface SidebarProps {
  portal: 'farmer' | 'vendor' | 'customer';
}

export function Sidebar({ portal }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const farmerNav = [
    { label: t.common.dashboard, href: '/farmer/dashboard', icon: LayoutDashboard },
    { label: t.farmer.myFarms, href: '/farmer/farms', icon: Tractor },
    { label: t.farmer.myCrops, href: '/farmer/crops', icon: Sprout },
    { label: t.farmer.produceBatches, href: '/farmer/batches', icon: Package },
    { label: t.common.weather, href: '/farmer/weather', icon: CloudSun },
    { label: t.common.notifications, href: '/farmer/notifications', icon: Bell },
    { label: 'AI Agents', href: '/farmer/ai-agents', icon: Bot },
    { label: 'Customer View - Preview', href: '/farmer/customer-view', icon: Eye },
  ];

  const vendorNav = [
    { label: t.common.dashboard, href: '/vendor/dashboard', icon: LayoutDashboard },
    { label: t.vendor.inventory, href: '/vendor/inventory', icon: Package },
    { label: t.vendor.procurement, href: '/vendor/procurement', icon: Tractor },
    { label: t.vendor.catalog, href: '/vendor/products', icon: ShoppingCart },
    { label: t.vendor.orders, href: '/vendor/orders', icon: Truck },
    { label: 'AI Agents', href: '/vendor/ai-agents', icon: Bot },
    { label: 'Customer View - Preview', href: '/vendor/customer-view', icon: Eye },
  ];

  const customerNav = [
    { label: t.common.dashboard, href: '/customer/dashboard', icon: LayoutDashboard },
    { label: t.customer.marketplace, href: '/customer/marketplace', icon: ShoppingBag },
    { label: t.customer.freshnessBag, href: '/customer/freshness-bag', icon: ScanLine },
    { label: t.customer.cart, href: '/customer/cart', icon: ShoppingCart },
    { label: t.customer.myOrders, href: '/customer/orders', icon: Package },
    { label: t.customer.favorites, href: '/customer/favorites', icon: Heart },
    { label: 'AI Agents', href: '/customer/ai-agents', icon: Bot },
  ];

  const navItems = portal === 'farmer' ? farmerNav : portal === 'vendor' ? vendorNav : customerNav;

  return (
    <aside className="w-64 shrink-0 hidden md:block">
      <div className="sticky top-20 rounded-2xl glass-card p-4 space-y-6">
        <div>
          <h3 className="px-3 text-xs font-semibold text-emerald-400/80 uppercase tracking-wider mb-2">
            {portal === 'farmer' ? t.farmer.title : portal === 'vendor' ? t.vendor.title : t.customer.title}
          </h3>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-emerald-400/70'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Traceability Banner */}
        <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200 text-xs text-emerald-900">
          <div className="flex items-center gap-2 mb-1.5 text-emerald-800 font-semibold">
            <QrCode className="h-4 w-4 text-emerald-700" />
            <span>Public Traceability</span>
          </div>
          <p className="text-[11px] text-emerald-800/75 mb-2">
            Inspect farm origins, fertilizer logs, and cold-chain transitions.
          </p>
          <Link
            href="/trace/batch/TOM-2026-0001"
            className="inline-block w-full text-center py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium transition-colors"
          >
            Scan Demo Batch →
          </Link>
        </div>
      </div>
    </aside>
  );
}
