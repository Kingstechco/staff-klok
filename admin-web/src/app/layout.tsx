import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import { ScheduleProvider } from "@/contexts/ScheduleContext";
import { ToastProvider } from "@/contexts/ToastContext";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oklok - Employee Time Management",
  description: "Professional staff time tracking and management system",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-gray-50 via-gray-50 to-indigo-50/30`}>
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              <TimeTrackingProvider>
                <ScheduleProvider>
                  <Navigation />
                  <main className="lg:pl-72 relative">
                    {/* Subtle background pattern to enhance the layered effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 via-transparent to-purple-50/10 opacity-30 pointer-events-none" />
                    <div className="relative min-h-screen">
                      {children}
                    </div>
                  </main>
                </ScheduleProvider>
              </TimeTrackingProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
