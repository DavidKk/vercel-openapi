import './globals.css'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { NotificationProvider, NotificationStack } from '@/components/Notification'

import { Nav } from './Nav'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Unbnd',
  description:
    'This service collects and caches commonly used public OPENAPIs to facilitate developer access. It provides caching and forwarding services for commonly used public APIs, making it easier for developers to quickly access them.',
  icons: {
    icon: [
      { url: '/logo-32.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/logo-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/logo-180.png', sizes: '180x180', type: 'image/png' }],
  },
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout(props: Readonly<RootLayoutProps>) {
  const { children } = props

  return (
    <html lang="en">
      <Analytics />
      <SpeedInsights />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col overflow-hidden`}>
        <NotificationProvider>
          <Nav />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <NotificationStack />
        </NotificationProvider>
      </body>
    </html>
  )
}
