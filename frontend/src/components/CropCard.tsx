'use client';

import React from 'react';
import Link from 'next/link';
import { Crop } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  Calendar,
  MapPin,
  Maximize2,
  Sprout,
  PlusCircle,
  FlaskConical,
  Package,
  ChevronRight,
} from 'lucide-react';

interface CropCardProps {
  crop: Crop;
  onAddFertilizer?: (crop: Crop) => void;
  onLogHarvest?: (crop: Crop) => void;
}

export function CropCard({ crop, onAddFertilizer, onLogHarvest }: CropCardProps) {
  const { translateCommodity, t } = useLanguage();

  const statusColors = {
    PLANNING: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    GROWING: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    READY_FOR_HARVEST: 'bg-amber-500/20 text-amber-300 border-amber-500/30 glow-amber',
    HARVESTED: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    ARCHIVED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  const defaultCropImages: Record<string, string> = {
    tomato: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    onion: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80',
    potato: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80',
    chili: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=600&auto=format&fit=crop&q=80',
    mango: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&auto=format&fit=crop&q=80',
  };

  const cropImage =
    crop.image_url ||
    defaultCropImages[crop.crop_type.toLowerCase()] ||
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80';

  return (
    <div className="rounded-2xl glass-card-interactive overflow-hidden flex flex-col group border border-emerald-800/40">
      {/* Image Header */}
      <div className="relative h-44 w-full overflow-hidden bg-emerald-950">
        <img
          src={cropImage}
          alt={crop.crop_type}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#081C15] via-transparent to-black/30" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border backdrop-blur-md ${
              statusColors[crop.status] || statusColors.GROWING
            }`}
          >
            {crop.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Crop Area */}
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-medium text-emerald-200 border border-emerald-500/20">
          {crop.area} {crop.area_unit}
        </div>

        {/* Crop Title */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-xl font-bold text-white leading-tight drop-shadow-md">
            {translateCommodity(crop.crop_type)}
          </h3>
          <p className="text-xs text-emerald-300 font-medium">
            Variety: <span className="text-white font-semibold">{crop.variety}</span>
          </p>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2 text-xs text-emerald-100/80">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <MapPin className="h-3.5 w-3.5" />
              {crop.farm?.name || 'Main Farm'}
            </span>
            <span className="text-emerald-300/70 font-mono">
              Plot: {crop.plot?.name || 'A-1'}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-emerald-900/40 pt-2">
            <span className="flex items-center gap-1.5 text-emerald-300/70">
              <Calendar className="h-3.5 w-3.5" />
              Planted:
            </span>
            <span className="font-medium text-white">{crop.planting_date}</span>
          </div>

          {crop.expected_harvest_date && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400/80">
                <Package className="h-3.5 w-3.5" />
                Est. Harvest:
              </span>
              <span className="font-semibold text-amber-300">{crop.expected_harvest_date}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-emerald-900/40">
          <div className="grid grid-cols-2 gap-2">
            {onAddFertilizer && (
              <button
                onClick={() => onAddFertilizer(crop)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-300 border border-emerald-700/40 text-xs font-medium transition-colors"
              >
                <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
                + Fertilizer
              </button>
            )}
            {onLogHarvest && (
              <button
                onClick={() => onLogHarvest(crop)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-700/40 text-xs font-medium transition-colors"
              >
                <Package className="h-3.5 w-3.5 text-amber-400" />
                + Harvest
              </button>
            )}
          </div>

          <Link
            href={`/farmer/crops/${crop.id}`}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-[#081C15] font-semibold text-xs transition-all shadow-glow"
          >
            <span>{t.common.viewDetails}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
