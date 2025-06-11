import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdminClientLayout from "@/components/AdminClientLayout";
import { RefreshProvider } from "@/hooks/usePageRefresh";
import GlobalPullToRefresh from "@/components/GlobalPullToRefresh";
import CSSFailsafe from "@/components/CSSFailsafe";
import OfflineBanner from "@/components/OfflineBanner";
import SmartAppBanner from "@/components/SmartAppBanner";
import DeepLinkHandler from "@/components/DeepLinkHandler";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { NavigationLoadingProvider } from "@/components/NavigationLoadingProvider";
import { GlobalLoadingIndicator, LoadingStyles } from "@/components/LoadingSystem";
import { Toaster } from "@/components/ui/sonner";


// Using system fonts to avoid network issues during build
const systemSans = {
  variable: "--font-geist-sans",
  className: "font-sans",
};

const systemMono = {
  variable: "--font-geist-mono", 
  className: "font-mono",
};

export const metadata: Metadata = {
  title: "DC Driver Tasks - Mobileye",
  description: "אפליקציית ניהול משימות בזמן אמת עבור נהגי Mobileye",
  manifest: "/manifest.json",
  icons: {
    icon: "/favico-ME-icon-black.svg",
    shortcut: "/favico-ME-icon-black.svg",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DC Drivers Hub - Mobileye",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favico-ME-icon-black.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favico-ME-icon-black.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* iOS-specific optimizations for theme switching */}
        <meta name="supported-color-schemes" content="light dark" />
        <meta name="color-scheme" content="light dark" />
        
        {/* Removed viewport meta tag to use Next.js viewport config */}
        
        {/* Theme initialization script to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // iOS-safe localStorage helpers
                  var getStoredTheme = function() {
                    try {
                      return localStorage.getItem('theme');
                    } catch (error) {
                      return null;
                    }
                  };
                  
                  var theme = getStoredTheme() || 'system';
                  var root = document.documentElement;
                  var body = document.body;
                  var resolvedTheme;
                  
                  if (theme === 'system') {
                    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  } else {
                    resolvedTheme = theme;
                  }
                  
                  // Check if iOS
                  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                  
                  // Enhanced iOS theme application with error handling
                  var applyTheme = function() {
                    try {
                      // Phase 1: Remove existing classes and force reflow
                      root.classList.remove('light', 'dark', 'theme-transition');
                      
                      // iOS-specific: Force multiple reflows with error handling
                      if (isIOS) {
                        try {
                          if (root && root.offsetHeight !== undefined) root.offsetHeight;
                          if (root) root.scrollTop = root.scrollTop; // Force style recalculation
                          if (body && body.offsetHeight !== undefined) body.offsetHeight;
                        } catch (reflowError) {
                          // iOS reflow error ignored
                        }
                      }
                      
                      // Phase 2: Apply new theme class
                      root.classList.add(resolvedTheme);
                      
                      // Phase 3: Force CSS custom properties update for iOS
                      root.style.colorScheme = resolvedTheme;
                      root.setAttribute('data-theme', resolvedTheme);
                      
                      // iOS-specific: Force CSS custom properties update
                      if (isIOS) {
                        try {
                          root.style.setProperty('--ios-theme-force', resolvedTheme);
                          root.style.removeProperty('--ios-theme-force');
                        } catch (cssError) {
                          // iOS CSS property error ignored
                        }
                      }
                      
                      // Phase 4: Enhanced iOS reflow using multiple RAF
                      if (typeof requestAnimationFrame !== 'undefined') {
                        requestAnimationFrame(function() {
                          try {
                            root.style.setProperty('color-scheme', resolvedTheme);
                            if (body) body.style.colorScheme = resolvedTheme;
                            
                            // iOS-specific: Force hardware acceleration
                            if (isIOS) {
                              try {
                                root.style.transform = 'translateZ(0)';
                                root.style.willChange = 'transform';
                                
                                requestAnimationFrame(function() {
                                  try {
                                    root.style.transform = '';
                                    root.style.willChange = 'auto';
                                    
                                    // Final iOS force reflow
                                    requestAnimationFrame(function() {
                                      try {
                                        // Force all elements to recalculate styles
                                        var allElements = document.querySelectorAll('*');
                                        for (var i = 0; i < Math.min(allElements.length, 50); i++) {
                                          try {
                                            var el = allElements[i];
                                            if (el && el.offsetHeight !== undefined) {
                                              el.offsetHeight; // Force style recalculation
                                            }
                                          } catch (elementError) {
                                            // Ignore individual element errors
                                          }
                                        }
                                      } catch (finalReflowError) {
                                        // Final reflow error ignored
                                      }
                                    });
                                  } catch (cleanupError) {
                                    // iOS cleanup error ignored
                                  }
                                });
                              } catch (accelerationError) {
                                console.warn('iOS hardware acceleration error:', accelerationError);
                              }
                            }
                          } catch (rafError) {
                            console.warn('RAF error:', rafError);
                          }
                        });
                      }
                      
                      // Phase 5: Skip meta theme-color and viewport manipulation to avoid console warnings
                      
                      // iOS-specific: Other iOS-specific optimizations
                      if (isIOS) {
                        try {
                          // Apply iOS-specific styles directly to root
                          root.style.setProperty('--ios-theme-timestamp', Date.now().toString());
                          
                          // Force iOS to recognize color scheme
                          if (resolvedTheme === 'dark') {
                            document.body.classList.add('ios-dark-mode');
                          } else {
                            document.body.classList.remove('ios-dark-mode');
                          }
                        } catch (iosError) {
                          console.warn('iOS optimization error:', iosError);
                        }
                      }
                    } catch (applyError) {
                      console.warn('Theme application error:', applyError);
                    }
                  };
                  
                  // Enhanced iOS-specific theme application with retries
                  var applyThemeWithRetry = function() {
                    applyTheme();
                    
                    // iOS-specific: Verify theme was applied and retry if needed
                    if (isIOS) {
                      setTimeout(function() {
                        try {
                          if (!root.classList.contains(resolvedTheme)) {
                            console.warn('[iOS] Theme application failed, retrying...');
                            applyTheme();
                            
                            // Second retry after longer delay
                            setTimeout(function() {
                              try {
                                if (!root.classList.contains(resolvedTheme)) {
                                  console.warn('[iOS] Second theme application attempt...');
                                  root.classList.add(resolvedTheme);
                                  root.style.colorScheme = resolvedTheme;
                                }
                              } catch (retryError) {
                                console.warn('[iOS] Retry error:', retryError);
                              }
                            }, 200);
                          }
                        } catch (verifyError) {
                          console.warn('[iOS] Theme verification error:', verifyError);
                        }
                      }, 50);
                    }
                  };
                  
                  // Apply theme with proper timing
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', applyThemeWithRetry);
                  } else {
                    if (isIOS) {
                      // iOS needs multiple attempts with different timings
                      setTimeout(applyThemeWithRetry, 0);
                      setTimeout(applyTheme, 10);
                      setTimeout(applyTheme, 50);
                    } else {
                      applyThemeWithRetry();
                    }
                  }
                  
                  // iOS-specific: Listen for orientation changes and reapply theme
                  if (isIOS && typeof window !== 'undefined') {
                    window.addEventListener('orientationchange', function() {
                      setTimeout(applyTheme, 100);
                    });
                    
                    // Listen for visibility changes (iOS Safari tab switching)
                    document.addEventListener('visibilitychange', function() {
                      if (!document.hidden && isIOS) {
                        setTimeout(applyTheme, 50);
                      }
                    });
                  }
                  
                } catch (e) {
                  console.warn('Theme initialization error:', e);
                  // Enhanced fallback for iOS
                  try {
                    var systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    var fallbackTheme = systemIsDark ? 'dark' : 'light';
                    document.documentElement.classList.add(fallbackTheme);
                    document.documentElement.style.colorScheme = fallbackTheme;
                    document.documentElement.style.setProperty('color-scheme', fallbackTheme);
                    document.documentElement.setAttribute('data-theme', fallbackTheme);
                  } catch (fallbackError) {
                    console.warn('Fallback theme error:', fallbackError);
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${systemSans.variable} ${systemMono.variable} antialiased font-sans`}
      >
        <CSSFailsafe />
        <LoadingStyles />
        <LoadingProvider>
          <NavigationLoadingProvider>
            <DeepLinkHandler>
              <SmartAppBanner />
              <OfflineBanner />
              <GlobalLoadingIndicator position="top" showProgress={true} />
              <AdminClientLayout>
                <RefreshProvider>
                  <GlobalPullToRefresh>
                    <div className="flex flex-col min-h-[100dvh] bg-background">
                      <Header />
                      <main className="flex-1 overflow-auto bg-background">
                        {children}
                      </main>
                      <Footer />
                    </div>
                  </GlobalPullToRefresh>
                </RefreshProvider>
              </AdminClientLayout>
            </DeepLinkHandler>
          </NavigationLoadingProvider>
        </LoadingProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}