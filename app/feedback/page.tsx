'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Send, ArrowLeft, Phone, Mail, AlertTriangle, ExternalLink, User, FileText, Tag, AlertCircle } from 'lucide-react';
import { useHebrewFont, useMixedFont } from '@/hooks/useFont';
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

function FeedbackPageCore() {
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
        
        // Reset form
        setFormData({
          userName: '',
          userEmail: '',
          userPhone: '',
          title: '',
          description: '',
          category: '',
          issueType: '',
          relatedTo: { type: '', id: '' },
          isUrgent: false
        });
      } else {
        throw new Error(result.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('שגיאה בשליחת הפניה. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  // Font configurations
  const hebrewHeading = useHebrewFont('heading');
  const hebrewBody = useHebrewFont('body');
  const mixedBody = useMixedFont('body');

  // Success page after submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-8 text-center">
              <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" />
              <h1 className={`text-2xl font-bold text-white ${hebrewHeading.fontClass}`}>
                הפניה נשלחה בהצלחה!
              </h1>
            </div>
            
            <div className="p-6 text-center">
              <div className="mb-6">
                <p className={`text-lg text-gray-700 mb-2 ${hebrewBody.fontClass}`}>
                  תודה על הפניה שלך!
                </p>
                <p className={`text-gray-600 mb-4 ${hebrewBody.fontClass}`}>
                  מספר הפניה שלך הוא:
                </p>
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <span className="text-2xl font-bold text-blue-600">
                    {submissionResult?.ticketNumber}
                  </span>
                </div>
                <p className={`text-sm text-gray-500 ${hebrewBody.fontClass}`}>
                  נחזור אליך בהקדם האפשרי
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setSubmissionResult(null);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  שלח פניה נוספת
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  חזור לעמד הבית
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-3">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6">
            <div className="flex items-center justify-between">
              <h1 className={`text-xl md:text-2xl font-bold text-white ${hebrewHeading.fontClass}`}>
                מרכז פניות ותמיכה
              </h1>
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title="חזור לעמוד הבית"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className={`text-blue-100 mt-2 text-sm ${hebrewBody.fontClass}`}>
              אנחנו כאן לעזור לך! שלח לנו פניה ונחזור אליך בהקדם
            </p>
          </div>

          {/* Form */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold text-gray-900 flex items-center gap-2 ${hebrewHeading.fontClass}`}>
                  <User className="w-5 h-5 text-blue-600" />
                  פרטים אישיים
                </h3>
                
                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${hebrewBody.fontClass}`}>
                    שם מלא *
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => updateFormData('userName', e.target.value)}
                    className={`w-full p-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.userName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="הזן את שמך המלא"
                  />
                  {errors.userName && (
                    <p className="text-red-500 text-xs mt-1">{errors.userName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${hebrewBody.fontClass}`}>
                      אימייל (אופציונלי)
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={formData.userEmail}
                        onChange={(e) => updateFormData('userEmail', e.target.value)}
                        className={`w-full pr-10 pl-3 p-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.userEmail ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="your@email.com"
                        dir="ltr"
                      />
                    </div>
                    {errors.userEmail && (
                      <p className="text-red-500 text-xs mt-1">{errors.userEmail}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${hebrewBody.fontClass}`}>
                      טלפון (אופציונלי)
                    </label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.userPhone}
                        onChange={(e) => updateFormData('userPhone', e.target.value)}
                        className="w-full pr-10 pl-3 p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="050-1234567"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Feedback Content */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold text-gray-900 flex items-center gap-2 ${hebrewHeading.fontClass}`}>
                  <FileText className="w-5 h-5 text-blue-600" />
                  תוכן הפניה
                </h3>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${hebrewBody.fontClass}`}>
                    כותרת הפניה *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', e.target.value)}
                    className={`w-full p-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="תאר בקצרה את הנושא"
                  />
                  {errors.title && (
                    <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium text-gray-700 mb-2 ${hebrewBody.fontClass}`}>
                    תיאור מפורט *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    rows={6}
                    className={`w-full p-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="תאר בפירוט את הבעיה, השאלה או ההצעה שלך..."
                  />
                  {errors.description && (
                    <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                  )}
                </div>
              </div>

              {/* Categories and Type */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold text-gray-900 flex items-center gap-2 ${hebrewHeading.fontClass}`}>
                  <Tag className="w-5 h-5 text-blue-600" />
                  סיווג הפניה
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${hebrewBody.fontClass}`}>
                      קטגוריה *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => updateFormData('category', e.target.value)}
                      className={`w-full p-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.category ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">בחר קטגוריה</option>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                    )}
                  </div>

                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${hebrewBody.fontClass}`}>
                      סוג הפניה *
                    </label>
                    <select
                      value={formData.issueType}
                      onChange={(e) => updateFormData('issueType', e.target.value)}
                      className={`w-full p-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.issueType ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">בחר סוג פניה</option>
                      {Object.entries(issueTypeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    {errors.issueType && (
                      <p className="text-red-500 text-xs mt-1">{errors.issueType}</p>
                    )}
                  </div>
                </div>

                {/* Related Subtask Selection - only show if subtask_related category is selected */}
                {formData.category === 'subtask_related' && (
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${hebrewBody.fontClass}`}>
                      תת-משימה קשורה *
                    </label>
                    <select
                      value={formData.relatedTo.id}
                      onChange={(e) => handleRelatedToChange('subtask', e.target.value)}
                      className={`w-full p-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.relatedSubtask ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={loadingSubtasks}
                    >
                      <option value="">בחר תת-משימה</option>
                      {subtasks.map((subtask) => (
                        <option key={subtask.id} value={subtask.id}>
                          {subtask.title} ({subtask.taskTitle})
                        </option>
                      ))}
                    </select>
                    {errors.relatedSubtask && (
                      <p className="text-red-500 text-xs mt-1">{errors.relatedSubtask}</p>
                    )}
                    {loadingSubtasks && (
                      <p className="text-blue-500 text-xs mt-1">טוען תת-משימות...</p>
                    )}
                  </div>
                )}

                {/* Urgent checkbox */}
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <input
                    type="checkbox"
                    id="isUrgent"
                    checked={formData.isUrgent}
                    onChange={(e) => updateFormData('isUrgent', e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <label htmlFor="isUrgent" className={`text-sm font-medium text-yellow-800 flex items-center gap-2 ${hebrewBody.fontClass}`}>
                    <AlertTriangle className="w-4 h-4" />
                    פניה דחופה - דורשת תשומת לב מיידית
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      שולח פניה...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      שלח פניה
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${hebrewHeading.fontClass}`}>
            זקוק לעזרה מיידית?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Phone className="w-5 h-5 text-blue-600" />
              <div>
                <p className={`font-medium text-blue-900 ${hebrewBody.fontClass}`}>תמיכה טלפונית</p>
                <p className="text-blue-700 text-sm">*1234 או 03-1234567</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Mail className="w-5 h-5 text-green-600" />
              <div>
                <p className={`font-medium text-green-900 ${hebrewBody.fontClass}`}>אימייל</p>
                <p className="text-green-700 text-sm">support@mobileye.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function FeedbackPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-4 px-3 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">טוען טופס פניות...</p>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function FeedbackPage() {
  return (
    <Suspense fallback={<FeedbackPageFallback />}>
      <FeedbackPageCore />
    </Suspense>
  );
} 