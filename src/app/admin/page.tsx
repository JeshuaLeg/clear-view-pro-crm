import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  Users, 
  Car, 
  Wrench, 
  FileText, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  Calendar
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'ClearView Pro CRM Dashboard',
}

async function getDashboardData() {
  const [
    totalCustomers,
    totalDealerships,
    totalVehicles,
    activeJobs,
    completedJobsThisWeek,
    pendingInvoices,
    overdueInvoices,
    totalRevenue,
    expiringWarranties,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.dealership.count(),
    prisma.vehicle.count(),
    prisma.serviceJob.count({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    }),
    prisma.serviceJob.count({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    }),
    prisma.invoice.count({
      where: {
        status: { in: ['SENT', 'PARTIAL'] }
      }
    }),
    prisma.invoice.count({
      where: {
        status: 'OVERDUE'
      }
    }),
    prisma.payment.aggregate({
      where: {
        status: 'SUCCEEDED'
      },
      _sum: {
        amount: true
      }
    }),
    prisma.warranty.count({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
        }
      }
    }),
  ])

  const recentJobs = await prisma.serviceJob.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: true,
      customer: true,
      dealership: true,
      technician: { select: { name: true } },
    }
  })

  const recentInvoices = await prisma.invoice.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      dealership: true,
      job: {
        include: {
          vehicle: true
        }
      }
    }
  })

  return {
    stats: {
      totalCustomers,
      totalDealerships,
      totalVehicles,
      activeJobs,
      completedJobsThisWeek,
      pendingInvoices,
      overdueInvoices,
      totalRevenue: totalRevenue._sum.amount || 0,
      expiringWarranties,
    },
    recentJobs,
    recentInvoices,
  }
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  const data = await getDashboardData()

  const getJobStatusBadge = (status: string) => {
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

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline">Draft</Badge>
      case 'SENT':
        return <Badge variant="secondary">Sent</Badge>
      case 'PAID':
        return <Badge className="bg-green-500">Paid</Badge>
      case 'PARTIAL':
        return <Badge className="bg-yellow-500">Partial</Badge>
      case 'OVERDUE':
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session?.user?.name}. Here's what's happening with your business today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(data.stats.totalRevenue))}</div>
            <p className="text-xs text-muted-foreground">
              All time payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.activeJobs}</div>
            <p className="text-xs text-muted-foreground">
              +{data.stats.completedJobsThisWeek} completed this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.overdueInvoices > 0 && (
                <span className="text-red-500">{data.stats.overdueInvoices} overdue</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.totalCustomers} customers, {data.stats.totalDealerships} dealerships
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(data.stats.overdueInvoices > 0 || data.stats.expiringWarranties > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.stats.overdueInvoices > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                  Overdue Invoices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{data.stats.overdueInvoices}</div>
                <p className="text-xs text-muted-foreground">
                  Require immediate attention
                </p>
              </CardContent>
            </Card>
          )}

          {data.stats.expiringWarranties > 0 && (
            <Card className="border-yellow-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Calendar className="h-4 w-4 text-yellow-500 mr-2" />
                  Expiring Warranties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{data.stats.expiringWarranties}</div>
                <p className="text-xs text-muted-foreground">
                  Expire within 30 days
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
            <CardDescription>Latest service jobs in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {job.vehicle?.year} {job.vehicle?.make} {job.vehicle?.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {job.customer ? 
                        `${job.customer.firstName} ${job.customer.lastName}` :
                        job.dealership?.name
                      } • {job.technician?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {getJobStatusBadge(job.status)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(job.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Latest invoices created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentInvoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {invoice.number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.customer ? 
                        `${invoice.customer.firstName} ${invoice.customer.lastName}` :
                        invoice.dealership?.name
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(Number(invoice.total))}
                    </p>
                    {getInvoiceStatusBadge(invoice.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
