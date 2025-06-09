'use client';

import { useState, useEffect } from 'react';
import { FeedbackTicket, FeedbackStatus, FeedbackPriority } from '@/lib/types/feedback';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { X, Trash2, Send, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

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
  const [mounted, setMounted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newResponse, setNewResponse] = useState('');
  const [isAddingResponse, setIsAddingResponse] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/feedback/${ticket._id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        throw new Error('Failed to delete ticket');
      }
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      toast.error('שגיאה במחיקת הפניה. אנא נסה שוב.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              פניה #{ticket.ticketNumber}
            </h3>
            {ticket.isUrgent && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                <AlertTriangle className="w-3 h-3" />
                דחוף
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="מחק פניה"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-4 space-y-6">
            {/* Quick Actions - Mobile First */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">סטטוס</label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">עדיפות</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as FeedbackPriority)}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ticket Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">פרטי הפניה</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="mb-2"><span className="font-medium">כותרת:</span> {ticket.title}</div>
                  <div className="mb-2"><span className="font-medium">שם הפונה:</span> {ticket.userName}</div>
                  {ticket.userEmail && <div className="mb-2"><span className="font-medium">אימייל:</span> {ticket.userEmail}</div>}
                  {ticket.userPhone && <div className="mb-2"><span className="font-medium">טלפון:</span> {ticket.userPhone}</div>}
                </div>
                <div>
                  <div className="mb-2"><span className="font-medium">קטגוריה:</span> {ticket.category}</div>
                  <div className="mb-2"><span className="font-medium">סוג:</span> {ticket.issueType}</div>
                  <div className="mb-2">
                    <span className="font-medium">נוצר:</span> {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: he })}
                  </div>
                  <div className="mb-2">
                    <span className="font-medium">עודכן:</span> {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true, locale: he })}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">תיאור הפניה</h4>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>

            {/* Related Item */}
            {ticket.relatedTo && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">קשור ל</h4>
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <span className="font-medium">{ticket.relatedTo.type}:</span> {ticket.relatedTo.title}
                </div>
              </div>
            )}

            {/* Responses */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">תגובות ({ticket.responses.length})</h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {ticket.responses.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">אין תגובות עדיין</p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  onClick={handleAddResponse}
                  disabled={isAddingResponse || !newResponse.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAddingResponse ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      שלח תגובה
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">מחק פניה</h3>
            </div>
            
            <p className="text-gray-700 mb-6">
              האם אתה בטוח שברצונך למחוק את הפניה #{ticket.ticketNumber}? פעולה זו לא ניתנת לביטול.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                disabled={isDeleting}
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    מוחק...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    מחק
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TicketModal; 