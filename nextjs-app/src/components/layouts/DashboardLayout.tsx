'use client';

import { type FC, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface Props {
  children: ReactNode;
}

export const DashboardLayout: FC<Props> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
