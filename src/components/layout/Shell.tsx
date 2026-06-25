'use client';

import Sidebar from './Sidebar';
import TopNav from './TopNav';
import { useAuth } from '@/context/AuthContext';

export default function Shell({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center animate-pulse text-outline">Loading application...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar />
      <main className="ml-[260px] min-h-screen flex flex-col">
        <TopNav />
        <div className="flex-1 bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}
