'use client';

import React, { useState, useEffect } from 'react';
import { FertilizerApplication } from '../types';
import { X, FlaskConical, Calendar, DollarSign } from 'lucide-react';

interface FertilizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cropId: string;
  initialData?: FertilizerApplication | null;
  onSubmit: (formData: any) => Promise<void>;
}

export function FertilizerModal({
  isOpen,
  onClose,
  cropId,
  initialData,
  onSubmit,
}: FertilizerModalProps) {
  const [formData, setFormData] = useState({
    fertilizerName: '',
    fertilizerType: 'NPK',
    applicationDate: new Date().toISOString().split('T')[0],
    quantity: 25,
    unit: 'kg',
    method: 'SOIL',
    nValue: '',
    pValue: '',
    kValue: '',
    cost: 1200,
    supplier: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        fertilizerName: initialData.fertilizer_name,
        fertilizerType: initialData.fertilizer_type,
        applicationDate: initialData.application_date,
        quantity: initialData.quantity,
        unit: initialData.unit,
        method: initialData.method,
        nValue: initialData.n_value ? String(initialData.n_value) : '',
        pValue: initialData.p_value ? String(initialData.p_value) : '',
        kValue: initialData.k_value ? String(initialData.k_value) : '',
        cost: initialData.cost || 0,
        supplier: initialData.supplier || '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        fertilizerName: '',
        fertilizerType: 'NPK',
        applicationDate: new Date().toISOString().split('T')[0],
        quantity: 25,
        unit: 'kg',
        method: 'SOIL',
        nValue: '',
        pValue: '',
        kValue: '',
        cost: 1200,
        supplier: '',
        notes: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        quantity: Number(formData.quantity),
        cost: Number(formData.cost),
        nValue: formData.nValue ? Number(formData.nValue) : undefined,
        pValue: formData.pValue ? Number(formData.pValue) : undefined,
        kValue: formData.kValue ? Number(formData.kValue) : undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl glass-card border border-emerald-500/30 p-6 space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-lg">
            <FlaskConical className="h-5 w-5 text-emerald-400" />
            <h3>{initialData ? 'Edit Historical Fertilizer Log' : 'Record Fertilizer Application'}</h3>
          </div>
          <button onClick={onClose} className="text-emerald-400/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Fertilizer Name & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-emerald-300 font-medium mb-1">Fertilizer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Urea, NPK 19:19:19"
                value={formData.fertilizerName}
                onChange={(e) => setFormData({ ...formData, fertilizerName: e.target.value })}
                className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-emerald-300 font-medium mb-1">Type *</label>
              <select
                value={formData.fertilizerType}
                onChange={(e) => setFormData({ ...formData, fertilizerType: e.target.value })}
                className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="NPK">NPK Complex</option>
                <option value="Urea">Urea (Nitrogen)</option>
                <option value="DAP">DAP (Phosphorus)</option>
                <option value="Organic">Organic Manure / Bio</option>
                <option value="Compost">Vermicompost</option>
                <option value="Micronutrient">Micronutrient Mix</option>
              </select>
            </div>
          </div>

          {/* Date & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-emerald-300 font-medium mb-1">Application Date *</label>
              <input
                type="date"
                required
                value={formData.applicationDate}
                onChange={(e) => setFormData({ ...formData, applicationDate: e.target.value })}
                className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-emerald-300 font-medium mb-1">Application Method</label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="SOIL">Soil Top Dressing</option>
                <option value="DRIP">Drip Fertigation</option>
                <option value="FOLIAR">Foliar Spray</option>
                <option value="BROADCAST">Broadcasting</option>
              </select>
            </div>
          </div>

          {/* Quantity, Unit & Cost */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-emerald-300 font-medium mb-1">Quantity *</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-emerald-300 font-medium mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="kg">kg</option>
                <option value="grams">grams</option>
                <option value="liters">liters</option>
                <option value="bags">bags</option>
                <option value="tons">tons</option>
              </select>
            </div>
            <div>
              <label className="block text-emerald-300 font-medium mb-1">Total Cost (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* NPK Values (Optional) */}
          <div className="rounded-xl bg-emerald-950/40 p-3 border border-emerald-900/50 space-y-2">
            <span className="text-[11px] font-semibold text-emerald-400">Nutrient Composition (Optional % N-P-K)</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                placeholder="N %"
                value={formData.nValue}
                onChange={(e) => setFormData({ ...formData, nValue: e.target.value })}
                className="rounded-lg bg-emerald-950 border border-emerald-800 px-2 py-1.5 text-white"
              />
              <input
                type="number"
                placeholder="P %"
                value={formData.pValue}
                onChange={(e) => setFormData({ ...formData, pValue: e.target.value })}
                className="rounded-lg bg-emerald-950 border border-emerald-800 px-2 py-1.5 text-white"
              />
              <input
                type="number"
                placeholder="K %"
                value={formData.kValue}
                onChange={(e) => setFormData({ ...formData, kValue: e.target.value })}
                className="rounded-lg bg-emerald-950 border border-emerald-800 px-2 py-1.5 text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-emerald-300 font-medium mb-1">Supplier / Field Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Applied post-weeding before light irrigation"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 hover:text-white font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-500 text-[#081C15] font-bold shadow-glow hover:bg-emerald-400 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : initialData ? 'Update Record' : 'Log Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
