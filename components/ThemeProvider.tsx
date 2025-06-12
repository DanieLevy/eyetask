"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Force client-only rendering to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Return children directly during SSR to avoid theme attributes
  if (!mounted) {
    return <>{children}</>;
  }
  
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme={false} // Disable color-scheme style on html element
    >
      {children}
    </NextThemesProvider>
  );
} 