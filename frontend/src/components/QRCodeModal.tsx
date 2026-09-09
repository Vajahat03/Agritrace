'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, ExternalLink, QrCode, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchCode: string;
  cropType: string;
  variety: string;
  harvestDate: string;
  quantity: number;
  unit: string;
}

export function QRCodeModal({
  isOpen,
  onClose,
  batchCode,
  cropType,
  variety,
  harvestDate,
  quantity,
  unit,
}: QRCodeModalProps) {
  if (!isOpen) return null;

  const traceUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/trace/batch/${batchCode}`
    : `http://localhost:3000/trace/batch/${batchCode}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl glass-card border border-emerald-500/40 p-6 space-y-5 text-center">
        <div className="flex items-center justify-between border-b border-emerald-800/50 pb-3">
          <div className="flex items-center gap-2 text-emerald-300 font-bold text-base">
            <QrCode className="h-5 w-5 text-emerald-400" />
            <span>Batch Traceability QR Label</span>
          </div>
          <button onClick={onClose} className="text-emerald-400/60 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="bg-white p-5 rounded-2xl inline-block shadow-2xl mx-auto border-4 border-emerald-500/30">
          <QRCodeSVG
            value={traceUrl}
            size={200}
            level="H"
            includeMargin={true}
            fgColor="#081C15"
          />
        </div>

        {/* Batch Metadata summary */}
        <div className="rounded-xl bg-emerald-950/60 p-3.5 border border-emerald-800/50 text-left space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-emerald-400 font-medium">Batch Code:</span>
            <span className="font-mono font-bold text-white">{batchCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-400 font-medium">Produce / Variety:</span>
            <span className="text-white">{cropType} ({variety})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-400 font-medium">Harvest Date:</span>
            <span className="text-white">{harvestDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-emerald-400 font-medium">Quantity:</span>
            <span className="text-white">{quantity} {unit}</span>
          </div>
          <div className="flex justify-between border-t border-emerald-900/50 pt-1.5">
            <span className="text-emerald-400 font-medium">Traceability:</span>
            <span className="text-emerald-300 font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Traceability verified
            </span>
          </div>
        </div>

        {/* Action Link */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={`/trace/batch/${batchCode}`}
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-[#081C15] font-bold text-xs shadow-glow hover:bg-emerald-400 transition-all"
          >
            <span>Open Traceability View</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-300 hover:text-white text-xs font-semibold"
          >
            Print Label
          </button>
        </div>
      </div>
    </div>
  );
}
