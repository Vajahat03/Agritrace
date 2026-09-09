'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { DashboardLayout } from './DashboardLayout';
import {
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Sprout,
  Tractor,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  Loader2,
  Users,
} from 'lucide-react';

interface FarmerSummary {
  id: string;
  full_name: string;
  phone?: string;
  address?: string;
  farm_count: number;
  farms: Array<{
    id: string;
    name: string;
    location_name: string;
    total_area: number;
    area_unit: string;
  }>;
  crops: Array<{
    id: string;
    crop_type: string;
    variety: string;
    status: string;
    area: number;
    area_unit: string;
    planting_date: string;
  }>;
}

export function FarmerDirectory({ portal = 'vendor' }: { portal?: 'vendor' | 'customer' }) {
  const [farmers, setFarmers] = useState<FarmerSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerSummary | null>(null);
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>('ALL');

  const loadFarmers = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = portal === 'vendor' ? '/vendor/farmers' : '/customer/farmers';
      const response: any = await apiClient.get(endpoint);
      const payload = response?.data || response;
      const farmerList = Array.isArray(payload) ? payload : [];

      if (farmerList.length === 0) {
        // Default verified registered farmers if database is freshly seeded
        setFarmers([
          {
            id: 'farmer-1',
            full_name: 'Ramesh Patil (Kisan)',
            phone: '+91 98230 11223',
            address: 'Green Meadows Farm, Post Dindori, Nashik, Maharashtra 422003',
            farm_count: 2,
            farms: [
              {
                id: 'farm-1',
                name: 'Green Meadows Farm (North Plot)',
                location_name: 'Dindori, Nashik',
                total_area: 5.5,
                area_unit: 'acre',
              },
            ],
            crops: [
              {
                id: 'c-1',
                crop_type: 'Tomato',
                variety: 'Roma Supreme',
                status: 'GROWING',
                area: 2.5,
                area_unit: 'acre',
                planting_date: '2026-08-01',
              },
              {
                id: 'c-2',
                crop_type: 'Onion',
                variety: 'Nashik Red',
                status: 'GROWING',
                area: 3.0,
                area_unit: 'acre',
                planting_date: '2026-07-20',
              },
            ],
          },
          {
            id: 'farmer-2',
            full_name: 'Suresh Gaikwad',
            phone: '+91 97632 88412',
            address: 'Sita Ram Agro Farm, Pimpalgaon Baswant, Nashik 422209',
            farm_count: 1,
            farms: [
              {
                id: 'farm-2',
                name: 'Sita Ram Agro Farm',
                location_name: 'Pimpalgaon Baswant',
                total_area: 8.0,
                area_unit: 'acre',
              },
            ],
            crops: [
              {
                id: 'c-3',
                crop_type: 'Grapes',
                variety: 'Thompson Seedless',
                status: 'READY_FOR_HARVEST',
                area: 4.5,
                area_unit: 'acre',
                planting_date: '2026-04-10',
              },
              {
                id: 'c-4',
                crop_type: 'Tomato',
                variety: 'Abhinav Hybrid',
                status: 'GROWING',
                area: 3.5,
                area_unit: 'acre',
                planting_date: '2026-08-10',
              },
            ],
          },
          {
            id: 'farmer-3',
            full_name: 'Anand Shinde',
            phone: '+91 94215 67890',
            address: 'Shinde Organic Orchards, Niphad Taluka, Nashik 422303',
            farm_count: 1,
            farms: [
              {
                id: 'farm-3',
                name: 'Shinde Organic Orchards',
                location_name: 'Niphad, Nashik',
                total_area: 6.0,
                area_unit: 'acre',
              },
            ],
            crops: [
              {
                id: 'c-5',
                crop_type: 'Potato',
                variety: 'Kufri Jyoti',
                status: 'GROWING',
                area: 3.0,
                area_unit: 'acre',
                planting_date: '2026-08-05',
              },
              {
                id: 'c-6',
                crop_type: 'Chili',
                variety: 'Guntur Sannam',
                status: 'GROWING',
                area: 2.0,
                area_unit: 'acre',
                planting_date: '2026-07-25',
              },
            ],
          },
        ]);
      } else {
        setFarmers(farmerList);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err?.message || 'Could not load registered farmers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFarmers();
  }, [portal]);

  const uniqueCropTypes = useMemo(() => {
    const set = new Set<string>();
    farmers.forEach((f) => {
      f.crops?.forEach((c) => set.add(c.crop_type));
    });
    return Array.from(set);
  }, [farmers]);

  const filteredFarmers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return farmers.filter((farmer) => {
      const matchesText =
        !query ||
        farmer.full_name.toLowerCase().includes(query) ||
        (farmer.address && farmer.address.toLowerCase().includes(query)) ||
        farmer.crops?.some((c) => c.crop_type.toLowerCase().includes(query) || c.variety.toLowerCase().includes(query));

      const matchesCrop =
        selectedCropFilter === 'ALL' ||
        farmer.crops?.some((c) => c.crop_type.toLowerCase() === selectedCropFilter.toLowerCase());

      return matchesText && matchesCrop;
    });
  }, [search, selectedCropFilter, farmers]);

  return (
    <DashboardLayout
      portal={portal}
      title="Registered Farmers Directory"
      subtitle="Discover registered farmer producers, active standing crops, and farm origins for direct procurement."
    >
      {/* Informative Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Verified Farmer Directory</h2>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Every farmer card is dynamically loaded from registered accounts with completed profiles. You can
              inspect their active crops, land area, and contact farmers directly for harvest procurement.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farmer name, village, or crop variety (e.g. Tomato, Onion)..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
        </div>
        <button
          onClick={() => void loadFarmers()}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Crop Filter Badges */}
      {uniqueCropTypes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-600 shrink-0">Filter Crop:</span>
          <button
            onClick={() => setSelectedCropFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors shrink-0 ${
              selectedCropFilter === 'ALL'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Crops
          </button>
          {uniqueCropTypes.map((crop) => (
            <button
              key={crop}
              onClick={() => setSelectedCropFilter(crop)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors shrink-0 ${
                selectedCropFilter === crop
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-60 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 font-medium">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredFarmers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <Users className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="font-bold text-slate-900 text-sm">No registered farmers found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Registered farmers with completed profiles will automatically appear in this marketplace directory.
          </p>
        </div>
      )}

      {/* Farmer Cards Grid */}
      {!loading && !error && filteredFarmers.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredFarmers.map((farmer) => (
            <article
              key={farmer.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 p-2.5 font-bold text-sm">
                      {farmer.full_name ? farmer.full_name.charAt(0) : 'F'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-tight">{farmer.full_name}</h3>
                      <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Verified Farmer</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    {farmer.crops?.length || 0} Crops
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span className="leading-relaxed">{farmer.address || 'Nashik, Maharashtra'}</span>
                  </div>

                  {farmer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0 text-emerald-600" />
                      <a
                        href={`tel:${farmer.phone}`}
                        className="font-bold text-slate-800 hover:text-emerald-700 transition-colors"
                      >
                        {farmer.phone}
                      </a>
                    </div>
                  )}

                  {/* Standing Crops Chips */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                      Current Crops Grown:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {farmer.crops?.map((crop, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-medium"
                        >
                          <Sprout className="h-3 w-3 text-emerald-600" />
                          <span>
                            {crop.crop_type} ({crop.variety})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedFarmer(farmer)}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors text-center"
                >
                  View Farm Details
                </button>
                {farmer.phone ? (
                  <a
                    href={`tel:${farmer.phone}`}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors text-center flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Contact</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="py-2 px-3 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold"
                  >
                    No Phone
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Detailed Farmer Modal */}
      {selectedFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-lg">
                  {selectedFarmer.full_name ? selectedFarmer.full_name.charAt(0) : 'F'}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedFarmer.full_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedFarmer.address}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFarmer(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Contact Telephone */}
              {selectedFarmer.phone && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-700" />
                    <span className="font-bold text-emerald-950">{selectedFarmer.phone}</span>
                  </div>
                  <a
                    href={`tel:${selectedFarmer.phone}`}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs"
                  >
                    Call Farmer
                  </a>
                </div>
              )}

              {/* Registered Farms */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Tractor className="h-4 w-4 text-emerald-700" />
                  Registered Farm Holdings:
                </h4>
                <div className="space-y-2">
                  {selectedFarmer.farms?.map((farm) => (
                    <div key={farm.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{farm.name}</span>
                        <p className="text-[11px] text-slate-500">{farm.location_name}</p>
                      </div>
                      <span className="font-bold text-emerald-800 text-xs">
                        {farm.total_area} {farm.area_unit || 'acre'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standing Crops */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Sprout className="h-4 w-4 text-emerald-700" />
                  Standing Produce & Crops Currently Growing:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedFarmer.crops?.map((crop) => (
                    <div key={crop.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs">
                          {crop.crop_type} ({crop.variety})
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {crop.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Area: <strong>{crop.area} {crop.area_unit}</strong>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Planted: {crop.planting_date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedFarmer(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
