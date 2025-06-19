'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { HeaderLogoProps } from './types';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export const HeaderLogo = ({ condensed = false, className }: HeaderLogoProps) => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if page is in RTL mode
    const dir = document.documentElement.dir || 
                document.documentElement.getAttribute('dir') || 
                'ltr';
    setIsRtl(dir === 'rtl');
  }, []);
  
  // Set appropriate width based on condensed prop
  const logoWidth = condensed ? 120 : 140;
  const logoHeight = condensed ? 32 : 40;
  
  // Use SVG with appropriate styles for dark/light themes
  return (
    <Link 
      href="/" 
      className={cn(
        "flex items-center gap-1 sm:gap-1.5 hover:opacity-80 transition-opacity",
        className
      )}
    >
      <div 
        className={cn(
          "relative flex-shrink-0", 
          condensed ? "w-[120px] h-[32px]" : "w-[140px] h-[40px]",
          isRtl && "transform -scale-x-100" // Flip horizontally in RTL mode
        )}
      >
        {mounted && (
          <div 
            className={cn(
              "w-full h-full relative", 
              isRtl && "transform -scale-x-100" // Counter-flip the content in RTL mode
            )}
            style={{ filter: resolvedTheme === 'dark' ? 'invert(1)' : 'none' }}
          >
            <img
              src="/icons/header-icon-blacktext.svg"
              alt="Driver Tasks Logo"
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'contain', 
                objectPosition: isRtl ? 'right center' : 'left center',
                color: 'initial',
                background: 'none'
              }}
              className="transition-all duration-300"
            />
          </div>
        )}
        {!mounted && (
          <div className="w-full h-full bg-muted/20 animate-pulse rounded-sm"></div>
        )}
      </div>
      {!condensed && (
        <span className="font-semibold text-sm sm:text-base whitespace-nowrap hidden md:inline-block">
          Driver Tasks
        </span>
      )}
    </Link>
  );
};

export default HeaderLogo; 