import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { 
  Car, 
  FileText, 
  Shield, 
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Customer Portal',
  description: 'Your ClearView Pro customer dashboard',
}

async function getCustomerData(userEmail: string) {
  // Find customer by email
  const customer = await prisma.customer.findFirst({
    where: { email: userEmail },
    include: {
      vehicles: {
        include: {
          jobs: {
            include: {
              warranties: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      },
      invoices: {
        include: {
          payments: {
            where: { status: 'SUCCEEDED' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!customer) {
    return null
  }

  // Get warranty stats
  const warranties = await prisma.warranty.findMany({
    where: {
      job: {
        customerId: customer.id,
      },
    },
    include: {
      job: {
        include: {
          vehicle: true,
        },
      },
    },
  })

  const activeWarranties = warranties.filter(w => w.status === 'ACTIVE')
  const expiringWarranties = activeWarranties.filter(w => {
    const daysUntilExpiry = Math.ceil(
      (w.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiry <= 30
  })

  return {
    customer,
    warranties: {
      total: warranties.length,
      active: activeWarranties.length,
      expiring: expiringWarranties.length,
    },
  }
}

export default async function CustomerPortalDashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return <div>Access denied</div>
  }

  const data = await getCustomerData(session.user.email)
  
  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Welcome to ClearView Pro</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't find your customer account. Please contact us to set up your portal access.
          </p>
          <Button asChild>
            <a href="tel:+15551234567">Contact Support</a>
          </Button>
        </div>
      </div>
    )
  }

  const { customer, warranties } = data

  const totalPaid = customer.invoices.reduce((sum, invoice) => {
    const invoicePaid = invoice.payments.reduce((pSum, payment) => 
      pSum + Number(payment.amount), 0
    )
    return sum + invoicePaid
  }, 0)

  const pendingInvoices = customer.invoices.filter(i => 
    ['SENT', 'PARTIAL'].includes(i.status)
  )

  const pendingAmount = pendingInvoices.reduce((sum, invoice) => {
    const invoicePaid = invoice.payments.reduce((pSum, payment) => 
      pSum + Number(payment.amount), 0
    )
    return sum + (Number(invoice.total) - invoicePaid)
  }, 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="secondary">Scheduled</Badge>
      case 'IN_PROGRESS':
        return <Badge variant="default">In Progress</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'INVOICED':
        return <Badge className="bg-blue-500">Invoiced</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getInvoiceStatusBadge = (status: string, dueDate?: Date | null) => {
    if (status === 'OVERDUE' || (dueDate && dueDate < new Date() && status !== 'PAID')) {
      return <Badge variant="destructive">Overdue</Badge>
    }
    
    switch (status) {
      case 'SENT':
        return <Badge variant="secondary">Pending</Badge>
      case 'PAID':
        return <Badge className="bg-green-500">Paid</Badge>
      case 'PARTIAL':
        return <Badge className="bg-yellow-500">Partial</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {customer.firstName}!</h1>
        <p className="text-muted-foreground">
          Here's an overview of your vehicles, services, and warranties.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.vehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered vehicles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warranties</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warranties.active}</div>
            <p className="text-xs text-muted-foreground">
              {warranties.expiring > 0 && (
                <span className="text-orange-500">{warranties.expiring} expiring soon</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime payments
            </p>
          </CardContent>
        </Card>

        <Card className={pendingAmount > 0 ? "border-orange-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pendingAmount > 0 ? 'text-orange-600' : ''}`}>
              {formatCurrency(pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingInvoices.length} pending invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(pendingAmount > 0 || warranties.expiring > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingAmount > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                  Outstanding Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(pendingAmount)}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  You have {pendingInvoices.length} unpaid invoice{pendingInvoices.length !== 1 ? 's' : ''}
                </p>
                <Button size="sm" asChild>
                  <Link href="/portal/invoices">View Invoices</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {warranties.expiring > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Calendar className="h-4 w-4 text-yellow-500 mr-2" />
                  Warranties Expiring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{warranties.expiring}</div>
                <p className="text-xs text-muted-foreground mb-3">
                  Expire within 30 days
                </p>
                <Button size="sm" asChild>
                  <Link href="/portal/warranties">View Warranties</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Services</CardTitle>
            <CardDescription>Your latest headlight restoration services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customer.vehicles.flatMap(vehicle => 
                vehicle.jobs.map(job => ({
                  ...job,
                  vehicle,
                }))
              ).slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Job #{job.jobNumber}
                      {job.completedAt && ` • ${formatDate(job.completedAt)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(job.status)}
                    {job.warranties.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        <CheckCircle className="inline h-3 w-3 mr-1" />
                        Warranty Active
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {customer.vehicles.every(v => v.jobs.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No services yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Your payment history and pending invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customer.invoices.map((invoice) => {
                const totalPaid = invoice.payments.reduce((sum, payment) => 
                  sum + Number(payment.amount), 0
                )
                const remainingBalance = Number(invoice.total) - totalPaid

                return (
                  <div key={invoice.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {invoice.number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(invoice.createdAt)}
                        {invoice.dueAt && ` • Due ${formatDate(invoice.dueAt)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {remainingBalance > 0 
                          ? formatCurrency(remainingBalance)
                          : formatCurrency(Number(invoice.total))
                        }
                      </p>
                      {getInvoiceStatusBadge(invoice.status, invoice.dueAt)}
                    </div>
                  </div>
                )
              })}
              
              {customer.invoices.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No invoices yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
