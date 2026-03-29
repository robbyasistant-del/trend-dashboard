import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Trends Dashboard — Casual Games Intelligence',
  description: 'Market intelligence dashboard for casual games trends',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Sidebar />
        <main className="ml-64 min-h-screen p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
