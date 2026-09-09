'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '../lib/apiClient';
import { DashboardLayout } from './DashboardLayout';
import { MapPin, Phone, RefreshCw, Search, Store, Warehouse } from 'lucide-react';

interface VendorSummary {
  id: string;
  full_name: string;
  phone?: string;
  address?: string;
  inventory_count: number;
}

export function VendorDirectory() {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVendors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.get('/farmer/vendors');
      const payload = response?.data || response;
      setVendors(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Could not load registered vendors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVendors();
  }, []);

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) => `${vendor.full_name} ${vendor.address || ''}`.toLowerCase().includes(query));
  }, [search, vendors]);

  return (
    <DashboardLayout portal="farmer" title="Vendors" subtitle="Browse registered vendors and view their public stock and godown information.">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3"><Store className="mt-0.5 h-6 w-6 text-emerald-700" /><div><h2 className="font-semibold text-emerald-950">Registered vendor directory</h2><p className="mt-1 text-sm text-emerald-800">Only vendors with a completed public profile appear here. Editing vendor inventory remains restricted to the vendor.</p></div></div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendor name or location" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        <button onClick={() => void loadVendors()} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-800"><RefreshCw className="h-4 w-4" />Refresh</button>
      </div>

      {loading && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {!loading && !error && filteredVendors.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Store className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-3 font-semibold text-slate-900">No vendors available yet</h2><p className="mt-1 text-sm text-slate-600">Registered vendors will appear once they complete their public profile.</p></div>}
      {!loading && !error && filteredVendors.length > 0 && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredVendors.map((vendor) => <article key={vendor.id} className="glass-card rounded-2xl p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><Store className="h-5 w-5" /></div><div><h3 className="font-semibold text-slate-900">{vendor.full_name}</h3><p className="mt-1 text-xs text-emerald-700">Registered vendor</p></div></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800">Public profile</span></div><div className="mt-5 space-y-2 text-sm text-slate-600"><p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{vendor.address}</p>{vendor.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-700" /><a href={`tel:${vendor.phone}`} className="text-emerald-800 hover:underline">{vendor.phone}</a></p>}<p className="flex items-center gap-2"><Warehouse className="h-4 w-4 text-emerald-700" />{vendor.inventory_count} stock {vendor.inventory_count === 1 ? 'item' : 'items'}</p></div><Link href={`/farmer/vendors/${vendor.id}`} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">View stock and godown</Link></article>)}</div>}
    </DashboardLayout>
  );
}
