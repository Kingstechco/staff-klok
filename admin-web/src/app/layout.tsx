import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import { TimeTrackingProvider } from "@/contexts/TimeTrackingContext";
import { ScheduleProvider } from "@/contexts/ScheduleContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StaffClock Pro - Employee Time Management",
  description: "Professional staff time tracking and management system for Tammy's Store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <AuthProvider>
          <TimeTrackingProvider>
            <ScheduleProvider>
              <Navigation />
              <main className="min-h-screen">
                {children}
              </main>
            </ScheduleProvider>
          </TimeTrackingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
