import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
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
import { ThemeProvider } from "@/components/ThemeProvider";
import ConditionalHeader from "@/components/ConditionalHeader";

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
    <html lang="he" dir="rtl" suppressHydrationWarning>
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
                <AdminClientLayout>
                  <RefreshProvider>
                    <GlobalPullToRefresh>
                      <div className="flex flex-col min-h-[100dvh] bg-background">
                        <ConditionalHeader />
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
        </ThemeProvider>
      </body>
    </html>
  );
}