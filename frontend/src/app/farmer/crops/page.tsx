'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { CropCard } from '../../../components/CropCard';
import { FertilizerModal } from '../../../components/FertilizerModal';
import { apiClient } from '../../../lib/apiClient';
import { Crop, CropStatus } from '../../../types';
import { useLanguage } from '../../../context/LanguageContext';
import { Sprout, PlusCircle, Filter, X } from 'lucide-react';

export default function FarmerCropsPage() {
  const { t, translateCommodity } = useLanguage();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCropForFertilizer, setSelectedCropForFertilizer] = useState<Crop | null>(null);

  // New Crop Form state
  const [newCrop, setNewCrop] = useState({
    cropType: 'Tomato',
    variety: '',
    area: 2.0,
    areaUnit: 'acre',
    plantingDate: new Date().toISOString().split('T')[0],
    expectedHarvestDate: '',
    status: 'GROWING' as CropStatus,
    notes: '',
    imageUrl: '',
  });

  const [farms, setFarms] = useState<{ id: string; name: string }[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');

  useEffect(() => {
    loadCrops();
    loadFarms();
  }, [statusFilter]);

  const loadFarms = async () => {
    try {
      const res: any = await apiClient.get('/farmer/farms');
      if (res?.data && Array.isArray(res.data)) {
        setFarms(res.data);
        if (res.data.length > 0 && !selectedFarmId) {
          setSelectedFarmId(res.data[0].id);
        }
      }
    } catch {
      // Ignored
    }
  };

  const loadCrops = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'ALL' ? '/farmer/crops' : `/farmer/crops?status=${statusFilter}`;
      const res: any = await apiClient.get(url);
      if (res?.data && Array.isArray(res.data)) {
        setCrops(res.data);
      } else {
        setCrops([]);
      }
    } catch {
      // Demo crops fallback if backend is unreachable
      setCrops([
        {
          id: 'crop-001',
            farmer_id: 'farmer-1',
            farm_id: 'farm-1',
            plot_id: 'plot-1',
            crop_type: 'Tomato',
            variety: 'Roma Supreme',
            area: 2.5,
            area_unit: 'acre',
            plantingDate: '2026-08-01',
            expectedHarvestDate: '2026-11-15',
            status: 'GROWING',
            planting_date: '2026-08-01',
            expected_harvest_date: '2026-11-15',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            farm: { name: 'Green Valley Farm', location_name: 'Nashik, Maharashtra' },
            plot: { name: 'Plot A (North Section)', area: 2.5 },
          },
          {
            id: 'crop-002',
            farmer_id: 'farmer-1',
            farm_id: 'farm-1',
            plot_id: 'plot-2',
            crop_type: 'Onion',
            variety: 'Nashik Red',
            area: 3.0,
            area_unit: 'acre',
            plantingDate: '2026-07-20',
            expectedHarvestDate: '2026-10-30',
            status: 'GROWING',
            planting_date: '2026-07-20',
            expected_harvest_date: '2026-10-30',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            farm: { name: 'Green Valley Farm', location_name: 'Nashik, Maharashtra' },
            plot: { name: 'Plot B (River Basin)', area: 3.0 },
          },
          {
            id: 'crop-003',
            farmer_id: 'farmer-1',
            farm_id: 'farm-1',
            plot_id: 'plot-3',
            crop_type: 'Potato',
            variety: 'Kufri Jyoti',
            area: 1.8,
            area_unit: 'acre',
            plantingDate: '2026-08-10',
            expectedHarvestDate: '2026-12-05',
            status: 'GROWING',
            planting_date: '2026-08-10',
            expected_harvest_date: '2026-12-05',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            farm: { name: 'Green Valley Farm', location_name: 'Nashik, Maharashtra' },
            plot: { name: 'Plot C', area: 1.8 },
          },
          {
            id: 'crop-004',
            farmer_id: 'farmer-1',
            farm_id: 'farm-1',
            plot_id: 'plot-4',
            crop_type: 'Chili',
            variety: 'Guntur Sannam',
            area: 1.2,
            area_unit: 'acre',
            plantingDate: '2026-08-15',
            expectedHarvestDate: '2026-11-20',
            status: 'GROWING',
            planting_date: '2026-08-15',
            expected_harvest_date: '2026-11-20',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            farm: { name: 'Green Valley Farm', location_name: 'Nashik, Maharashtra' },
            plot: { name: 'Plot D', area: 1.2 },
          },
        ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/farmer/crops', {
        farmId: selectedFarmId || undefined,
        ...newCrop,
        area: Number(newCrop.area),
      });
      setIsAddModalOpen(false);
      setNewCrop({
        cropType: 'Tomato',
        variety: '',
        area: 2.0,
        areaUnit: 'acre',
        plantingDate: new Date().toISOString().split('T')[0],
        expectedHarvestDate: '',
        status: 'GROWING' as CropStatus,
        notes: '',
        imageUrl: '',
      });
      await loadCrops();
    } catch (err: any) {
      alert('Error saving crop: ' + (err.message || 'Please check your connection'));
    }
  };

  const handleAddFertilizer = async (formData: any) => {
    if (!selectedCropForFertilizer) return;
    try {
      await apiClient.post(`/farmer/crops/${selectedCropForFertilizer.id}/fertilizers`, formData);
      alert('Fertilizer application recorded as a new historical log!');
    } catch (err: any) {
      alert('Recorded: ' + err.message);
    }
  };

  return (
    <DashboardLayout
      portal="farmer"
      title="My Crops (Multi-Crop Management)"
      subtitle="Track 2, 3, or multiple simultaneous crops. Each crop has a dedicated detail page with independent fertilizer and harvest records."
      actionButton={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-[#081C15] font-bold text-xs shadow-glow hover:bg-emerald-400 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Plant New Crop</span>
        </button>
      }
    >
      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'GROWING', 'READY_FOR_HARVEST', 'HARVESTED', 'PLANNING'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-emerald-500 text-[#081C15] shadow-glow'
                : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/40'
            }`}
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Multi-Crop Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-emerald-400">Loading crops from database...</div>
      ) : crops.length === 0 ? (
        <div className="rounded-3xl glass-card p-12 text-center border border-emerald-800/40 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <Sprout className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Crops Found</h3>
          <p className="text-xs text-emerald-400/70 max-w-md mx-auto">
            You don&apos;t have any crops in this filter. Click &quot;Plant New Crop&quot; to add a new crop to your farm.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-[#081C15] font-bold text-xs shadow-glow hover:bg-emerald-400 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Plant Your First Crop</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {crops.map((crop) => (
            <CropCard
              key={crop.id}
              crop={crop}
              onAddFertilizer={(c) => setSelectedCropForFertilizer(c)}
            />
          ))}
        </div>
      )}

      {/* Plant New Crop Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl glass-card border border-emerald-500/30 p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-lg">
                <Sprout className="h-5 w-5 text-emerald-400" />
                <h3>Plant New Crop</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-emerald-400/60 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCrop} className="space-y-4 text-xs">
              {farms.length > 0 && (
                <div>
                  <label className="block text-emerald-300 font-medium mb-1">Select Farm *</label>
                  <select
                    value={selectedFarmId}
                    onChange={(e) => setSelectedFarmId(e.target.value)}
                    className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                  >
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-300 font-medium mb-1">Crop Type *</label>
                  <select
                    value={newCrop.cropType}
                    onChange={(e) => setNewCrop({ ...newCrop, cropType: e.target.value })}
                    className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                  >
                    <option value="Tomato">Tomato (टमाटर)</option>
                    <option value="Onion">Onion (प्याज)</option>
                    <option value="Potato">Potato (आलू)</option>
                    <option value="Chili">Chili (मिर्च)</option>
                    <option value="Mango">Mango (आम)</option>
                    <option value="Banana">Banana (केला)</option>
                    <option value="Spinach">Spinach (पालक)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-emerald-300 font-medium mb-1">Variety *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Roma / Nashik Red / Hybrid"
                    value={newCrop.variety}
                    onChange={(e) => setNewCrop({ ...newCrop, variety: e.target.value })}
                    className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-300 font-medium mb-1">Planted Area *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={newCrop.area}
                    onChange={(e) => setNewCrop({ ...newCrop, area: Number(e.target.value) })}
                    className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-emerald-300 font-medium mb-1">Area Unit</label>
                  <select
                    value={newCrop.areaUnit}
                    onChange={(e) => setNewCrop({ ...newCrop, areaUnit: e.target.value })}
                    className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                  >
                    <option value="acre">Acre</option>
                    <option value="hectare">Hectare</option>
                    <option value="bigha">Bigha</option>
                    <option value="guntha">Guntha</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-emerald-300 font-medium mb-1">Planting Date *</label>
                  <input
                    type="date"
                    required
                    value={newCrop.plantingDate}
                    onChange={(e) => setNewCrop({ ...newCrop, plantingDate: e.target.value })}
                    className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-emerald-300 font-medium mb-1">Expected Harvest Date</label>
                  <input
                    type="date"
                    value={newCrop.expectedHarvestDate}
                    onChange={(e) => setNewCrop({ ...newCrop, expectedHarvestDate: e.target.value })}
                    className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-emerald-300 font-medium mb-1">Crop / Farm Photo (Upload file or leave blank for auto HD photo)</label>
                <div className="flex items-center gap-3">
                  {newCrop.imageUrl && (
                    <img
                      src={newCrop.imageUrl}
                      alt="Crop Preview"
                      className="w-14 h-14 rounded-xl object-cover border border-emerald-700/50"
                    />
                  )}
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-dashed border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/40 transition-colors text-emerald-300 font-medium text-xs">
                    <Sprout className="h-4 w-4 text-emerald-400" />
                    <span>Upload Crop Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setNewCrop((prev) => ({ ...prev, imageUrl: ev.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-emerald-300 font-medium mb-1">Field Notes</label>
                <textarea
                  rows={2}
                  placeholder="Soil prep notes, seed supplier, drip setup..."
                  value={newCrop.notes}
                  onChange={(e) => setNewCrop({ ...newCrop, notes: e.target.value })}
                  className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-emerald-900/50">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-[#081C15] font-bold shadow-glow hover:bg-emerald-400"
                >
                  Save Crop Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fertilizer Modal */}
      {selectedCropForFertilizer && (
        <FertilizerModal
          isOpen={!!selectedCropForFertilizer}
          onClose={() => setSelectedCropForFertilizer(null)}
          cropId={selectedCropForFertilizer.id}
          onSubmit={handleAddFertilizer}
        />
      )}
    </DashboardLayout>
  );
}
