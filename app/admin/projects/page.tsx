'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Eye, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

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
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin');
      return;
    }

    fetchProjects();
  }, [router]);

  // Filter projects when search value changes
  useEffect(() => {
    if (searchValue) {
      setFilteredProjects(
        projects.filter(project => 
          project.name.toLowerCase().includes(searchValue.toLowerCase())
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
      const response = await fetch('/api/projects', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
        setFilteredProjects(data.projects);
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

  return (
    <div className="min-h-screen bg-background pb-8" dir="rtl">
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <Card className="border overflow-hidden">
          <CardHeader className="px-4 sm:px-6 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">רשימת פרויקטים</CardTitle>
                <p className="text-sm text-muted-foreground">{filteredProjects.length} פרויקטים במערכת</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="חפש לפי שם פרויקט..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="text-right pr-9 pl-9"
                  />
                  {searchValue && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 p-0 h-4 w-4"
                      onClick={() => setSearchValue("")}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">נקה חיפוש</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-60 flex items-center justify-center">
                <LoadingSpinner size="md" text="טוען פרויקטים..." />
              </div>
            ) : filteredProjects.length === 0 ? (
              <EmptyState
                title="אין פרויקטים"
                description="לא נמצאו פרויקטים במערכת"
                action={{
                  label: "צור פרויקט חדש",
                  href: "/admin/projects/new"
                }}
                icon={<Plus className="h-10 w-10" />}
                variant="centered"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[40%]">שם הפרויקט</TableHead>
                      <TableHead className="w-[15%] text-center hidden sm:table-cell">עדיפות</TableHead>
                      <TableHead className="w-[15%] text-center">סטטוס</TableHead>
                      <TableHead className="w-[20%] hidden md:table-cell">נוצר</TableHead>
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
                            <Link 
                              href={`/admin/projects/${project._id}`}
                              className="font-medium hover:underline text-foreground truncate"
                            >
                              {project.name}
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <Badge 
                            variant={project.priority <= 3 ? "default" : project.priority <= 7 ? "secondary" : "outline"}
                            className="mx-auto"
                          >
                            {project.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={project.isActive ? "default" : "outline"} className="mx-auto">
                            {project.isActive ? 'פעיל' : 'לא פעיל'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(project.createdAt), 'dd/MM/yyyy', { locale: he })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hidden sm:flex"
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
                                  className="h-8 w-8 hidden sm:flex"
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