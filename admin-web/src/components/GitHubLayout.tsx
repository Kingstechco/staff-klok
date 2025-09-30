'use client';

import { useSidebar } from '@/contexts/SidebarContext';

interface GitHubLayoutProps {
  children: React.ReactNode;
}

export default function GitHubLayout({ children }: GitHubLayoutProps) {
  const { sidebarCollapsed } = useSidebar();

  return (
    <main className={`pt-16 transition-all duration-300 ease-in-out ${
      sidebarCollapsed ? 'pl-16' : 'pl-64'
    }`}>
      <div className="p-6 min-h-screen bg-gray-50">
        {children}
      </div>
    </main>
  );
}