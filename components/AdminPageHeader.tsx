"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  ArrowRight, 
  MoreVertical,
  RefreshCw 
} from "lucide-react"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import ThemeToggle from "./ThemeToggle"

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  isLoading?: boolean
  onRefresh?: () => void
  actions?: React.ReactNode
  headerActions?: Array<{
    label: string
    icon?: React.ReactNode
    onClick?: () => void
    href?: string
    variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link"
  }>
  mobileActions?: boolean
  className?: string
}

export function AdminPageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  isLoading = false,
  onRefresh,
  actions,
  headerActions = [],
  mobileActions = true,
  className
}: AdminPageHeaderProps) {
  const router = useRouter()

  // Display regular buttons on desktop, dropdown on mobile if mobileActions is true
  const shouldUseDropdown = mobileActions && headerActions.length > 1

  return (
    <header className={cn(
      "sticky top-0 z-30 w-full bg-background/80 backdrop-blur-sm border-b",
      className
    )} dir="rtl">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex items-center justify-between gap-4 h-16">
          <div className="flex items-center gap-3">
            {backHref && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => backHref ? router.push(backHref) : router.back()}
                    className="md:hidden"
                    aria-label={backLabel || "חזור"}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{backLabel || "חזור"}</TooltipContent>
              </Tooltip>
            )}
            
            {backHref && (
              <Button
                variant="outline"
                onClick={() => backHref ? router.push(backHref) : router.back()}
                className="hidden md:flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                {backLabel || "חזור"}
              </Button>
            )}
            
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px] md:max-w-[500px]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <div className="mr-1">
              <ThemeToggle />
            </div>

            {onRefresh && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="h-9 w-9"
                    aria-label="רענן נתונים"
                  >
                    <RefreshCw className={cn(
                      "h-4 w-4",
                      isLoading && "animate-spin"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">רענן נתונים</TooltipContent>
              </Tooltip>
            )}

            {!shouldUseDropdown && headerActions.map((action, index) => {
              const ActionButton = () => (
                <Button
                  key={action.label}
                  variant={action.variant || "default"}
                  size="sm"
                  onClick={action.onClick}
                  className="hidden sm:flex items-center gap-2"
                >
                  {action.icon && <span className="text-inherit">{action.icon}</span>}
                  {action.label}
                </Button>
              );

              return action.href ? (
                <Link key={action.label} href={action.href}>
                  <ActionButton />
                </Link>
              ) : (
                <ActionButton key={action.label} />
              );
            })}

            {shouldUseDropdown && headerActions.length > 0 && (
              <>
                {/* Desktop view: Show buttons */}
                <div className="hidden sm:flex items-center gap-2">
                  {headerActions.map((action, index) => {
                    const ActionButton = () => (
                      <Button
                        key={`desktop-${action.label}`}
                        variant={action.variant || "default"}
                        size="sm"
                        onClick={action.onClick}
                        className="items-center gap-2"
                      >
                        {action.icon && <span className="text-inherit">{action.icon}</span>}
                        {action.label}
                      </Button>
                    );

                    return action.href ? (
                      <Link key={`desktop-link-${action.label}`} href={action.href}>
                        <ActionButton />
                      </Link>
                    ) : (
                      <ActionButton key={`desktop-btn-${action.label}`} />
                    );
                  })}
                </div>

                {/* Mobile view: Show dropdown */}
                <div className="sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">תפריט פעולות</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>פעולות</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {headerActions.map((action) => {
                        if (action.href) {
                          return (
                            <Link key={`mobile-${action.label}`} href={action.href}>
                              <DropdownMenuItem className="cursor-pointer">
                                {action.icon && <span className="mr-2">{action.icon}</span>}
                                {action.label}
                              </DropdownMenuItem>
                            </Link>
                          );
                        }
                        
                        return (
                          <DropdownMenuItem 
                            key={`mobile-${action.label}`}
                            onClick={action.onClick}
                          >
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}

            {actions}
          </div>
        </div>
      </div>
    </header>
  )
} 