import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import PwaProvider from '@/components/shared/PwaProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'DriveIndia',
  description: 'Driving school management — batches, attendance, RTO tracking, student progress',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DriveIndia',
    startupImage: '/icons/icon-512x512.png',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'DriveIndia',
    description: 'Driving school management built for India',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta name="apple-mobile-web-app-title" content="DriveIndia"/>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png"/>
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png"/>
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png"/>
        <meta name="msapplication-TileColor" content="#059669"/>
        <meta name="msapplication-tap-highlight" content="no"/>
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased overscroll-none">
        <PwaProvider>
          {children}
        </PwaProvider>
        <Toaster position="top-center" richColors mobileOffset={16}/>
      </body>
    </html>
  )
}
