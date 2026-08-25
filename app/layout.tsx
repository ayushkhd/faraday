import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Toxic Flow Lab — GitHub MCP Incident',
  description:
    'Replay the real GitHub MCP attack from a malicious public issue to private-repository access and a public data leak.',
  openGraph: {
    title: 'Toxic Flow Lab',
    description: 'Replay the real GitHub MCP attack from Issue #1 to the public exfiltration PR.',
    type: 'website',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Toxic Flow Lab — A public issue. A private leak.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Toxic Flow Lab',
    description: 'Replay the real GitHub MCP attack from Issue #1 to the public exfiltration PR.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
