'use client';

import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Plus, Pencil, Eye, MoreHorizontal, Trash2, FolderPlus, Calendar, Activity, Layers } from 'lucide-react';
import { Search, X } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Project = {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  color: string;
  priority: number;
  clientName: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  activeTaskCount?: number;
  highPriorityCount?: number;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }

    // Track page visit
    const trackVisit = async () => {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            page: 'admin_projects',
            action: 'page_view'
          })
        });
      } catch (error) {
        console.error('Failed to track visit:', error);
      }
    };

    trackVisit();
    fetchProjects();
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [router]);

  // Filter projects when search value changes
  useEffect(() => {
    if (searchValue) {
      setFilteredProjects(
        projects.filter(project => 
          project.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchValue.toLowerCase())
        )
      );
    } else {
      setFilteredProjects(projects);
    }
  }, [searchValue, projects]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const timestamp = Date.now();
      
      const [projectsRes, tasksRes] = await Promise.all([
        fetch(`/api/projects?_t=${timestamp}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json()),
        fetch(`/api/tasks?_t=${timestamp}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }).then(res => res.json())
      ]);

      if (projectsRes.success) {
        // Enhance projects with task counts
        const enhancedProjects = projectsRes.projects.map((project: Project) => {
          const projectTasks = tasksRes.success ? tasksRes.tasks.filter((task: { projectId: string; isVisible?: boolean; priority?: number }) => task.projectId === project._id) : [];
          return {
            ...project,
            taskCount: projectTasks.length,
            activeTaskCount: projectTasks.filter((task: { isVisible?: boolean }) => task.isVisible).length,
            highPriorityCount: projectTasks.filter((task: { priority?: number }) => (task.priority ?? 0) >= 1 && (task.priority ?? 0) <= 3).length
          };
        });
        
        setProjects(enhancedProjects);
        setFilteredProjects(enhancedProjects);
      } else {
        toast.error('Failed to load projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הפרויקט? כל המשימות המקושרות יימחקו גם כן.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      const result = await response.json();
      if (result.success) {
        toast.success('הפרויקט נמחק בהצלחה');
        fetchProjects();
      } else {
        toast.error(result.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Error deleting project');
    }
  };

  // Create actions menu for a project
  const ActionMenu = ({ project }: { project: Project }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">תפריט פעולות</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>פעולות</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/admin/projects/${project._id}`}>
            <Eye className="mr-2 h-4 w-4" /> צפה
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/projects/${project._id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" /> ערוך
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => deleteProject(project._id)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> מחק
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const getPriorityBadge = (priority: number) => {
    if (priority <= 3) return <Badge variant="destructive">גבוהה</Badge>;
    if (priority <= 7) return <Badge variant="secondary">בינונית</Badge>;
    return <Badge variant="outline">נמוכה</Badge>;
  };

  // Mobile card view component
  const ProjectCard = ({ project }: { project: Project }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div 
        className="h-2 w-full" 
        style={{ backgroundColor: project.color }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
            )}
          </div>
          <ActionMenu project={project} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={project.isActive ? "default" : "outline"}>
              {project.isActive ? 'פעיל' : 'לא פעיל'}
            </Badge>
            {getPriorityBadge(project.priority)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{project.taskCount || 0}</div>
            <div className="text-xs text-muted-foreground">משימות</div>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
            <div className="text-lg font-bold text-green-600 dark:text-green-400">{project.activeTaskCount || 0}</div>
            <div className="text-xs text-muted-foreground">פעילות</div>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded-md">
            <div className="text-lg font-bold text-red-600 dark:text-red-400">{project.highPriorityCount || 0}</div>
            <div className="text-xs text-muted-foreground">דחופות</div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>נוצר ב-{format(new Date(project.createdAt), 'dd/MM/yyyy', { locale: he })}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" asChild className="flex-1">
            <Link href={`/admin/projects/${project._id}`}>
              <Eye className="h-4 w-4 mr-1" />
              צפה
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild className="flex-1">
            <Link href={`/admin/projects/${project._id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" />
              ערוך
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-8" dir="rtl">
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <Card className="border overflow-hidden">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl md:text-2xl">ניהול פרויקטים</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {filteredProjects.length} {filteredProjects.length === 1 ? 'פרויקט' : 'פרויקטים'} במערכת
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="חפש פרויקט..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="text-right pr-9 pl-9 w-full sm:w-64"
                  />
                  {searchValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-1 top-1/2 transform -translate-y-1/2 p-0 h-6 w-6"
                      onClick={() => setSearchValue("")}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">נקה חיפוש</span>
                    </Button>
                  )}
                </div>
                <Button asChild>
                  <Link href="/admin/projects/new">
                    <Plus className="h-4 w-4 mr-1" />
                    פרויקט חדש
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-4">
            {loading ? (
              <div className="h-60 flex items-center justify-center">
                <LoadingSpinner size="md" text="טוען פרויקטים..." />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="px-4 pb-4">
                <EmptyState
                  title={searchValue ? "לא נמצאו תוצאות" : "אין פרויקטים"}
                  description={searchValue ? `לא נמצאו פרויקטים התואמים את החיפוש "${searchValue}"` : "צור את הפרויקט הראשון שלך כדי להתחיל"}
                  action={!searchValue ? {
                    label: "צור פרויקט חדש",
                    href: "/admin/projects/new"
                  } : undefined}
                  icon={<FolderPlus className="h-10 w-10" />}
                  variant="centered"
                />
              </div>
            ) : isMobile ? (
              // Mobile card view
              <div className="grid gap-4 p-4">
                {filteredProjects.map((project) => (
                  <ProjectCard key={project._id} project={project} />
                ))}
              </div>
            ) : (
              // Desktop table view
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[30%]">שם הפרויקט</TableHead>
                      <TableHead className="w-[10%] text-center">סטטוס</TableHead>
                      <TableHead className="w-[10%] text-center">עדיפות</TableHead>
                      <TableHead className="w-[15%] text-center">משימות</TableHead>
                      <TableHead className="w-[15%] text-center">פעילות</TableHead>
                      <TableHead className="w-[10%]">נוצר</TableHead>
                      <TableHead className="w-[10%] text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project._id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: project.color }}
                            />
                            <div className="min-w-0">
                              <Link 
                                href={`/admin/projects/${project._id}`}
                                className="font-medium hover:underline text-foreground truncate block"
                              >
                                {project.name}
                              </Link>
                              {project.description && (
                                <p className="text-sm text-muted-foreground truncate">{project.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={project.isActive ? "default" : "outline"}>
                            {project.isActive ? 'פעיל' : 'לא פעיל'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {getPriorityBadge(project.priority)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{project.taskCount || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Activity className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-600">{project.activeTaskCount || 0}</span>
                            {project.highPriorityCount && project.highPriorityCount > 0 && (
                              <>
                                <span className="text-muted-foreground mx-1">/</span>
                                <span className="font-medium text-red-600">{project.highPriorityCount}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(project.createdAt), 'dd/MM/yy', { locale: he })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  asChild
                                >
                                  <Link href={`/admin/projects/${project._id}`}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">צפה</span>
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>צפה בפרויקט</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  asChild
                                >
                                  <Link href={`/admin/projects/${project._id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">ערוך</span>
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>ערוך פרויקט</TooltipContent>
                            </Tooltip>
                            
                            <ActionMenu project={project} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 