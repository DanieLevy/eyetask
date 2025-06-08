'use client';

import { useState } from 'react';
import { FeedbackTicket, FeedbackStatus, FeedbackPriority } from '@/lib/types/feedback';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface Props {
  ticket: FeedbackTicket;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
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

const TicketModal: React.FC<Props> = ({ ticket, isOpen, onClose, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [newResponse, setNewResponse] = useState('');
  const [isAddingResponse, setIsAddingResponse] = useState(false);

  if (!isOpen) return null;

  const handleStatusChange = async (newStatus: FeedbackStatus) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/feedback/${ticket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: FeedbackPriority) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/feedback/${ticket._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update priority:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddResponse = async () => {
    if (!newResponse.trim()) return;

    try {
      setIsAddingResponse(true);
      const response = await fetch(`/api/feedback/${ticket._id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newResponse.trim(),
          isPublic: true
        })
      });

      if (response.ok) {
        setNewResponse('');
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to add response:', error);
    } finally {
      setIsAddingResponse(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                פניה #{ticket.ticketNumber}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4 max-h-96 overflow-y-auto">
            {/* Ticket Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">פרטי הפניה</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">כותרת:</span> {ticket.title}</div>
                  <div><span className="font-medium">שם הפונה:</span> {ticket.userName}</div>
                  {ticket.userEmail && <div><span className="font-medium">אימייל:</span> {ticket.userEmail}</div>}
                  {ticket.userPhone && <div><span className="font-medium">טלפון:</span> {ticket.userPhone}</div>}
                  <div><span className="font-medium">קטגוריה:</span> {ticket.category}</div>
                  <div><span className="font-medium">סוג:</span> {ticket.issueType}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">סטטוס וניהול</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">עדיפות</label>
                    <select
                      value={ticket.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as FeedbackPriority)}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="text-sm text-gray-600">
                    <div>נוצר: {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: he })}</div>
                    <div>עודכן: {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: he })}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">תיאור הפניה</h4>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>

            {/* Related Item */}
            {ticket.relatedTo && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-2">קשור ל</h4>
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <span className="font-medium">{ticket.relatedTo.type}:</span> {ticket.relatedTo.title}
                </div>
              </div>
            )}

            {/* Responses */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">תגובות ({ticket.responses.length})</h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {ticket.responses.length === 0 ? (
                  <p className="text-sm text-gray-500">אין תגובות עדיין</p>
                ) : (
                  ticket.responses.map((response) => (
                    <div key={response.responseId} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {response.authorName} ({response.authorType === 'admin' ? 'מנהל' : 'משתמש'})
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(response.createdAt), { addSuffix: true, locale: he })}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {response.content}
                      </div>
                      {!response.isPublic && (
                        <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          פנימי
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Response */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">הוסף תגובה</h4>
              <div className="space-y-3">
                <textarea
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="כתוב תגובה..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddResponse}
                  disabled={isAddingResponse || !newResponse.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingResponse ? 'שולח...' : 'שלח תגובה'}
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-400"
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal; 