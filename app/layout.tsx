import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from "next/script";
import { Toaster } from "sonner";
import ConditionalHeader from "@/components/ConditionalHeader";
import CSSFailsafe from "@/components/CSSFailsafe";
import DeepLinkHandler from "@/components/DeepLinkHandler";
import Footer from "@/components/Footer";
import GlobalPullToRefresh from "@/components/GlobalPullToRefresh";
import IOSThemeHandler from "@/components/IOSThemeHandler";
import { GlobalLoadingIndicator } from "@/components/LoadingSystem";
import { NavigationLoadingProvider } from "@/components/NavigationLoadingProvider";
import OfflineBanner from "@/components/OfflineBanner";
import SmartAppBanner from "@/components/SmartAppBanner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/unified-header/AuthContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { VisitorProvider } from "@/contexts/VisitorContext";
import { RefreshProvider } from "@/hooks/usePageRefresh";

export const metadata: Metadata = {
  title: "Driver Tasks",
  description: "Driver Tasks Management System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Driver Tasks",
    startupImage: [
      "/icons/splash-640x1136.png",
      "/icons/splash-750x1334.png",
      "/icons/splash-1242x2208.png",
      "/icons/splash-1125x2436.png",
      "/icons/splash-828x1792.png",
      "/icons/splash-1242x2688.png"
    ]
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

// Additional meta script for iOS PWA detection
const iosDetectionScript = `
(function() {
  try {
    var userAgent = window.navigator.userAgent;
    var isIOS = /iPad|iPhone|iPod/.test(userAgent) || 
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    // Store the iOS detection result in localStorage for use after hydration
    if (isIOS) {
      localStorage.setItem('isIOSDevice', 'true');
      // Check if running as PWA
      if (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches) {
        localStorage.setItem('isPWA', 'true');
        // Apply body classes after hydration to avoid mismatch
        document.documentElement.classList.add('ios-pwa');
        
        // Fix for double spacing in PWA mode
        document.documentElement.style.padding = '0';
        document.documentElement.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.margin = '0';
        
        // Only apply safe area insets to the header
        var header = document.querySelector('header.unified-header');
        if (header) {
          header.style.paddingTop = 'env(safe-area-inset-top)';
          header.style.marginTop = '0';
        }
        
        // Fix dropdown top spacing
        var style = document.createElement('style');
        style.innerHTML = '.notch-aware-dropdown { padding-top: 0 !important; }';
        document.head.appendChild(style);
      }
    } else {
      localStorage.removeItem('isIOSDevice');
    }
  } catch (e) {
    console.warn('iOS detection error:', e);
  }
})();
`;

// Service worker registration script
const serviceWorkerScript = `
(function() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js')
        .then(function(registration) {
          // Service worker registered successfully
          return navigator.serviceWorker.ready;
        })
        .then(function(registration) {
          // Service worker is active and ready
        })
        .catch(function(error) {
          // Service worker registration failed silently
        });
    });
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Driver Tasks" />
        <link rel="apple-touch-icon" href="/icons/icon-512x512.png" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        
        {/* iOS detection script */}
        <Script id="ios-detection" strategy="beforeInteractive">
          {iosDetectionScript}
        </Script>
        
        {/* Service worker registration */}
        <Script id="service-worker" strategy="afterInteractive">
          {serviceWorkerScript}
        </Script>
      </head>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <IOSThemeHandler />
          <CSSFailsafe />
          <LoadingProvider>
            <NavigationLoadingProvider>
              <DeepLinkHandler>
                <SmartAppBanner />
                <OfflineBanner />
                <GlobalLoadingIndicator position="top" showProgress={true} />
                <RefreshProvider>
                  <AuthProvider>
                    <VisitorProvider>
                      <GlobalPullToRefresh>
                        <div className="flex flex-col min-h-[100dvh] bg-background">
                          <ConditionalHeader />
                          <main className="flex-1 overflow-auto bg-background">
                            {children}
                          </main>
                          <Footer />
                        </div>
                      </GlobalPullToRefresh>
                    </VisitorProvider>
                  </AuthProvider>
                </RefreshProvider>
              </DeepLinkHandler>
            </NavigationLoadingProvider>
          </LoadingProvider>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}