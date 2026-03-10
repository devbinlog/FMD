import React from 'react';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata = {
  title: 'FMD Enterprise Console',
  description: 'Operations & analytics console for FMD',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <AdminNav />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
