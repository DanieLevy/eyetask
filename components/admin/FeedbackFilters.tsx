'use client';

import { useState } from 'react';
import { FeedbackFilterOptions } from '@/lib/types/feedback';

interface Props {
  filters: FeedbackFilterOptions;
  onFiltersChange: (filters: FeedbackFilterOptions) => void;
  onRefresh: () => void;
}

const FeedbackFilters: React.FC<Props> = ({ filters, onFiltersChange, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, searchTerm: searchTerm.trim() || undefined });
  };

  const handleStatusFilter = (status: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status as any)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status as any];
    
    onFiltersChange({ ...filters, status: newStatuses.length ? newStatuses : undefined });
  };

  const clearFilters = () => {
    setSearchTerm('');
    onFiltersChange({});
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חיפוש לפי כותרת, תיאור, שם פונה או מספר פניה..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>
          </div>
        </form>

        {/* Quick Status Filters */}
        <div className="flex flex-wrap gap-2">
          {['new', 'in_progress', 'resolved'].map(status => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.status?.includes(status as any)
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'new' && 'חדש'}
              {status === 'in_progress' && 'בעבודה'}
              {status === 'resolved' && 'נפתר'}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            נקה מסננים
          </button>
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            רענן
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.status?.length || filters.searchTerm) && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">מסננים פעילים:</span>
          {filters.searchTerm && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              חיפוש: {filters.searchTerm}
            </span>
          )}
          {filters.status?.map(status => (
            <span key={status} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              סטטוס: {status}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackFilters; 