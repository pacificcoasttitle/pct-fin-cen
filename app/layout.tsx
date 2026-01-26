import React from "react"
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: 'PCT FinCEN Solutions | FinCEN Compliance Made Simple',
  description: 'The most comprehensive FinCEN Real Estate Reporting compliance platform for title companies. Determine requirements in 2 minutes, file in 10 minutes, store records for 5 years.',
  keywords: ['FinCEN', 'compliance', 'title company', 'real estate reporting', 'escrow', 'settlement agent', 'Bank Secrecy Act'],
  openGraph: {
    title: 'PCT FinCEN Solutions | FinCEN Compliance Made Simple',
    description: 'The most comprehensive FinCEN Real Estate Reporting compliance platform for title companies.',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
