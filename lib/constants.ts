// Application constants

// Subtask type options
export const subtaskTypeOptions = [
  { value: 'image', label: 'תמונה' },
  { value: 'video', label: 'וידאו' },
  { value: 'text', label: 'טקסט' },
  { value: 'checkbox', label: 'צ׳קבוקס' },
  { value: 'location', label: 'מיקום' },
  { value: 'file', label: 'קובץ' },
  { value: 'audio', label: 'הקלטת שמע' }
];

// Task type options
export const taskTypeOptions = [
  { value: 'events', label: 'אירועים' },
  { value: 'hours', label: 'שעות' }
];

// Task time of day options
export const dayTimeOptions = [
  { value: 'day', label: 'יום' },
  { value: 'night', label: 'לילה' },
  { value: 'dusk', label: 'דמדומים' },
  { value: 'dawn', label: 'שחר' }
];

// Task priority options
export const priorityOptions = [
  { value: '1', label: 'עדיפות גבוהה מאוד' },
  { value: '3', label: 'עדיפות גבוהה' },
  { value: '5', label: 'עדיפות בינונית' },
  { value: '7', label: 'עדיפות נמוכה' },
  { value: '10', label: 'עדיפות נמוכה מאוד' }
];

// Daily update type options
export const updateTypeOptions = [
  { value: 'info', label: 'מידע' },
  { value: 'warning', label: 'אזהרה' },
  { value: 'success', label: 'הצלחה' },
  { value: 'error', label: 'שגיאה' },
  { value: 'announcement', label: 'הודעה' }
];

// Duration type options
export const durationTypeOptions = [
  { value: 'hours', label: 'שעות' },
  { value: 'days', label: 'ימים' },
  { value: 'permanent', label: 'לצמיתות' }
]; 