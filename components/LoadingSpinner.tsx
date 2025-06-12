"use client"

import React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  text?: string
  fullScreen?: boolean
  className?: string
  centered?: boolean
  textClassName?: string
  iconClassName?: string
}

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12"
}

const textSizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl"
}

export function LoadingSpinner({
  size = "md",
  text,
  fullScreen = false,
  className,
  centered = false,
  textClassName,
  iconClassName
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn(
      "flex flex-col items-center justify-center gap-2",
      centered && "text-center",
      fullScreen && "fixed inset-0 bg-background/80 backdrop-blur-sm z-50",
      !fullScreen && centered && "h-full w-full",
      className
    )}>
      <Loader2 
        className={cn(
          "animate-spin text-primary",
          sizeClasses[size],
          iconClassName
        )}
      />
      {text && (
        <p 
          className={cn(
            "text-muted-foreground",
            textSizeClasses[size],
            textClassName
          )}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
} 