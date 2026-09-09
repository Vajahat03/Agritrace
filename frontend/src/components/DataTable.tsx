'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  filterKey?: keyof T;
  pageSize?: number;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = 'Search records...',
  filterKey,
  pageSize = 8,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter logic
  const filteredData = data.filter((item) => {
    if (!searchTerm) return true;
    const val = filterKey ? item[filterKey] : Object.values(item).join(' ');
    return String(val).toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-emerald-400/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl bg-emerald-950/40 border border-emerald-800/40 pl-9 pr-4 py-2 text-xs text-white placeholder-emerald-400/50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="text-xs text-emerald-300/70">
          Showing <span className="font-semibold text-white">{filteredData.length}</span> records
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl glass-card overflow-hidden border border-emerald-800/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-950/70 border-b border-emerald-800/50 text-emerald-300 font-semibold uppercase tracking-wider">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className={`px-4 py-3.5 ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/30 text-emerald-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-emerald-900/20 transition-colors">
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`px-4 py-3.5 ${col.className || ''}`}>
                        {col.cell ? col.cell(row) : col.accessorKey ? String(row[col.accessorKey] ?? '-') : '-'}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-emerald-400/60">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-950/40 border-t border-emerald-800/40 text-xs">
            <span className="text-emerald-300/70">
              Page <span className="font-semibold text-white">{currentPage}</span> of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-800/40 text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-800/40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-emerald-900/40 border border-emerald-800/40 text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-800/40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
