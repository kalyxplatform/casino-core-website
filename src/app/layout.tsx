import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Casino Core — Player Area',
  description: 'Test harness for casino-core-backend: registration, sign in, profile and balance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
