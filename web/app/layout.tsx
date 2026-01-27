import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
// Analytics temporarily disabled - enable in Vercel dashboard first
// import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'FinCEN RRER Determination Tool | Pacific Coast Title Company',
  description: 'Interactive questionnaire for determining whether a FinCEN Real Estate Report (RRER) is required based on 31 CFR 1031.320',
  generator: 'v0.app',
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
