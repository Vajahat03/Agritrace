'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { DataTable, Column } from '../../../components/DataTable';
import { apiClient } from '../../../lib/apiClient';
import { VendorInventory } from '../../../types';
import { Package, AlertCircle, Edit3, X } from 'lucide-react';

export default function VendorInventoryPage() {
  const [inventory, setInventory] = useState<VendorInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<VendorInventory | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    adjustmentType: 'DAMAGE',
    quantityChange: -5,
    reason: '',
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.get('/vendor/inventory');
      if (res?.data) {
        setInventory(res.data);
      }
    } catch {
      setInventory([
        {
          id: 'inv-1',
          vendor_id: 'vendor-1',
          batch_id: 'batch-1',
          product_name: 'Fresh Roma Tomatoes',
          crop_type: 'Tomato',
          quantity: 150,
          unit: 'kg',
          status: 'IN_STOCK',
          location: 'Cold Storage Room A',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          batch: { batch_code: 'TOM-2026-0001', quality_grade: 'Grade A', harvest_date: '2026-09-01' },
        },
        {
          id: 'inv-2',
          vendor_id: 'vendor-1',
          batch_id: 'batch-2',
          product_name: 'Nashik Red Onions',
          crop_type: 'Onion',
          quantity: 8,
          unit: 'quintal',
          status: 'LOW_STOCK',
          location: 'Warehouse Floor 2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          batch: { batch_code: 'ONI-2026-0002', quality_grade: 'Grade A', harvest_date: '2026-09-03' },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await apiClient.post(`/vendor/inventory/${selectedItem.id}/adjust`, {
        adjustmentType: adjustForm.adjustmentType,
        quantityChange: Number(adjustForm.quantityChange),
        reason: adjustForm.reason,
      });
      setSelectedItem(null);
      loadInventory();
    } catch {
      setInventory(
        inventory.map((item) =>
          item.id === selectedItem.id
            ? { ...item, quantity: item.quantity + Number(adjustForm.quantityChange) }
            : item
        )
      );
      setSelectedItem(null);
    }
  };

  const columns: Column<VendorInventory>[] = [
    {
      header: 'Product Name',
      accessorKey: 'product_name',
      cell: (r) => <span className="font-bold text-white">{r.product_name}</span>,
    },
    {
      header: 'Batch Reference',
      cell: (r) => <span className="font-mono text-emerald-300">{r.batch?.batch_code || 'Direct Batch'}</span>,
    },
    {
      header: 'Current Stock',
      cell: (r) => (
        <span className={`font-bold ${r.quantity < 10 ? 'text-amber-400' : 'text-emerald-300'}`}>
          {r.quantity} {r.unit}
        </span>
      ),
    },
    {
      header: 'Storage Location',
      accessorKey: 'location',
      cell: (r) => <span className="text-emerald-300/80">{r.location || 'Central Warehouse'}</span>,
    },
    {
      header: 'Status',
      cell: (r) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
            r.status === 'LOW_STOCK'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      header: 'Action',
      cell: (r) => (
        <button
          onClick={() => setSelectedItem(r)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-700/50 text-emerald-200 text-xs font-medium"
        >
          <Edit3 className="h-3.5 w-3.5" />
          <span>Adjust Stock</span>
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      portal="vendor"
      title="Vendor Inventory Management"
      subtitle="Track procured batch stock, storage locations, damage adjustments, and distribution ready inventory."
    >
      <DataTable
        columns={columns}
        data={inventory}
        searchPlaceholder="Filter inventory by product name or batch..."
      />

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl glass-card border border-emerald-500/40 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
              <h3 className="text-sm font-bold text-white">
                Adjust Stock: {selectedItem.product_name}
              </h3>
              <button onClick={() => setSelectedItem(null)} className="text-emerald-400/60 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-emerald-300 font-medium mb-1">Adjustment Type</label>
                <select
                  value={adjustForm.adjustmentType}
                  onChange={(e) => setAdjustForm({ ...adjustForm, adjustmentType: e.target.value })}
                  className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                >
                  <option value="DAMAGE">Transit / Handling Damage</option>
                  <option value="DISCARD">Shelf-Life Discard</option>
                  <option value="CORRECTION">Manual Inventory Correction</option>
                </select>
              </div>

              <div>
                <label className="block text-emerald-300 font-medium mb-1">
                  Quantity Change ({selectedItem.unit}) — use negative to reduce
                </label>
                <input
                  type="number"
                  required
                  value={adjustForm.quantityChange}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantityChange: Number(e.target.value) })}
                  className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-emerald-300 font-medium mb-1">Reason / Notes *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Reason for audit log..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full rounded-xl bg-emerald-950/60 border border-emerald-800/60 px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-emerald-900/50">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-[#081C15] font-bold shadow-glow hover:bg-emerald-400"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
