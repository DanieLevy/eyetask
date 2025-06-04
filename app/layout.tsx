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
        
        {/* Theme initialization script to prevent FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'system';
                  var root = document.documentElement;
                  var resolvedTheme;
                  
                  if (theme === 'system') {
                    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  } else {
                    resolvedTheme = theme;
                  }
                  
                  root.classList.remove('light', 'dark');
                  root.classList.add(resolvedTheme);
                  root.style.colorScheme = resolvedTheme;
                } catch (e) {
                  // Fallback to light theme if any error
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
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