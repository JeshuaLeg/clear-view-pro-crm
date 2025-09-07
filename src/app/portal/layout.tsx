import { CustomerPortalLayout } from '@/components/layout/customer-portal-layout'

export default function PortalRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CustomerPortalLayout>{children}</CustomerPortalLayout>
}
