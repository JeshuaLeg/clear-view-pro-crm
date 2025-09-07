import { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  FileText, 
  Plus, 
  Search, 
  Download,
  ExternalLink,
  DollarSign,
  AlertTriangle
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Invoices',
  description: 'Manage invoices and payments',
}

async function getInvoices() {
  const invoices = await prisma.invoice.findMany({
    include: {
      job: {
        include: {
          vehicle: true,
          technician: { select: { name: true } },
        },
      },
      customer: true,
      dealership: true,
      payments: {
        where: { status: 'SUCCEEDED' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return invoices
}

async function getInvoiceStats() {
  const [totalInvoices, paidInvoices, pendingAmount, overdueCount] = await Promise.all([
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: 'PAID' } }),
    prisma.invoice.aggregate({
      where: { status: { in: ['SENT', 'PARTIAL'] } },
      _sum: { total: true }
    }),
    prisma.invoice.count({
      where: {
        status: 'OVERDUE',
        dueAt: { lt: new Date() }
      }
    }),
  ])

  return {
    totalInvoices,
    paidInvoices,
    pendingAmount: Number(pendingAmount._sum.total || 0),
    overdueCount,
  }
}

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions)
  const invoices = await getInvoices()
  const stats = await getInvoiceStats()

  const getStatusBadge = (status: string, dueDate?: Date) => {
    if (status === 'OVERDUE' || (dueDate && dueDate < new Date() && status !== 'PAID')) {
      return <Badge variant="destructive">Overdue</Badge>
    }
    
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>
      case 'SENT':
        return <Badge variant="secondary">Sent</Badge>
      case 'PAID':
        return <Badge className="bg-green-500">Paid</Badge>
      case 'PARTIAL':
        return <Badge className="bg-yellow-500">Partial</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCustomerName = (invoice: any) => {
    if (invoice.customer) {
      return `${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}`.trim()
    }
    return invoice.dealership?.name || 'Unknown Customer'
  }

  const getTotalPaid = (payments: any[]) => {
    return payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage invoices and track payments
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/jobs?create_invoice=true">
            <Plus className="mr-2 h-4 w-4" />
            Create Invoice
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.paidInvoices} paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Rate</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalInvoices > 0 
                ? Math.round((stats.paidInvoices / stats.totalInvoices) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Invoices paid
            </p>
          </CardContent>
        </Card>

        <Card className={stats.overdueCount > 0 ? "border-red-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.overdueCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-red-600' : ''}`}>
              {stats.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, customer name, or VIN..."
                className="pl-8"
              />
            </div>
            <Button variant="outline">Filter</Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>
            All invoices sorted by creation date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No invoices</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating an invoice from a completed job.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/admin/jobs?create_invoice=true">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Invoice
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => {
                  const totalPaid = getTotalPaid(invoice.payments)
                  const remainingBalance = Number(invoice.total) - totalPaid
                  const vehicleDescription = [
                    invoice.job.vehicle.year,
                    invoice.job.vehicle.make,
                    invoice.job.vehicle.model,
                  ].filter(Boolean).join(' ')

                  return (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <Link 
                              href={`/admin/invoices/${invoice.id}`}
                              className="font-medium text-blue-600 hover:text-blue-800"
                            >
                              {invoice.number}
                            </Link>
                            <p className="text-sm text-gray-600">
                              {getCustomerName(invoice)} • {vehicleDescription}
                            </p>
                            <p className="text-xs text-gray-500">
                              Created {formatDate(invoice.createdAt)}
                              {invoice.dueAt && (
                                <> • Due {formatDate(invoice.dueAt)}</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(Number(invoice.total))}
                          </p>
                          {totalPaid > 0 && (
                            <p className="text-sm text-gray-600">
                              {formatCurrency(totalPaid)} paid
                              {remainingBalance > 0 && (
                                <> • {formatCurrency(remainingBalance)} due</>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-2">
                          {getStatusBadge(invoice.status, invoice.dueAt)}
                          <div className="flex items-center space-x-1">
                            {invoice.pdfUrl && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-3 w-3" />
                                </a>
                              </Button>
                            )}
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/admin/invoices/${invoice.id}`}>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
