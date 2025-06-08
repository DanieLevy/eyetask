'use client';

import { useState, useEffect } from 'react';
import { FeedbackTicket, FeedbackStats as FeedbackStatsType, FeedbackFilterOptions } from '@/lib/types/feedback';
import FeedbackList from '@/components/admin/FeedbackList';
import FeedbackFilters from '@/components/admin/FeedbackFilters';
import FeedbackStatsComponent from '@/components/admin/FeedbackStatsComponent';
import TicketModal from '@/components/admin/TicketModal';

export default function FeedbackManagementPage() {
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [stats, setStats] = useState<FeedbackStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState<FeedbackFilterOptions>({});

  useEffect(() => {
    loadData();
  }, [currentPage, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (filters.status?.length) {
        params.append('status', filters.status.join(','));
      }
      if (filters.category?.length) {
        params.append('category', filters.category.join(','));
      }
      if (filters.priority?.length) {
        params.append('priority', filters.priority.join(','));
      }
      if (filters.searchTerm) {
        params.append('search', filters.searchTerm);
      }
      if (filters.isUrgent !== undefined) {
        params.append('urgent', filters.isUrgent.toString());
      }

      const [ticketsResponse, statsResponse] = await Promise.all([
        fetch(`/api/feedback?${params}`),
        fetch('/api/feedback/stats')
      ]);

      const ticketsData = await ticketsResponse.json();
      const statsData = await statsResponse.json();

      if (ticketsData.success) {
        setTickets(ticketsData.tickets);
        setTotalPages(ticketsData.totalPages);
        setHasMore(ticketsData.hasMore);
      }

      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketClick = (ticket: FeedbackTicket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const handleTicketUpdate = () => {
    loadData(); // Refresh data after update
    setIsModalOpen(false);
    setSelectedTicket(null);
  };

  const handleFilterChange = (newFilters: FeedbackFilterOptions) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg h-24"></div>
              ))}
            </div>
            <div className="bg-white rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">ניהול פניות ותמיכה</h1>
          <p className="text-gray-600 mt-2">
            נהל, עקב ותענה על פניות משתמשים במערכת
          </p>
        </div>

        {/* Stats Section */}
        {stats && <FeedbackStatsComponent stats={stats} />}

        {/* Filters Section */}
        <FeedbackFilters 
          filters={filters}
          onFiltersChange={handleFilterChange}
          onRefresh={loadData}
        />

        {/* Tickets List */}
        <FeedbackList
          tickets={tickets}
          loading={loading}
          onTicketClick={handleTicketClick}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Ticket Modal */}
        {isModalOpen && selectedTicket && (
          <TicketModal
            ticket={selectedTicket}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedTicket(null);
            }}
            onUpdate={handleTicketUpdate}
          />
        )}
      </div>
    </div>
  );
} 