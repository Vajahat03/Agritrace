'use client';

import React from 'react';
import { WeatherInfo } from '../types';
import { CloudSun, Droplets, Wind, Thermometer, Calendar } from 'lucide-react';

interface WeatherWidgetProps {
  weather: WeatherInfo | null;
  locationName?: string;
}

export function WeatherWidget({ weather, locationName }: WeatherWidgetProps) {
  if (!weather) {
    return (
      <div className="rounded-2xl glass-card p-5 border border-emerald-800/40 animate-pulse">
        <div className="h-6 w-32 bg-emerald-900/40 rounded mb-4" />
        <div className="h-10 w-24 bg-emerald-900/40 rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl glass-card p-5 border border-emerald-800/40 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Agricultural Weather
          </span>
          <h4 className="text-base font-bold text-white mt-0.5">
            {locationName || 'Nashik District, Maharashtra'}
          </h4>
        </div>
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <CloudSun className="h-6 w-6" />
        </div>
      </div>

      {/* Main Temperature & Condition */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-extrabold text-white tracking-tight">
          {weather.temperature}°C
        </span>
        <span className="text-xs font-medium text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-900/50 border border-emerald-700/40">
          {weather.condition}
        </span>
      </div>

      {/* Meteorological Metrics */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-900/40 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-200">
          <Droplets className="h-4 w-4 text-sky-400 shrink-0" />
          <div>
            <p className="text-[10px] text-emerald-400/70">Humidity</p>
            <p className="font-semibold">{weather.humidity}%</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-200">
          <Droplets className="h-4 w-4 text-blue-400 shrink-0" />
          <div>
            <p className="text-[10px] text-emerald-400/70">Rainfall</p>
            <p className="font-semibold">{weather.rainfallMm} mm</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-200">
          <Wind className="h-4 w-4 text-teal-400 shrink-0" />
          <div>
            <p className="text-[10px] text-emerald-400/70">Wind</p>
            <p className="font-semibold">{weather.windSpeedKmh} km/h</p>
          </div>
        </div>
      </div>

      {/* 3-Day Mini Forecast */}
      {weather.forecast && weather.forecast.length > 0 && (
        <div className="pt-3 border-t border-emerald-900/40 space-y-2">
          <span className="text-[11px] font-semibold text-emerald-400">3-Day Farm Forecast</span>
          <div className="grid grid-cols-3 gap-2">
            {weather.forecast.slice(0, 3).map((f, i) => (
              <div key={i} className="rounded-xl bg-emerald-950/50 p-2 text-center border border-emerald-900/40">
                <p className="text-[10px] text-emerald-400/80">{f.date.split('-').slice(1).join('/')}</p>
                <p className="text-xs font-bold text-white">{f.maxTemp}° / {f.minTemp}°</p>
                <p className="text-[9px] text-emerald-300 truncate">{f.condition}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: string;
  color?: 'emerald' | 'amber' | 'sky' | 'purple';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'emerald' }: StatCardProps) {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  };

  return (
    <div className="rounded-2xl glass-card p-5 border border-emerald-800/40 flex items-start justify-between">
      <div className="space-y-1">
        <span className="text-xs font-medium text-emerald-300/70">{title}</span>
        <h3 className="text-2xl font-extrabold text-white tracking-tight">{value}</h3>
        {subtitle && <p className="text-[11px] text-emerald-400/80">{subtitle}</p>}
        {trend && <span className="text-[10px] text-emerald-400 font-semibold">{trend}</span>}
      </div>
      <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
