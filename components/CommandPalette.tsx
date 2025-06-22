"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
  CommandSeparator 
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  SearchIcon, 
  HomeIcon, 
  UsersIcon, 
  BoxIcon, 
  Settings2Icon, 
  BarChart3Icon, 
  InfoIcon,
  LogOutIcon
} from "lucide-react"

interface CommandPaletteProps {
  children?: React.ReactNode
  className?: string
}

// Command palette items grouped by category
const commandGroups = [
  {
    heading: "כללי",
    items: [
      {
        name: "עמוד הבית",
        icon: <HomeIcon className="mr-2 h-4 w-4" />,
        shortcut: "G H",
        href: "/"
      },
      {
        name: "חיפוש מתקדם",
        icon: <SearchIcon className="mr-2 h-4 w-4" />,
        shortcut: "G S",
        href: "/search"
      }
    ]
  },
  {
    heading: "ניהול",
    items: [
      {
        name: "לוח בקרה",
        icon: <BarChart3Icon className="mr-2 h-4 w-4" />,
        shortcut: "G D",
        href: "/admin/dashboard"
      },
      {
        name: "פרויקטים",
        icon: <BoxIcon className="mr-2 h-4 w-4" />,
        shortcut: "G P",
        href: "/admin/projects"
      },
      {
        name: "משימות",
        icon: <UsersIcon className="mr-2 h-4 w-4" />,
        shortcut: "G T",
        href: "/admin/tasks"
      }
    ]
  },
  {
    heading: "מערכת",
    items: [
      {
        name: "הגדרות",
        icon: <Settings2Icon className="mr-2 h-4 w-4" />,
        shortcut: "G I",
        href: "/admin/settings"
      },
      {
        name: "עזרה ותמיכה",
        icon: <InfoIcon className="mr-2 h-4 w-4" />,
        shortcut: "G U",
        href: "/help"
      },
      {
        name: "התנתקות",
        icon: <LogOutIcon className="mr-2 h-4 w-4" />,
        shortcut: "G L",
        action: "logout"
      }
    ]
  }
]

export function CommandPalette({ children, className }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // CTRL+K or Command+K
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])
  
  const handleSelect = React.useCallback(
    (callback: () => unknown) => {
      setOpen(false)
      callback()
    },
    []
  )
  
  const navigateTo = React.useCallback(
    (href: string) => {
      router.push(href)
    },
    [router]
  )
  
  const handleLogout = React.useCallback(() => {
    // Clear any stored tokens
    if (typeof window !== "undefined") {
              window.__drivertasks_user = null
        window.__drivertasks_isAdmin = false
      localStorage.removeItem("adminToken")
      router.push("/")
    }
  }, [router])

  return (
    <>
      {children ? (
        <div 
          onClick={() => setOpen(true)}
          className={cn("cursor-pointer", className)}
        >
          {children}
        </div>
      ) : (
        <Button
          variant="outline"
          className={cn(
            "relative h-9 w-full justify-start text-muted-foreground sm:pr-12 md:w-40 lg:w-64",
            className
          )}
          onClick={() => setOpen(true)}
        >
          <span className="hidden lg:inline-flex">חיפוש בכל המערכת...</span>
          <span className="inline-flex lg:hidden">חיפוש...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="הקלד פקודה או חפש..." />
        <CommandList>
          <CommandEmpty>לא נמצאו תוצאות.</CommandEmpty>
          
          {commandGroups.map((group) => (
            <React.Fragment key={group.heading}>
              <CommandGroup heading={group.heading}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.name}
                    onSelect={() =>
                      handleSelect(() => {
                        if (item.href) {
                          navigateTo(item.href)
                        } else if (item.action === "logout") {
                          handleLogout()
                        }
                      })
                    }
                    className="cursor-pointer"
                  >
                    {item.icon}
                    <span>{item.name}</span>
                    {item.shortcut && (
                      <kbd className="mr-auto pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                        {item.shortcut}
                      </kbd>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
} 