"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  variant?: "default" | "compact" | "card" | "centered"
  className?: string
  iconClassName?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  variant = "default",
  className,
  iconClassName
}: EmptyStateProps) {
  // Base styles for all variants
  const baseStyles = "text-center";
  
  // Variant-specific styles
  const variantStyles = {
    default: "py-10 px-4",
    compact: "py-4 px-3",
    card: "p-6 bg-card rounded-lg border border-border shadow-sm",
    centered: "min-h-[300px] flex flex-col items-center justify-center py-10 px-4"
  };
  
  // Icon styles
  const baseIconStyles = "mx-auto mb-4 text-muted-foreground";
  const iconVariantStyles = {
    default: "h-12 w-12",
    compact: "h-8 w-8",
    card: "h-10 w-10",
    centered: "h-16 w-16"
  };

  // Renders the action button
  const renderActionButton = (actionObj: { label: string; href?: string; onClick?: () => void }, isPrimary = true) => {
    const ButtonComponent = (
      <Button
        variant={isPrimary ? "default" : "outline"}
        size={variant === "compact" ? "sm" : "default"}
        onClick={actionObj.onClick}
        className={variant === "compact" ? "h-8 text-xs" : ""}
      >
        {actionObj.label}
      </Button>
    );

    if (actionObj.href) {
      return (
        <Link href={actionObj.href}>
          {ButtonComponent}
        </Link>
      );
    }

    return ButtonComponent;
  };

  return (
    <div 
      className={cn(
        baseStyles,
        variantStyles[variant],
        variant === "centered" && "flex flex-col items-center justify-center",
        className
      )}
      dir="rtl"
    >
      {icon && (
        <div className={cn(
          baseIconStyles,
          iconVariantStyles[variant],
          iconClassName
        )}>
          {icon}
        </div>
      )}
      
      <h3 className={cn(
        "font-semibold text-foreground",
        variant === "compact" ? "text-base" : "text-lg"
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          "mt-1 text-muted-foreground",
          variant === "compact" ? "text-xs" : "text-sm"
        )}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className={cn(
          "mt-4 flex justify-center gap-3",
          variant === "compact" && "mt-3 gap-2"
        )}>
          {action && renderActionButton(action, true)}
          {secondaryAction && renderActionButton(secondaryAction, false)}
        </div>
      )}
    </div>
  )
} 