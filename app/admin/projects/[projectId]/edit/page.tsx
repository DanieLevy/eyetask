"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { InputField, TextareaField, CheckboxField } from '@/components/FormComponents';

interface FormData {
  name: string;
  description: string;
  isActive: boolean;
  color: string;
  priority: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
  image: string;
}

// Define the page props type for Next.js 15+
interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function EditProjectPage({ params }: PageProps) {
  // Await the params to get the projectId
  const { projectId } = await params;
  
  return <EditProjectClient projectId={projectId} />;
}

// Client component that handles the actual functionality
function EditProjectClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    isActive: true,
    color: '#3B82F6', // Default blue
    priority: 1,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    notes: '',
    image: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }
    
    // Fetch project data
    async function fetchProject() {
      setLoading(true);
      
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch project: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success || !data.project) {
          throw new Error(data.error || 'Failed to load project data');
        }
        
        // Set form data from project
        setFormData({
          name: data.project.name || '',
          description: data.project.description || '',
          isActive: data.project.isActive !== undefined ? data.project.isActive : true,
          color: data.project.color || '#3B82F6',
          priority: data.project.priority || 1,
          clientName: data.project.clientName || '',
          clientEmail: data.project.clientEmail || '',
          clientPhone: data.project.clientPhone || '',
          notes: data.project.notes || '',
          image: data.project.image || ''
        });
        
      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Failed to load project data. Please try again.');
        toast.error('Failed to load project data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProject();
  }, [projectId, router]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error("You are not authenticated. Please log in.");
        router.push('/admin');
        return;
      }
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project');
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Project updated successfully');
        router.push(`/admin/projects/${projectId}`);
      } else {
        throw new Error(result.error || 'Failed to update project');
      }
    } catch (err: any) {
      console.error('Error updating project:', err);
      setError(err.message || 'Failed to update project');
      toast.error(err.message || 'Failed to update project');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">טוען פרטי פרויקט...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-8" dir="rtl">
      <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-3">
              <Link 
                href={`/admin/projects/${projectId}`}
                className="p-2 inline-flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="חזור"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                עריכת פרויקט
              </h1>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader className="border-b border-border">
            <h2 className="text-xl font-bold">עריכת פרויקט: {formData.name}</h2>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="שם הפרויקט"
                  htmlFor="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="הזן שם פרויקט"
                />
                
                <div className="flex gap-4 items-center">
                  <InputField
                    label="צבע פרויקט"
                    htmlFor="color"
                    type="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="flex-1"
                  />
                  
                  <InputField
                    label="עדיפות"
                    htmlFor="priority"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.priority}
                    onChange={handleChange}
                    hint="1 = גבוהה, 10 = נמוכה"
                    className="flex-1"
                  />
                  
                  <CheckboxField
                    id="isActive"
                    label="פרויקט פעיל"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleCheckboxChange('isActive', checked)}
                    className="flex-1 self-end pb-1"
                  />
                </div>
              </div>
              
              <TextareaField
                label="תיאור"
                htmlFor="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="תיאור הפרויקט"
                rows={3}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="שם לקוח"
                  htmlFor="clientName"
                  value={formData.clientName}
                  onChange={handleChange}
                  placeholder="שם הלקוח"
                />
                
                <InputField
                  label="אימייל לקוח"
                  htmlFor="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={handleChange}
                  placeholder="אימייל הלקוח"
                />
                
                <InputField
                  label="טלפון לקוח"
                  htmlFor="clientPhone"
                  value={formData.clientPhone}
                  onChange={handleChange}
                  placeholder="טלפון הלקוח"
                />
                
                <InputField
                  label="תמונה (URL)"
                  htmlFor="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="קישור לתמונה"
                />
              </div>
              
              <TextareaField
                label="הערות"
                htmlFor="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="הערות נוספות"
                rows={2}
              />
              
              <div className="flex justify-between pt-4 border-t border-border">
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'שומר...' : 'שמור שינויים'}
                  </Button>
                  <Link href={`/admin/projects/${projectId}`}>
                    <Button type="button" variant="outline">
                      ביטול
                    </Button>
                  </Link>
                </div>
                
                <Link href={`/admin/projects/${projectId}`}>
                  <Button type="button" variant="ghost" className="text-red-500">
                    חזרה לפרויקט
                  </Button>
                </Link>
              </div>
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 mt-4">
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 