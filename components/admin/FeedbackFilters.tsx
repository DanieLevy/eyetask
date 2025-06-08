'use client';

import { useState } from 'react';
import { FeedbackFilterOptions } from '@/lib/types/feedback';
import { Search, Filter, RefreshCw, X } from 'lucide-react';

interface Props {
  filters: FeedbackFilterOptions;
  onFiltersChange: (filters: FeedbackFilterOptions) => void;
  onRefresh: () => void;
}

const FeedbackFilters: React.FC<Props> = ({ filters, onFiltersChange, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const hasActiveFilters = filters.status?.length || filters.searchTerm;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
      {/* Main Search and Actions */}
      <div className="flex gap-2 mb-3">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חיפוש פניות..."
              className="w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </form>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
            hasActiveFilters
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          {hasActiveFilters && <span className="w-1 h-1 bg-blue-600 rounded-full"></span>}
        </button>
        
        <button
          onClick={onRefresh}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Status Filters - Always Visible */}
      <div className="flex flex-wrap gap-1 mb-2">
        {['new', 'in_progress', 'resolved'].map(status => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
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

      {/* Advanced Filters - Collapsible */}
      {showAdvanced && (
        <div className="border-t border-gray-200 pt-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Additional Status Filters */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">סטטוסים נוספים</label>
              <div className="flex flex-wrap gap-1">
                {['assigned', 'pending_user', 'closed', 'cancelled'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilter(status)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      filters.status?.includes(status as any)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {status === 'assigned' && 'הוקצה'}
                    {status === 'pending_user' && 'ממתין'}
                    {status === 'closed' && 'נסגר'}
                    {status === 'cancelled' && 'בוטל'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Priority Filters */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">עדיפות</label>
              <div className="flex flex-wrap gap-1">
                {['urgent', 'high', 'normal', 'low'].map(priority => (
                  <button
                    key={priority}
                    onClick={() => {
                      const currentPriorities = filters.priority || [];
                      const newPriorities = currentPriorities.includes(priority as any)
                        ? currentPriorities.filter(p => p !== priority)
                        : [...currentPriorities, priority as any];
                      onFiltersChange({ ...filters, priority: newPriorities.length ? newPriorities : undefined });
                    }}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      filters.priority?.includes(priority as any)
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {priority === 'urgent' && 'דחוף'}
                    {priority === 'high' && 'גבוה'}
                    {priority === 'normal' && 'רגיל'}
                    {priority === 'low' && 'נמוך'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <button
            onClick={clearFilters}
            className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            נקה את כל המסננים
          </button>
        </div>
      )}

      {/* Active Filters Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100">
          {filters.searchTerm && (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
              "{filters.searchTerm}"
              <button
                onClick={() => {
                  setSearchTerm('');
                  onFiltersChange({ ...filters, searchTerm: undefined });
                }}
                className="mr-1 hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.status?.map(status => (
            <span key={status} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-50 text-green-700 border border-green-200">
              {status}
              <button
                onClick={() => handleStatusFilter(status)}
                className="mr-1 hover:text-green-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.priority?.map(priority => (
            <span key={priority} className="inline-flex items-center px-2 py-1 rounded text-xs bg-orange-50 text-orange-700 border border-orange-200">
              {priority}
              <button
                onClick={() => {
                  const newPriorities = filters.priority?.filter(p => p !== priority) || [];
                  onFiltersChange({ ...filters, priority: newPriorities.length ? newPriorities : undefined });
                }}
                className="mr-1 hover:text-orange-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackFilters; 