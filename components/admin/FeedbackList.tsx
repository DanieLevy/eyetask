'use client';

import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { MessageCircle, Clock, User, Flag, AlertTriangle } from 'lucide-react';
import { FeedbackTicket } from '@/lib/types/feedback';

interface Props {
  tickets: FeedbackTicket[];
  loading: boolean;
  onTicketClick: (ticket: FeedbackTicket) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const statusLabels = {
  new: 'חדש',
  assigned: 'הוקצה',
  in_progress: 'בעבודה',
  pending_user: 'ממתין למשתמש',
  resolved: 'נפתר',
  closed: 'נסגר',
  cancelled: 'בוטל'
};

const priorityLabels = {
  low: 'נמוך',
  normal: 'רגיל',
  high: 'גבוה',
  urgent: 'דחוף',
  critical: 'קריטי'
};

const FeedbackList: React.FC<Props> = ({
  tickets,
  loading,
  onTicketClick,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 border-blue-200',
      assigned: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-orange-100 text-orange-800 border-orange-200',
      pending_user: 'bg-purple-100 text-purple-800 border-purple-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600',
      normal: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600',
      critical: 'text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="flex justify-between items-start mb-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="flex justify-between items-center">
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">אין פניות</h3>
        <p className="text-gray-600">לא נמצאו פניות התואמות לקריטריונים שנבחרו.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          פניות ({tickets.length})
        </h3>
        {totalPages > 1 && (
          <div className="text-sm text-gray-600">
            עמוד {currentPage} מתוך {totalPages}
          </div>
        )}
      </div>

      {/* Mobile-First Card Layout */}
      <div className="space-y-3">
        {tickets.map((ticket) => (
          <div
            key={ticket.ticketNumber}
            onClick={() => onTicketClick(ticket)}
            className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200 active:scale-[0.98]"
          >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-blue-600">
                    {ticket.ticketNumber}
                  </span>
                  {ticket.isUrgent && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600 font-medium">דחוף</span>
                    </div>
                  )}
                </div>
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-5">
                  {ticket.title}
                </h4>
              </div>
              
              {/* Status Badge */}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                {statusLabels[ticket.status]}
              </span>
            </div>

            {/* Content */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600">
                  <User className="w-3 h-3" />
                  <span>{ticket.userName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Flag className={`w-3 h-3 ${getPriorityColor(ticket.priority)}`} />
                  <span className={`text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                    {priorityLabels[ticket.priority]}
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                {ticket.category.replace('_', ' ')} • {ticket.issueType}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(new Date(ticket.createdAt), { 
                    addSuffix: true, 
                    locale: he 
                  })}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                <span>{ticket.responses.length} תגובות</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile-Optimized Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            ← הקודם
          </button>
          
          <div className="flex items-center gap-1">
            {/* Show page numbers for desktop, simplified for mobile */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + Math.max(1, currentPage - 2);
                if (page > totalPages) return null;
                
                return (
                  <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      page === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            {/* Mobile: Just show current page */}
            <div className="sm:hidden text-sm text-gray-600">
              {currentPage} / {totalPages}
            </div>
          </div>
          
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            הבא →
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackList; 