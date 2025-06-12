"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

// Create simple versions of missing UI components
const Input = ({ 
  id, 
  name, 
  type = "text", 
  value, 
  onChange, 
  className = "", 
  min, 
  max, 
  required = false 
}) => (
  <input
    id={id}
    name={name}
    type={type}
    value={value}
    onChange={onChange}
    className={`w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${className}`}
    min={min}
    max={max}
    required={required}
  />
);

const Label = ({ htmlFor, children }) => (
  <label 
    htmlFor={htmlFor} 
    className="text-sm font-medium text-gray-700 dark:text-gray-300"
  >
    {children}
  </label>
);

const Textarea = ({ 
  id, 
  name, 
  value, 
  onChange, 
  rows = 3, 
  className = "" 
}) => (
  <textarea
    id={id}
    name={name}
    value={value}
    onChange={onChange}
    rows={rows}
    className={`w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${className}`}
  />
);

const Checkbox = ({ id, checked, onCheckedChange }) => (
  <input
    id={id}
    type="checkbox"
    checked={checked}
    onChange={e => onCheckedChange(e.target.checked)}
    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:focus:ring-blue-400"
  />
);

export default function EditProjectPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    color: "#3B82F6", // Default blue color
    priority: 1,
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    notes: ""
  });

  useEffect(() => {
    async function fetchProject() {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${params.projectId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch project");
        }
        
        const data = await response.json();
        setProject(data.project);
        setFormData({
          name: data.project.name || "",
          description: data.project.description || "",
          isActive: data.project.isActive ?? true,
          color: data.project.color || "#3B82F6",
          priority: data.project.priority || 1,
          clientName: data.project.clientName || "",
          clientEmail: data.project.clientEmail || "",
          clientPhone: data.project.clientPhone || "",
          notes: data.project.notes || ""
        });
      } catch (error) {
        console.error("Error fetching project:", error);
        toast.error("שגיאה בטעינת נתוני הפרויקט");
      } finally {
        setLoading(false);
      }
    }

    fetchProject();
  }, [params.projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      const response = await fetch(`/api/projects/${params.projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update project");
      }
      
      toast.success("הפרויקט עודכן בהצלחה");
      router.push(`/admin/projects/${params.projectId}`);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("שגיאה בעדכון הפרויקט");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-4">עריכת פרויקט</h1>
        <div className="flex justify-center items-center h-[50vh]">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">עריכת פרויקט</h1>
        <Link 
          href={`/admin/projects/${params.projectId}`} 
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          חזרה לפרויקט
        </Link>
      </div>
      
      <form onSubmit={handleSubmit} className="mt-6">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader className="border-b pb-3">
            <h2 className="text-xl font-bold">עריכת פרויקט</h2>
            <p className="text-sm text-gray-500">עדכן את פרטי הפרויקט</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם הפרויקט</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required={true}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="color">צבע</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="w-12 h-12 p-1"
                  />
                  <Input
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">תיאור</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">עדיפות</Label>
                <Input
                  id="priority"
                  name="priority"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={handleChange}
                />
              </div>
              
              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2 space-x-reverse mt-6">
                  <Checkbox 
                    id="isActive" 
                    checked={formData.isActive} 
                    onCheckedChange={handleCheckboxChange}
                  />
                  <Label htmlFor="isActive">פרויקט פעיל</Label>
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <h3 className="text-lg font-medium mb-2">פרטי לקוח</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">שם הלקוח</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">אימייל</Label>
                  <Input
                    id="clientEmail"
                    name="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">טלפון</Label>
                  <Input
                    id="clientPhone"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </CardContent>
          <div className="flex justify-between p-6 border-t">
            <Button
              type="button"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
              onClick={() => router.push(`/admin/projects/${params.projectId}`)}
            >
              ביטול
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              disabled={submitting}
            >
              {submitting ? (
                <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></div>
              ) : (
                "שמור שינויים"
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
} 