import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopNavigation from "@/components/TopNavigation";
import Sidebar from "@/components/Sidebar";
import GitHubLayout from "@/components/GitHubLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import { ScheduleProvider } from "@/contexts/ScheduleContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { TimeDisplayProvider } from "@/contexts/TimeDisplayContext";
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
                  <SidebarProvider>
                    <TimeDisplayProvider>
                      <TopNavigation />
                      <Sidebar />
                      <GitHubLayout>
                        {children}
                      </GitHubLayout>
                    </TimeDisplayProvider>
                  </SidebarProvider>
                </ScheduleProvider>
              </TimeTrackingProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
