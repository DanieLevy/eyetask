'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  Plus,
  FolderPlus,
  ChevronRight
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { toast } from 'sonner';

interface NewProjectData {
  name: string;
  description: string;
  image?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [operationLoading, setOperationLoading] = useState(false);
  
  const [newProjectData, setNewProjectData] = useState<NewProjectData>({
    name: '',
    description: '',
    image: ''
  });

  const handleCreateProject = async () => {
    setOperationLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify(newProjectData)
      });

      const result = await response.json();
      
      if (result.success) {
        router.push('/admin/projects');
      } else {
        toast.error('Failed to create project: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Error creating project');
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/projects"
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="חזור לפרויקטים"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <FolderPlus className="h-6 w-6 text-primary" />
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>פרויקטים</span>
                  <ChevronRight className="h-4 w-4" />
                  <span>פרויקט חדש</span>
                </div>
                <h1 className="text-lg font-bold text-foreground">צור פרויקט חדש</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground">צור פרויקט חדש</h2>
              <p className="text-sm text-muted-foreground mt-1">הזן פרטי הפרויקט החדש</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">שם פרויקט *</label>
                <input
                  type="text"
                  value={newProjectData.name}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="הזן שם פרויקט"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תיאור</label>
                <textarea
                  value={newProjectData.description}
                  onChange={(e) => setNewProjectData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                  rows={3}
                  placeholder="הוסף תיאור לפרויקט (אופציונלי)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">תמונת פרויקט (אופציונלי)</label>
                <ImageUpload
                  onImageSelect={(image) => setNewProjectData(prev => ({ ...prev, image: image || '' }))}
                  currentImage={newProjectData.image}
                />
                <p className="text-xs text-muted-foreground mt-1">העלה תמונה המייצגת את הפרויקט</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={handleCreateProject}
                disabled={operationLoading || !newProjectData.name.trim()}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {operationLoading ? 'יוצר...' : 'צור פרויקט'}
              </button>
              <Link
                href="/admin/projects"
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-center"
              >
                ביטול
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 