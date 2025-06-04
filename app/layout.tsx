import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EyeTask - מערכת ניהול משימות נהגים",
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
    title: "EyeTask",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
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
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        
        {/* Prevent iOS zoom on input focus */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
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
                      console.warn('localStorage not available:', error);
                      return null;
                    }
                  };
                  
                  var theme = getStoredTheme() || 'system';
                  var root = document.documentElement;
                  var resolvedTheme;
                  
                  if (theme === 'system') {
                    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  } else {
                    resolvedTheme = theme;
                  }
                  
                  // Function to apply theme
                  var applyTheme = function() {
                    // iOS-specific: Remove classes first, then force reflow
                    root.classList.remove('light', 'dark');
                    root.offsetHeight; // Force reflow for iOS
                    
                    // Apply new theme
                    root.classList.add(resolvedTheme);
                    root.style.colorScheme = resolvedTheme;
                    
                    // iOS-specific: Force additional reflow with RAF
                    if (typeof requestAnimationFrame !== 'undefined') {
                      requestAnimationFrame(function() {
                        root.style.setProperty('color-scheme', resolvedTheme);
                        // Toggle a dummy class to ensure iOS recognizes the change
                        root.classList.add('theme-init');
                        requestAnimationFrame(function() {
                          root.classList.remove('theme-init');
                        });
                      });
                    }
                    
                    // iOS Safari specific: Set meta theme-color dynamically
                    var metaThemeColor = document.querySelector('meta[name="theme-color"]');
                    if (metaThemeColor) {
                      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff');
                    }
                  };
                  
                  // Apply theme with proper timing for iOS
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', applyTheme);
                  } else {
                    // Check if iOS
                    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
                    
                    if (isIOS) {
                      // iOS needs a small delay
                      setTimeout(applyTheme, 10);
                    } else {
                      applyTheme();
                    }
                  }
                  
                } catch (e) {
                  console.warn('Theme initialization error:', e);
                  // Fallback to system theme if any error
                  var systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var fallbackTheme = systemIsDark ? 'dark' : 'light';
                  document.documentElement.classList.add(fallbackTheme);
                  document.documentElement.style.colorScheme = fallbackTheme;
                  document.documentElement.style.setProperty('color-scheme', fallbackTheme);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CSSFailsafe />
        <DeepLinkHandler>
          <SmartAppBanner />
          <OfflineBanner />
          <AdminClientLayout>
            <RefreshProvider>
              <GlobalPullToRefresh>
                <div className="flex flex-col min-h-screen min-h-[100dvh] bg-background">
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
      </body>
    </html>
  );
}