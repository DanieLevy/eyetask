"use client"

import React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  cancelText?: string
  confirmText?: string
  loading?: boolean
  itemName?: string
  trigger?: React.ReactNode
  variant?: "default" | "sidebar" | "minimal"
  dir?: "rtl" | "ltr"
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "האם אתה בטוח?",
  description = "פעולה זו אינה ניתנת לשחזור. פריט זה יימחק לצמיתות.",
  cancelText = "ביטול",
  confirmText = "מחק",
  loading = false,
  itemName,
  trigger,
  variant = "default",
  dir = "rtl"
}: DeleteConfirmationDialogProps) {
  // If an item name is provided, include it in the description
  const finalDescription = itemName 
    ? `${description} ${itemName} יימחק לצמיתות.` 
    : description;

  // Variant specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case "sidebar":
        return {
          trigger: "w-full justify-start px-2 text-destructive hover:text-destructive hover:bg-destructive/10",
          icon: "mr-2"
        };
      case "minimal":
        return {
          trigger: "p-0 h-auto text-destructive hover:text-destructive hover:bg-transparent hover:underline",
          icon: "mr-1 h-3.5 w-3.5"
        };
      default:
        return {
          trigger: "text-destructive border-destructive hover:bg-destructive/10",
          icon: "mr-2"
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <Button
          variant="outline"
          size="sm"
          className={cn(styles.trigger)}
          onClick={() => onOpenChange(true)}
        >
          <Trash2 className={cn("h-4 w-4", styles.icon)} />
          {variant !== "minimal" && confirmText}
        </Button>
      )}
      <AlertDialogContent dir={dir} className="max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {finalDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={dir === "rtl" ? "flex-row-reverse" : "flex-row"}>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
          >
            {loading ? "מוחק..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 