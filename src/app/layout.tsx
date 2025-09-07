import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'ClearView Pro CRM',
    template: '%s | ClearView Pro CRM',
  },
  description: 'Professional headlight restoration CRM system',
  keywords: ['headlight restoration', 'CRM', 'automotive', 'service management'],
  authors: [{ name: 'ClearView Pro' }],
  creator: 'ClearView Pro',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'ClearView Pro CRM',
    description: 'Professional headlight restoration CRM system',
    siteName: 'ClearView Pro CRM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClearView Pro CRM',
    description: 'Professional headlight restoration CRM system',
  },
  robots: {
    index: false, // Don't index admin/internal tools
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
