import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SmartAppBanner from "@/components/SmartAppBanner";
import OfflineBanner from "@/components/OfflineBanner";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { NavigationLoadingProvider } from "@/components/NavigationLoadingProvider";
import DeepLinkHandler from "@/components/DeepLinkHandler";
import AdminClientLayout from "@/components/AdminClientLayout";
import GlobalPullToRefresh from "@/components/GlobalPullToRefresh";
import CSSFailsafe from "@/components/CSSFailsafe";
import { RefreshProvider } from "@/hooks/usePageRefresh";
import Script from "next/script";
import IOSThemeHandler from "@/components/IOSThemeHandler";
import { GlobalLoadingIndicator } from "@/components/LoadingSystem";

export const metadata: Metadata = {
  title: "Driver Tasks",
  description: "Driver Tasks Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Driver Tasks",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Fix iOS device detection script to avoid hydration mismatch
const iosDetectionScript = `
(function() {
  try {
    var userAgent = window.navigator.userAgent;
    var isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Store the iOS detection result in localStorage for use after hydration
    if (isIOS) {
      localStorage.setItem('isIOSDevice', 'true');
    } else {
      localStorage.removeItem('isIOSDevice');
    }
    
    // Don't modify body classes here to avoid hydration mismatch
    // The body class will be added via useEffect after hydration
    
  } catch (e) {
    console.warn('iOS detection error:', e);
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Driver Tasks" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* iOS detection script */}
        <Script id="ios-detection" strategy="beforeInteractive">
          {iosDetectionScript}
        </Script>
        
        {/* Legacy theme script - modified to avoid hydration mismatch */}
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  var body = document.body;
                  var localStorage = window.localStorage;
                  var userAgent = window.navigator.userAgent;
                  
                  // Detect iOS for special handling - but don't add body classes here
                  var isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                  
                  // Get theme from localStorage
                  var storedTheme = localStorage.getItem('theme');
                  var resolvedTheme;
                  
                  // Determine theme with fallback to system preference
                  if (storedTheme === 'light' || storedTheme === 'dark') {
                    resolvedTheme = storedTheme;
                  } else {
                    // System preference detection
                    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  
                  // Apply theme class and color scheme to root
                  root.classList.remove('light', 'dark');
                  root.classList.add(resolvedTheme);
                  root.style.colorScheme = resolvedTheme;
                  root.setAttribute('data-theme', resolvedTheme);
                  
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
                      
                      // DON'T add iOS dark mode class here to avoid hydration mismatch
                      // This will be handled by React useEffect after hydration
                    } catch (iosError) {
                      console.warn('iOS optimization error:', iosError);
                    }
                  }
                } catch (applyError) {
                  console.warn('Theme application error:', applyError);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased font-sans">
        <IOSThemeHandler />
        <CSSFailsafe />
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