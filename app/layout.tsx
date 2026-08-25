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
    'An interactive explainer about indirect prompt injection and the GitHub MCP private repository leak.',
  openGraph: {
    title: 'Toxic Flow Lab',
    description: 'A public issue. A private leak. Step through the GitHub MCP toxic agent flow.',
    type: 'website',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Toxic Flow Lab — A public issue. A private leak.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Toxic Flow Lab',
    description: 'A public issue. A private leak. Step through the GitHub MCP toxic agent flow.',
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
