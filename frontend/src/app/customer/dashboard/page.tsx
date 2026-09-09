'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { StatCard } from '../../../components/WeatherWidget';
import { apiClient } from '../../../lib/apiClient';
import { FreshnessBagItem, Order } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import {
  ScanLine,
  ShoppingBag,
  Package,
  Heart,
  Clock,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';

export default function CustomerDashboard() {
  const { t } = useLanguage();
  const [bagItems, setBagItems] = useState<FreshnessBagItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [metrics, setMetrics] = useState({
    activeFreshnessItems: 3,
    itemsExpiringSoon: 1,
    totalOrders: 4,
    savedFavorites: 6,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerDashboard();
  }, []);

  const loadCustomerDashboard = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/customer/dashboard');
      if (res?.data) {
        setMetrics(res.data.metrics || metrics);
        setBagItems(res.data.freshnessBag || []);
        setOrders(res.data.recentOrders || []);
      }
    } catch {
      setBagItems([
        {
          id: 'bag-1',
          customer_id: 'cust-1',
          produce_name: 'Roma Tomatoes (500g)',
          crop_type: 'Tomato',
          current_status: 'ACTIVE',
          storage_recommendation: 'Store at 10-12°C in ventilated container',
          created_at: '2026-09-04T12:00:00Z',
          updated_at: '2026-09-04T12:00:00Z',
          latest_scan: {
            id: 'scan-1',
            bag_id: 'bag-1',
            customer_id: 'cust-1',
            image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
            scan_date: '2026-09-04T12:00:00Z',
            freshness_score: 91.5,
            remaining_shelf_life_days: 2, // Expiring soon
            predicted_use_by_date: '2026-09-08',
            prediction_interval_lower_days: 1,
            prediction_interval_upper_days: 3,
            model_name: 'agritrace-multimodal-shelf-v1',
            model_version: '1.0.0',
          },
        },
        {
          id: 'bag-2',
          customer_id: 'cust-1',
          produce_name: 'Fresh Spinach Bunch',
          crop_type: 'Spinach',
          current_status: 'ACTIVE',
          storage_recommendation: 'Keep dry in paper wrap inside crisper drawer',
          created_at: '2026-09-05T08:00:00Z',
          updated_at: '2026-09-05T08:00:00Z',
          latest_scan: {
            id: 'scan-2',
            bag_id: 'bag-2',
            customer_id: 'cust-1',
            image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80',
            scan_date: '2026-09-05T08:00:00Z',
            freshness_score: 95.0,
            remaining_shelf_life_days: 5,
            predicted_use_by_date: '2026-09-11',
            prediction_interval_lower_days: 4,
            prediction_interval_upper_days: 6,
            model_name: 'agritrace-multimodal-shelf-v1',
            model_version: '1.0.0',
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      portal="customer"
      title="Consumer Freshness & Market Hub"
      subtitle="Track your Digital Freshness Bag, estimated use-by windows, and order farm-verified fresh produce."
      actionButton={
        <div className="flex items-center gap-2">
          <Link
            href="/customer/freshness-bag"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-[#081C15] font-bold text-xs shadow-glow hover:bg-emerald-400"
          >
            <ScanLine className="h-4 w-4" />
            <span>Open Freshness Bag</span>
          </Link>
        </div>
      }
    >
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Digital Freshness Bag"
          value={metrics.activeFreshnessItems}
          subtitle="Items currently tracked"
          icon={ScanLine}
          color="emerald"
        />
        <StatCard
          title="Expiring Soon"
          value={metrics.itemsExpiringSoon}
          subtitle="Use within 48 hours"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Total Orders"
          value={metrics.totalOrders}
          subtitle="Farm-to-table deliveries"
          icon={Package}
          color="sky"
        />
        <StatCard
          title="Saved Favorites"
          value={metrics.savedFavorites}
          subtitle="Preferred organic produce"
          icon={Heart}
          color="purple"
        />
      </div>

      {/* Main Grid: Freshness Bag Summary & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Freshness Bag Section */}
        <div className="rounded-3xl glass-card p-6 border border-emerald-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-emerald-400" />
              <span>Digital Freshness Bag (At Home)</span>
            </h3>
            <Link
              href="/customer/freshness-bag"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Scan / Manage <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {bagItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-emerald-900/60 shrink-0">
                    <img
                      src={item.latest_scan?.image_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200'}
                      alt={item.produce_name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{item.produce_name}</h4>
                    <p className="text-emerald-300/70 text-[11px]">
                      Est. Use-By: <span className="font-semibold text-amber-300">{item.latest_scan?.predicted_use_by_date}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      (item.latest_scan?.remaining_shelf_life_days ?? 5) <= 2
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 glow-amber'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {item.latest_scan?.remaining_shelf_life_days} Days Left
                  </span>
                  <p className="text-[10px] text-emerald-400/80 mt-1">
                    Freshness: {item.latest_scan?.freshness_score}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Marketplace Shortcut */}
        <div className="rounded-3xl glass-card p-6 border border-emerald-800/40 flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 inline-block">
              Direct Farmer Produce
            </span>
            <h3 className="text-xl font-bold text-white leading-tight">
              Order Verified Produce Direct From Harvest
            </h3>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              Explore local farm harvest batches, inspect fertilizer & water history before ordering, and track freshness upon delivery.
            </p>
          </div>

          <Link
            href="/customer/marketplace"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-[#081C15] font-bold text-sm shadow-glow hover:scale-[1.02] transition-all"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Browse Produce Marketplace</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
