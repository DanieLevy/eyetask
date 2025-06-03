'use client';

import { useHebrewFont, useEnglishFont, useMixedFont } from '@/hooks/useFont';

export default function FontDemo() {
  const hebrewHeading = useHebrewFont('heading');
  const hebrewBody = useHebrewFont('body');
  const hebrewCaption = useHebrewFont('caption');
  
  const englishHeading = useEnglishFont('heading');
  const englishBody = useEnglishFont('body');
  const englishCaption = useEnglishFont('caption');
  
  const mixedHeading = useMixedFont('heading');
  const mixedBody = useMixedFont('body');

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <div className="text-center mb-8">
        <h1 className={`text-3xl mb-2 ${mixedHeading.fontClass}`}>
          EyeTask Font Demo - הדגמת גופנים
        </h1>
        <p className={`text-lg ${mixedBody.fontClass}`}>
          Intel Display + Ploni Font Integration
        </p>
      </div>

      {/* Hebrew Fonts Section */}
      <section className="space-y-6">
        <h2 className={`text-2xl border-b pb-2 ${hebrewHeading.fontClass}`}>
          גופן פלוני (Ploni) - עברית
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-600">כותרות (Headings)</h3>
            <p className={`text-xl ${hebrewHeading.fontClass}`}>
              משימות נהיגה חדשות
            </p>
            <p className="text-sm text-gray-500">Ploni Regular (400)</p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-600">גוף טקסט (Body)</h3>
            <p className={`text-base ${hebrewBody.fontClass}`}>
              ברוכים הבאים למערכת EyeTask לניהול משימות נהיגה. המערכת מאפשרת מעקב אחר כל המשימות והפרויקטים.
            </p>
            <p className="text-sm text-gray-500">Ploni Light (300)</p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-600">כתוביות (Captions)</h3>
            <p className={`text-sm ${hebrewCaption.fontClass}`}>
              הערות ומידע נוסף על המשימה
            </p>
            <p className="text-sm text-gray-500">Ploni Ultralight (200)</p>
          </div>
        </div>
      </section>

      {/* English Fonts Section */}
      <section className="space-y-6">
        <h2 className={`text-2xl border-b pb-2 ${englishHeading.fontClass}`}>
          Intel Display Font - English
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-600">Headings</h3>
            <p className={`text-xl ${englishHeading.fontClass}`}>
              New Driving Tasks
            </p>
            <p className="text-sm text-gray-500">Intel Display Medium (500)</p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-600">Body Text</h3>
            <p className={`text-base ${englishBody.fontClass}`}>
              Welcome to EyeTask driver task management system. Track all your driving tasks and projects efficiently.
            </p>
            <p className="text-sm text-gray-500">Intel Display Regular (400)</p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-600">Captions</h3>
            <p className={`text-sm ${englishCaption.fontClass}`}>
              Additional notes and task information
            </p>
            <p className="text-sm text-gray-500">Intel Display Light (300)</p>
          </div>
        </div>
      </section>

      {/* Mixed Content Section */}
      <section className="space-y-6">
        <h2 className={`text-2xl border-b pb-2 ${mixedHeading.fontClass}`}>
          Mixed Content - תוכן מעורב
        </h2>
        
        <div className="space-y-4">
          <p className={`text-lg ${mixedBody.fontClass}`}>
            DATACO-2024-001: Urban driving analysis בניתוח נהיגה עירונית
          </p>
          <p className={`text-base ${mixedBody.fontClass}`}>
            Project: Tel Aviv Traffic Study - פרויקט מחקר תנועה תל אביב
          </p>
          <p className={`text-sm ${mixedBody.fontClass}`}>
            Status: Active | סטטוס: פעיל | Priority: High עדיפות גבוהה
          </p>
        </div>
      </section>

      {/* Font Weight Demonstration */}
      <section className="space-y-6">
        <h2 className="text-2xl border-b pb-2 font-mixed font-regular">
          Font Weights - משקלי גופן
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-600">Hebrew (Ploni)</h3>
            <p className="font-hebrew font-ultralight text-lg">אולטרה דק (200)</p>
            <p className="font-hebrew font-light text-lg">דק (300)</p>
            <p className="font-hebrew font-regular text-lg">רגיל (400)</p>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-600">English (Intel)</h3>
            <p className="font-english font-light text-lg">Light (300)</p>
            <p className="font-english font-regular text-lg">Regular (400)</p>
            <p className="font-english font-medium text-lg">Medium (500)</p>
          </div>
        </div>
      </section>

      {/* Utility Classes Demo */}
      <section className="space-y-6">
        <h2 className="text-2xl border-b pb-2 font-mixed font-regular">
          Tailwind Classes - מחלקות CSS
        </h2>
        
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <p className="text-gray-600 mb-2">Hebrew Classes:</p>
              <code className="block">font-hebrew font-ultralight</code>
              <code className="block">font-hebrew font-light</code>
              <code className="block">font-hebrew font-regular</code>
            </div>
            <div>
              <p className="text-gray-600 mb-2">English Classes:</p>
              <code className="block">font-english font-light</code>
              <code className="block">font-english font-regular</code>
              <code className="block">font-english font-medium</code>
            </div>
          </div>
          <div>
            <p className="text-gray-600 mb-2">Mixed Content:</p>
            <code className="text-sm font-mono">font-mixed font-regular</code>
          </div>
        </div>
      </section>
    </div>
  );
} 