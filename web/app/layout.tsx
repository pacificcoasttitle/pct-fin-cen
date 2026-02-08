import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
// Analytics temporarily disabled - enable in Vercel dashboard first
// import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fincenclear.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FinCEN Clear - FinCEN Compliance Made Simple',
    template: '%s | FinCEN Clear',
  },
  description: 'Complete FinCEN Real Estate Reporting for title companies — from determination through filing. Determine requirements in 2 minutes. File in 10 minutes.',
  keywords: [
    'FinCEN',
    'Real Estate Reporting',
    'RRER',
    'Compliance',
    'Title Company',
    'BOI',
    'Beneficial Ownership',
    '31 CFR 1031.320',
  ],
  authors: [{ name: 'FinClear Solutions' }],
  creator: 'FinClear Solutions',
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'FinCEN Clear',
    title: 'FinCEN Clear - FinCEN Compliance Made Simple',
    description: 'Complete FinCEN Real Estate Reporting for title companies — from determination through filing.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FinCEN Clear - Compliance Made Simple',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinCEN Clear - FinCEN Compliance Made Simple',
    description: 'Complete FinCEN Real Estate Reporting for title companies — from determination through filing.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

function StagingBanner() {
  const envLabel = process.env.NEXT_PUBLIC_ENV_LABEL
  if (envLabel !== "STAGING") return null
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 text-center text-xs font-semibold py-1">
      ⚠️ STAGING ENVIRONMENT — Not for production use
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isStaging = process.env.NEXT_PUBLIC_ENV_LABEL === "STAGING"
  
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <StagingBanner />
        <div className={isStaging ? "pt-6" : ""}>
          {children}
        </div>
        {/* <Analytics /> - Enable after setting up Vercel Analytics in dashboard */}
      </body>
    </html>
  )
}
