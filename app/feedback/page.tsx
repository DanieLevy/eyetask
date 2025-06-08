'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FeedbackCategory, 
  FeedbackIssueType,
  CreateFeedbackRequest 
} from '@/lib/types/feedback';

interface Subtask {
  id: string;
  title: string;
  taskTitle: string;
}

// Hebrew translations for categories and issue types
const categoryLabels: Record<FeedbackCategory, string> = {
  general_support: 'תמיכה כללית',
  technical_issue: 'בעיה טכנית',
  feature_request: 'בקשת פיצ\'ר',
  bug_report: 'דיווח על באג',
  task_related: 'קשור למשימה',
  subtask_related: 'קשור לתת-משימה',
  project_related: 'קשור לפרויקט',
  account_help: 'עזרה בחשבון',
  feedback: 'משוב',
  complaint: 'תלונה',
  suggestion: 'הצעה'
};

const issueTypeLabels: Record<FeedbackIssueType, string> = {
  question: 'שאלה',
  problem: 'בעיה',
  request: 'בקשה',
  bug: 'באג',
  improvement: 'שיפור',
  complaint: 'תלונה',
  compliment: 'מחמאה',
  other: 'אחר'
};

export default function FeedbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    userName: '',
    userEmail: '',
    userPhone: '',
    title: '',
    description: '',
    category: '' as FeedbackCategory | '',
    issueType: '' as FeedbackIssueType | '',
    relatedTo: {
      type: '' as 'project' | 'task' | 'subtask' | '',
      id: ''
    },
    isUrgent: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load subtasks on component mount and handle URL parameters
  useEffect(() => {
    loadSubtasks();
    
    // Handle URL parameters for pre-filling form
    const prefillFromParams = () => {
      const prefillData: any = {};
      
      // Extract context data from URL parameters
      const title = searchParams.get('title');
      const description = searchParams.get('description');
      const category = searchParams.get('category') as FeedbackCategory;
      const issueType = searchParams.get('issueType') as FeedbackIssueType;
      const isUrgent = searchParams.get('isUrgent') === 'true';
      const relatedType = searchParams.get('relatedType');
      const relatedId = searchParams.get('relatedId');
      
      if (title) prefillData.title = decodeURIComponent(title);
      if (description) prefillData.description = decodeURIComponent(description);
      if (category && Object.keys(categoryLabels).includes(category)) {
        prefillData.category = category;
      }
      if (issueType && Object.keys(issueTypeLabels).includes(issueType)) {
        prefillData.issueType = issueType;
      }
      if (isUrgent !== null) prefillData.isUrgent = isUrgent;
      
      // Handle related items
      if (relatedType && relatedId && ['project', 'task', 'subtask'].includes(relatedType)) {
        prefillData.relatedTo = {
          type: relatedType,
          id: relatedId
        };
      }
      
      // Update form data with prefilled values
      if (Object.keys(prefillData).length > 0) {
        setFormData(prev => ({
          ...prev,
          ...prefillData
        }));
      }
    };
    
    prefillFromParams();
  }, [searchParams]);

  const loadSubtasks = async () => {
    try {
      setLoadingSubtasks(true);
      const response = await fetch('/api/feedback/subtasks');
      const data = await response.json();
      
      if (data.success) {
        setSubtasks(data.subtasks);
      }
    } catch (error) {
      console.error('Failed to load subtasks:', error);
    } finally {
      setLoadingSubtasks(false);
    }
  };

  // Update form data
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle related item selection
  const handleRelatedToChange = (type: string, id: string = '') => {
    setFormData(prev => ({
      ...prev,
      relatedTo: { type: type as any, id }
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.userName.trim()) {
      newErrors.userName = 'שם מלא הוא שדה חובה';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'כותרת היא שדה חובה';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'תיאור הוא שדה חובה';
    }

    if (!formData.category) {
      newErrors.category = 'יש לבחור קטגוריה';
    }

    if (!formData.issueType) {
      newErrors.issueType = 'יש לבחור סוג הפניה';
    }

    // Validate related item selection
    if (formData.category === 'subtask_related' && !formData.relatedTo.id) {
      newErrors.relatedSubtask = 'יש לבחור תת-משימה ספציפית';
    }

    // Email validation if provided
    if (formData.userEmail && !isValidEmail(formData.userEmail)) {
      newErrors.userEmail = 'כתובת אימייל לא תקינה';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const requestData: CreateFeedbackRequest = {
        userName: formData.userName.trim(),
        userEmail: formData.userEmail.trim() || undefined,
        userPhone: formData.userPhone.trim() || undefined,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category as FeedbackCategory,
        issueType: formData.issueType as FeedbackIssueType,
        isUrgent: formData.isUrgent
      };

      // Add related item if specified
      if (formData.relatedTo.type && formData.relatedTo.id) {
        requestData.relatedTo = {
          type: formData.relatedTo.type as any,
          id: formData.relatedTo.id
        };
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success) {
        setSubmissionResult(result);
        setIsSubmitted(true);
      } else {
        // Handle field-specific errors
        if (result.field) {
          setErrors({ [result.field]: result.error });
        } else {
          setErrors({ general: result.error || 'שגיאה בשליחת הפניה' });
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      setErrors({ general: 'שגיאת רשת. אנא נסה שוב.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Success screen
  if (isSubmitted && submissionResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              הפניה נשלחה בהצלחה!
            </h1>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">מספר פניה:</p>
              <p className="text-lg font-mono font-semibold text-blue-600">
                {submissionResult.ticket.ticketNumber}
              </p>
            </div>
            
            <p className="text-gray-600 mb-6">
              {submissionResult.message}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setSubmissionResult(null);
                  setFormData({
                    userName: '',
                    userEmail: '',
                    userPhone: '',
                    title: '',
                    description: '',
                    category: '' as any,
                    issueType: '' as any,
                    relatedTo: { type: '' as any, id: '' },
                    isUrgent: false
                  });
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                שלח פניה נוספת
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                חזרה לדף הבית
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">מרכז פניות ותמיכה</h1>
            <p className="text-blue-100">
              יש לך שאלה, בעיה או הצעה? אנחנו כאן לעזור! מלא את הטופס למטה ונחזור אליך בהקדם.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם מלא *
                </label>
                <input
                  type="text"
                  value={formData.userName}
                  onChange={(e) => updateFormData('userName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.userName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="הכנס את שמך המלא"
                />
                {errors.userName && (
                  <p className="mt-1 text-sm text-red-600">{errors.userName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  אימייל (אופציונלי)
                </label>
                <input
                  type="email"
                  value={formData.userEmail}
                  onChange={(e) => updateFormData('userEmail', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.userEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="your@email.com"
                />
                {errors.userEmail && (
                  <p className="mt-1 text-sm text-red-600">{errors.userEmail}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                טלפון (אופציונלי)
              </label>
              <input
                type="tel"
                value={formData.userPhone}
                onChange={(e) => updateFormData('userPhone', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="050-1234567"
              />
            </div>

            {/* Issue Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">פרטי הפניה</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    כותרת הפניה *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="תאר בקצרה את הנושא"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      קטגוריה *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => updateFormData('category', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">בחר קטגוריה</option>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      סוג הפניה *
                    </label>
                    <select
                      value={formData.issueType}
                      onChange={(e) => updateFormData('issueType', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.issueType ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">בחר סוג</option>
                      {Object.entries(issueTypeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    {errors.issueType && (
                      <p className="mt-1 text-sm text-red-600">{errors.issueType}</p>
                    )}
                  </div>
                </div>

                {/* Subtask Selection */}
                {formData.category === 'subtask_related' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      בחר תת-משימה *
                    </label>
                    {loadingSubtasks ? (
                      <div className="text-sm text-gray-500">טוען תת-משימות...</div>
                    ) : (
                      <select
                        value={formData.relatedTo.id}
                        onChange={(e) => handleRelatedToChange('subtask', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.relatedSubtask ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">בחר תת-משימה</option>
                        {subtasks.map((subtask) => (
                          <option key={subtask.id} value={subtask.id}>
                            {subtask.title} (מ: {subtask.taskTitle})
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.relatedSubtask && (
                      <p className="mt-1 text-sm text-red-600">{errors.relatedSubtask}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תיאור מפורט *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    rows={5}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="תאר את הבעיה, השאלה או הבקשה שלך בפירוט..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                {/* Urgent checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isUrgent"
                    checked={formData.isUrgent}
                    onChange={(e) => updateFormData('isUrgent', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isUrgent" className="mr-2 block text-sm text-gray-700">
                    זוהי פניה דחופה
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ביטול
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      שולח...
                    </>
                  ) : (
                    'שלח פניה'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 