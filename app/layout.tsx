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
  metadataBase: new URL('http://localhost:3000'),
  title: 'Faraday — Same Agent. Different Blast Radius.',
  description:
    'A local-first demonstrator for OpenAI Sandbox Agent containment, least privilege, and zero-egress execution.',
  openGraph: {
    title: 'Faraday — Agent Containment Demonstrator',
    description: 'Run the same fixed agent across unsafe and protected workspace boundaries.',
    type: 'website',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Faraday — Same agent. Different blast radius.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Faraday — Agent Containment Demonstrator',
    description: 'Same fixed agent. Different workspace boundary. Machine-verifiable outcome.',
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
