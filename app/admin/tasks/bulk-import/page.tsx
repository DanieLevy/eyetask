'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Upload, 
  Check, 
  X, 
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Loader2,
  FileJson,
  Upload as UploadIcon,
  AlertCircle,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

// Interface for validation status
interface ValidationStatus {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  taskMap?: Record<string, { id: string; title: string }>;
}

// Interface for import results
interface ImportResults {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: { taskKey: string; subtaskKey: string; error: string }[];
  taskResults: { taskKey: string; subtasksAdded: number }[];
}

export default function BulkImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [expandedErrors, setExpandedErrors] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [expandedPreviewTasks, setExpandedPreviewTasks] = useState<Record<string, boolean>>({});
  
  // Function to handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/json' && !selectedFile.name.endsWith('.json')) {
        toast.error('Please select a valid JSON file');
        return;
      }
      
      setFile(selectedFile);
      
      // Reset states
      setParsedData(null);
      setValidationStatus(null);
      setImportResults(null);
      
      // Read the file
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setParsedData(json);
          validateData(json);
        } catch (error) {
          toast.error('Failed to parse JSON file');
          setValidationStatus({
            valid: false,
            errors: ['Invalid JSON format']
          });
        }
      };
      
      reader.readAsText(selectedFile);
    }
  };
  
  // Function to validate the JSON data
  const validateData = async (data: any) => {
    setIsValidating(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/tasks/bulk-import/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Handle API errors (like 401 unauthorized)
        setValidationStatus({
          valid: false,
          errors: [result.error || 'Failed to validate data']
        });
        toast.error(result.error || 'Failed to validate data');
        return;
      }
      
      setValidationStatus(result);
      
      if (result.valid) {
        const warningCount = result.warnings?.length || 0;
        toast.success(`JSON data validated successfully${warningCount > 0 ? ` (${warningCount} warnings)` : ''}`);
      } else {
        toast.error(`Validation failed with ${result.errors?.length || 0} errors`);
      }
    } catch (error) {
      console.error('Error validating JSON:', error);
      setValidationStatus({
        valid: false,
        errors: ['Failed to validate data']
      });
      toast.error('Error validating data');
    } finally {
      setIsValidating(false);
    }
  };
  
  // Function to handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type !== 'application/json' && !droppedFile.name.endsWith('.json')) {
        toast.error('Please drop a valid JSON file');
        return;
      }
      
      setFile(droppedFile);
      
      // Reset states
      setParsedData(null);
      setValidationStatus(null);
      setImportResults(null);
      
      // Read the file
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          setParsedData(json);
          validateData(json);
        } catch (error) {
          toast.error('Failed to parse JSON file');
          setValidationStatus({
            valid: false,
            errors: ['Invalid JSON format']
          });
        }
      };
      
      reader.readAsText(droppedFile);
    }
  }, []);
  
  // Prevent default for drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  // Function to handle import
  const handleImport = async () => {
    if (!parsedData || !validationStatus?.valid) return;
    
    setIsImporting(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/tasks/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(parsedData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Handle API errors (like 401 unauthorized)
        toast.error(result.error || 'Import failed due to authorization error');
        return;
      }
      
      if (result.success) {
        setImportResults(result.results);
        setShowConfirmation(false);
        toast.success(`Import completed: ${result.results.successful} subtasks created successfully`);
      } else {
        toast.error(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Error during import process');
    } finally {
      setIsImporting(false);
    }
  };
  
  // Function to show confirmation step
  const showImportConfirmation = () => {
    setShowConfirmation(true);
  };
  
  // Function to toggle task expansion
  const toggleTaskExpansion = (taskKey: string) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };
  
  // Function to toggle errors expansion
  const toggleErrorsExpansion = () => {
    setExpandedErrors(prev => !prev);
  };
  
  // Function to toggle preview task expansion
  const togglePreviewTaskExpansion = (taskKey: string) => {
    setExpandedPreviewTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="חזור ללוח הבקרה"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Upload className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>פאנל ניהול</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>ייבוא המוני</span>
                </div>
                <h1 className="text-lg font-bold text-foreground">ייבוא תת-משימות</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            {/* Step 1: Upload File */}
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">שלב 1: העלאת קובץ JSON</h2>
              <p className="text-sm text-muted-foreground mt-1">
                העלה קובץ JSON המכיל נתוני משימות מ-JIRA
              </p>
              
              <div 
                className={`mt-4 border-2 border-dashed ${
                  file ? 'border-primary bg-primary/5' : 'border-border'
                } rounded-lg p-8 text-center cursor-pointer transition-colors`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                />
                
                {file ? (
                  <div>
                    <div className="flex items-center justify-center mb-2">
                      <FileJson className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-foreground font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      className="mt-4 px-3 py-1 bg-primary text-primary-foreground rounded-md text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setParsedData(null);
                        setValidationStatus(null);
                        setImportResults(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      בחר קובץ אחר
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center mb-4">
                      <UploadIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <p className="text-foreground font-medium">גרור לכאן קובץ JSON או לחץ לבחירת קובץ</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      הקובץ צריך להכיל מבנה של משימות ותת-משימות מ-JIRA
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Step 2: Validation Results */}
            {(validationStatus || isValidating) && !showConfirmation && !importResults && (
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">שלב 2: תוצאות בדיקת תקינות</h2>
                
                {isValidating ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">בודק תקינות נתונים...</p>
                    </div>
                  </div>
                ) : validationStatus ? (
                  <div className="mt-4">
                    <div className={`p-4 rounded-lg ${
                      validationStatus.valid 
                        ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    }`}>
                      <div className="flex items-center">
                        {validationStatus.valid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" />
                        )}
                        <span className={`font-medium ${
                          validationStatus.valid 
                            ? 'text-green-700 dark:text-green-400' 
                            : 'text-red-700 dark:text-red-400'
                        }`}>
                          {validationStatus.valid 
                            ? `הקובץ תקין ומוכן לייבוא${validationStatus.warnings?.length ? ` (${validationStatus.warnings.length} אזהרות)` : ''}` 
                            : `נמצאו ${validationStatus.errors.length} שגיאות בקובץ`}
                        </span>
                      </div>
                      
                      {/* Show errors if validation failed */}
                      {!validationStatus.valid && validationStatus.errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                          <p className="font-medium mb-1">פירוט שגיאות:</p>
                          <ul className="list-disc list-inside space-y-1 pr-2">
                            {validationStatus.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Show warnings if any exist */}
                      {validationStatus.warnings && validationStatus.warnings.length > 0 && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 rounded-lg">
                          <div className="flex items-center mb-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                            <p className="font-medium text-amber-700 dark:text-amber-400">
                              אזהרות ({validationStatus.warnings.length})
                            </p>
                          </div>
                          <div className="text-sm text-amber-600 dark:text-amber-400">
                            <ul className="list-disc list-inside space-y-1 pr-2">
                              {validationStatus.warnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                            <p className="mt-2 text-xs text-amber-500">
                              אזהרות אלו לא חוסמות את הייבוא, אך כדאי לבדוק אותן לפני המשך
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Show task summary if validation passed */}
                      {validationStatus.valid && validationStatus.taskMap && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                            משימות שנמצאו בקובץ:
                          </p>
                          <div className="space-y-2">
                            {Object.entries(validationStatus.taskMap).map(([key, task]) => (
                              <div key={key} className="text-sm bg-green-100 dark:bg-green-900/30 p-2 rounded">
                                <span className="font-medium">{key}:</span> {task.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Preview button (enabled only if validation passed) */}
                    {validationStatus.valid && (
                      <div className="mt-4 flex justify-end">
                        <button
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                          onClick={showImportConfirmation}
                        >
                          <Eye className="h-4 w-4" />
                          הצג פירוט תת-משימות לייבוא
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            
            {/* Step 3: Confirmation and Preview */}
            {showConfirmation && validationStatus?.valid && parsedData && (
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">שלב 3: אישור פרטי הייבוא</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  בדוק את תת-המשימות שעומדות להתווסף ואשר את הייבוא
                </p>
                
                <div className="mt-4 space-y-6">
                  {parsedData.parent_issues.map((parentIssue: any) => {
                    const taskInfo = validationStatus.taskMap?.[parentIssue.key];
                    if (!taskInfo) return null;
                    
                    return (
                      <div key={parentIssue.key} className="border border-border rounded-lg overflow-hidden">
                        <div 
                          className="p-3 bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => togglePreviewTaskExpansion(parentIssue.key)}
                        >
                          <div>
                            <span className="font-medium">{parentIssue.key}</span>
                            <span className="mx-2 text-muted-foreground">→</span>
                            <span>{taskInfo.title}</span>
                            <span className="mr-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                              {parentIssue.subtasks.length} תת-משימות
                            </span>
                          </div>
                          
                          {expandedPreviewTasks[parentIssue.key] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                        
                        {expandedPreviewTasks[parentIssue.key] && (
                          <div className="p-3">
                            <div className="overflow-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border">
                                    <th className="text-right p-2">DATACO</th>
                                    <th className="text-right p-2">כותרת</th>
                                    <th className="text-right p-2">סוג</th>
                                    <th className="text-right p-2">כמות</th>
                                    <th className="text-right p-2">מזג אוויר</th>
                                    <th className="text-right p-2">סוג דרך</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {parentIssue.subtasks.map((subtask: any, index: number) => {
                                    const isCalibration = subtask.amount_needed === 0 || subtask.issue_type === 'Sub Task';
                                    return (
                                      <tr key={subtask.dataco_number} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                                        <td className="p-2 border-b border-border">{subtask.dataco_number}</td>
                                        <td className="p-2 border-b border-border">
                                          <div className="flex items-center gap-2">
                                            {subtask.summary}
                                            {isCalibration && (
                                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full font-medium">
                                                כיול
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-2 border-b border-border">{subtask.issue_type}</td>
                                        <td className={`p-2 border-b border-border ${isCalibration ? 'text-blue-600 font-medium' : ''}`}>
                                          {subtask.amount_needed}
                                        </td>
                                        <td className="p-2 border-b border-border">{subtask.weather}</td>
                                        <td className="p-2 border-b border-border">{subtask.road_type}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            
                            {parentIssue.subtasks.length > 0 && parentIssue.subtasks[0].labels && (
                              <div className="mt-3">
                                <span className="text-xs font-medium text-muted-foreground">לייבלים: </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Array.from(new Set(parentIssue.subtasks.flatMap((s: any) => s.labels || []))).map((label) => (
                                    <span key={label as string} className="px-2 py-0.5 bg-muted rounded-full text-xs">
                                      {label as string}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800 dark:text-amber-400">אנא בדוק בקפידה לפני אישור הייבוא</p>
                        <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                          לאחר אישור, כל תת-המשימות יתווספו למשימות הקיימות. שים לב שהפעולה לא ניתנת לביטול.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setShowConfirmation(false)}
                    >
                      חזרה לבדיקת תקינות
                    </button>
                    
                    <button
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                      onClick={handleImport}
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          מייבא...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          אשר ייבוא תת-משימות
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Step 4: Import Results */}
            {importResults && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-foreground">שלב 4: תוצאות הייבוא</h2>
                
                <div className="mt-4 bg-muted p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                    <div className="bg-card p-3 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">סה"כ תת-משימות</p>
                      <p className="text-2xl font-bold text-foreground">{importResults.totalProcessed}</p>
                    </div>
                    <div className="bg-card p-3 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">הצליחו</p>
                      <p className="text-2xl font-bold text-green-500">{importResults.successful}</p>
                    </div>
                    <div className="bg-card p-3 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">נכשלו</p>
                      <p className="text-2xl font-bold text-red-500">{importResults.failed}</p>
                    </div>
                  </div>
                  
                  {/* Task results */}
                  <div className="space-y-3 mb-4">
                    <h3 className="text-md font-medium text-foreground">פירוט לפי משימה:</h3>
                    
                    {importResults.taskResults.map((result) => (
                      <div key={result.taskKey} className="bg-card border border-border rounded-lg overflow-hidden">
                        <div 
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                          onClick={() => toggleTaskExpansion(result.taskKey)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{result.taskKey}</span>
                            <span className="text-sm text-muted-foreground">
                              ({result.subtasksAdded} תת-משימות נוספו)
                            </span>
                          </div>
                          {expandedTasks[result.taskKey] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                        
                        {expandedTasks[result.taskKey] && (
                          <div className="p-3 border-t border-border bg-accent/10">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              <span className="text-sm">
                                נוספו {result.subtasksAdded} תת-משימות בהצלחה
                              </span>
                            </div>
                            <Link
                              href={`/admin/tasks/${validationStatus?.taskMap?.[result.taskKey]?.id}`}
                              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              צפה במשימה
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Errors section */}
                  {importResults.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                      <div 
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        onClick={toggleErrorsExpansion}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-red-700 dark:text-red-400">
                            שגיאות ({importResults.errors.length})
                          </span>
                        </div>
                        {expandedErrors ? (
                          <ChevronDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      
                      {expandedErrors && (
                        <div className="p-3 border-t border-red-200 dark:border-red-800">
                          <ul className="space-y-2 text-sm text-red-600 dark:text-red-400">
                            {importResults.errors.map((error, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="font-medium">{error.subtaskKey}</span> ({error.taskKey}): {error.error}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                      onClick={() => {
                        setFile(null);
                        setParsedData(null);
                        setValidationStatus(null);
                        setImportResults(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      ייבוא חדש
                    </button>
                    
                    <Link
                      href="/admin/dashboard"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      חזור ללוח הבקרה
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 