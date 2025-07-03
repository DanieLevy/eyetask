'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ListTodo, Search, Filter, ChevronRight, Calendar, Hash, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Task {
  _id: string;
  id?: string;
  title: string;
  projectId: string;
  projectName?: string;
  priority: number;
  amountNeeded: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  _id: string;
  name: string;
}

export default function AdminTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Fetch tasks and projects in parallel
      const [tasksRes, projectsRes] = await Promise.all([
        fetch('/api/tasks', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!tasksRes.ok || !projectsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [tasksData, projectsData] = await Promise.all([
        tasksRes.json(),
        projectsRes.json()
      ]);

      setTasks(tasksData.tasks || []);
      setProjects(projectsData.projects || []);

      // Map project names to tasks
      const projectMap = new Map(projectsData.projects.map((p: Project) => [p._id, p.name]));
      const tasksWithProjects = (tasksData.tasks || []).map((task: Task) => ({
        ...task,
        projectName: projectMap.get(task.projectId) || 'Unknown Project'
      }));
      
      setTasks(tasksWithProjects);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === 'all' || task.projectId === filterProject;
    return matchesSearch && matchesProject;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'תאריך לא ידוע';
    
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">טוען משימות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ListTodo className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">ניהול משימות</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {tasks.length} משימות במערכת
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/tasks/bulk-import">
                <Button variant="outline" size="sm">
                  ייבוא מרובה
                </Button>
              </Link>
              <Link href="/admin/tasks/new">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">משימה חדשה</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="חיפוש משימות..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="rtl"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  dir="rtl"
                >
                  <option value="all">כל הפרויקטים</option>
                  {projects.map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ListTodo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterProject !== 'all' 
                  ? 'לא נמצאו משימות התואמות את החיפוש'
                  : 'אין משימות במערכת'
                }
              </p>
              {!searchTerm && filterProject === 'all' && (
                <Link href="/admin/tasks/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    צור משימה ראשונה
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTasks.map((task) => {
              const taskId = task.id || task._id;
              
              return (
                <Card 
                  key={taskId} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/admin/tasks/${taskId}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-lg line-clamp-2">
                        {task.title}
                      </h3>
                      <Badge 
                        variant={task.isVisible ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {task.isVisible ? 'גלוי' : 'מוסתר'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Folder className="h-4 w-4" />
                      <span>{task.projectName}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        עדיפות: {task.priority}
                      </span>
                      <span>כמות: {task.amountNeeded}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.createdAt)}
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
} 