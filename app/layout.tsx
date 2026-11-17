import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MasterCue Studio | Custom Pool & Snooker Cue Builder',
  description: 'Design and customize your bespoke MasterCue snooker and pool cue with real-time visual layer preview.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-amber-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
