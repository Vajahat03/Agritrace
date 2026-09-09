'use client';

import { useEffect, useState } from 'react';
import { Eye, Loader2, PackageSearch, RefreshCw } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { DashboardLayout } from './DashboardLayout';

type Portal = 'farmer' | 'vendor';

export function CustomerViewPreview({ portal }: { portal: Portal }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = async () => {
    setLoading(true); setError(null);
    try {
      const response: any = await apiClient.get('/customer/marketplace');
      const payload = response?.data || response;
      setProducts(Array.isArray(payload) ? payload : payload?.products || payload?.data || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load the marketplace preview.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadProducts(); }, []);

  return (
    <DashboardLayout portal={portal} title="Customer View - Preview" subtitle="A read-only look at the customer marketplace. Your role and permissions do not change.">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5"><div className="flex items-start gap-3"><Eye className="h-6 w-6 text-sky-700" /><div><h2 className="font-semibold text-sky-950">Customer experience preview</h2><p className="mt-1 text-sm text-sky-800">This view uses public marketplace data only. It cannot place orders, edit listings, or impersonate a customer.</p></div></div></div>
      {loading && <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading available products...</div>}
      {error && <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button onClick={() => void loadProducts()} className="flex items-center gap-1 font-semibold"><RefreshCw className="h-4 w-4" />Retry</button></div>}
      {!loading && !error && products.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><PackageSearch className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-3 font-semibold text-slate-900">No products available yet</h2><p className="mt-1 text-sm text-slate-600">Customer marketplace cards appear when sellers publish available inventory.</p></div>}
      {!loading && !error && products.length > 0 && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.slice(0, 12).map((product, index) => <article key={product.id || index} className="glass-card rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{product.name || product.product_name || 'Marketplace produce'}</h3><p className="mt-1 text-xs text-slate-500">{product.category || product.crop_type || 'AgriTrace listing'}</p></div><span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800">Available</span></div><div className="mt-4 space-y-1 text-sm text-slate-600"><p>Seller: {product.vendor?.business_name || product.vendor?.full_name || product.farmer?.full_name || 'Registered seller'}</p><p>Quantity: {product.available_quantity ?? product.quantity ?? 'See listing'}</p><p>Price: {product.price_per_unit ? `₹${product.price_per_unit}` : 'Contact seller'}</p></div></article>)}</div>}
    </DashboardLayout>
  );
}
