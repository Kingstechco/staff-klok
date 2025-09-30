'use client';

import { useSidebar } from '@/contexts/SidebarContext';

interface DynamicLayoutProps {
  children: React.ReactNode;
}

export default function DynamicLayout({ children }: DynamicLayoutProps) {
  const { sidebarCollapsed } = useSidebar();

  return (
    <main className={`relative transition-all duration-300 ease-in-out ${
      sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
    }`}>
      {/* Subtle background pattern to enhance the layered effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 via-transparent to-purple-50/10 opacity-30 pointer-events-none" />
      <div className="relative min-h-screen">
        {children}
      </div>
    </main>
  );
}