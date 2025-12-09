'use client';

import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { HeaderLogoProps } from './types';

/**
 * Header Logo Component
 * Uses Next.js Image for SVG logo with theme-based filter
 */
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
  
  return (
    <a 
      href="/" 
      onClick={(e) => {
        e.preventDefault();
        window.location.href = '/';
      }}
      className={cn(
        "flex items-center gap-1 sm:gap-1.5 hover:opacity-80 transition-opacity cursor-pointer",
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
            <Image
              src="/icons/header-icon-blacktext.svg"
              alt="Driver Tasks Logo"
              fill
              className="transition-all duration-300"
              style={{
                objectFit: 'contain',
                objectPosition: isRtl ? 'right center' : 'left center',
              }}
              priority
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
    </a>
  );
};

export default HeaderLogo; 