import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { InvoiceActions } from '@/components/invoices/invoice-actions'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { 
  FileText, 
  Download, 
  ArrowLeft,
  Car,
  User,
  Building,
  Calendar,
  DollarSign,
  CreditCard
} from 'lucide-react'

interface InvoicePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: InvoicePageProps): Promise<Metadata> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    select: { number: true }
  })

  return {
    title: invoice ? `Invoice ${invoice.number}` : 'Invoice Not Found',
    description: 'Invoice details and payment information',
  }
}

async function getInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      job: {
        include: {
          vehicle: true,
          serviceItems: true,
          technician: { select: { name: true, email: true } },
        },
      },
      customer: true,
      dealership: {
        include: {
          contacts: true,
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return invoice
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const session = await getServerSession(authOptions)
  const invoice = await getInvoice(params.id)

  if (!invoice) {
    notFound()
  }

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

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCEEDED':
        return <Badge className="bg-green-500">Succeeded</Badge>
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>
      case 'REFUNDED':
        return <Badge className="bg-orange-500">Refunded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const customerName = invoice.customer 
    ? `${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}`.trim()
    : invoice.dealership?.name || 'Unknown Customer'

  const customerEmail = invoice.customer?.email || invoice.dealership?.email
  const customerPhone = invoice.customer?.phone || invoice.dealership?.phone

  const vehicleDescription = [
    invoice.job.vehicle.year,
    invoice.job.vehicle.make,
    invoice.job.vehicle.model,
    invoice.job.vehicle.trim,
  ].filter(Boolean).join(' ')

  const totalPaid = invoice.payments
    .filter(p => p.status === 'SUCCEEDED')
    .reduce((sum, payment) => sum + Number(payment.amount), 0)

  const remainingBalance = Number(invoice.total) - totalPaid

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice {invoice.number}</h1>
            <p className="text-muted-foreground">
              Created {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(invoice.status, invoice.dueAt)}
          <InvoiceActions invoice={invoice} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {invoice.customer ? (
                  <User className="mr-2 h-5 w-5" />
                ) : (
                  <Building className="mr-2 h-5 w-5" />
                )}
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{customerName}</p>
                {customerEmail && <p className="text-sm text-muted-foreground">{customerEmail}</p>}
                {customerPhone && <p className="text-sm text-muted-foreground">{customerPhone}</p>}
              </div>
              
              {invoice.dealership && invoice.dealership.contacts.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Contacts:</p>
                  {invoice.dealership.contacts.map((contact) => (
                    <div key={contact.id} className="text-sm text-muted-foreground">
                      {contact.firstName} {contact.lastName}
                      {contact.role && ` (${contact.role})`}
                      {contact.email && ` • ${contact.email}`}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle & Job Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="mr-2 h-5 w-5" />
                Vehicle & Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{vehicleDescription || 'Unknown Vehicle'}</p>
                <p className="text-sm text-muted-foreground">VIN: {invoice.job.vehicle.vin}</p>
                <p className="text-sm text-muted-foreground">Job #: {invoice.job.jobNumber}</p>
              </div>
              
              {invoice.job.completedAt && (
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Service Date:</span> {formatDate(invoice.job.completedAt)}
                  </p>
                </div>
              )}
              
              {invoice.job.technician && (
                <div>
                  <p className="text-sm">
                    <span className="font-medium">Technician:</span> {invoice.job.technician.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service Items */}
          <Card>
            <CardHeader>
              <CardTitle>Services Performed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoice.job.serviceItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.type} • Qty: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(Number(item.unitPrice) * item.quantity)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(Number(item.unitPrice))} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(Number(invoice.subtotal))}</span>
                </div>
                
                {Number(invoice.taxAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({(Number(invoice.taxRate) * 100).toFixed(2)}%):</span>
                    <span>{formatCurrency(Number(invoice.taxAmount))}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(Number(invoice.total))}</span>
                </div>
                
                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span>-{formatCurrency(totalPaid)}</span>
                    </div>
                    
                    {remainingBalance > 0 && (
                      <div className="flex justify-between font-bold text-red-600">
                        <span>Balance Due:</span>
                        <span>{formatCurrency(remainingBalance)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invoice Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Invoice Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                {getStatusBadge(invoice.status, invoice.dueAt)}
              </div>
              
              {invoice.dueAt && (
                <div className="flex items-center justify-between">
                  <span>Due Date:</span>
                  <span className="text-sm">{formatDate(invoice.dueAt)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <span>Terms:</span>
                <span className="text-sm">{invoice.terms.replace('_', '-')}</span>
              </div>
              
              {invoice.paidAt && (
                <div className="flex items-center justify-between">
                  <span>Paid Date:</span>
                  <span className="text-sm">{formatDate(invoice.paidAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded</p>
              ) : (
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {formatCurrency(Number(payment.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.method} • {payment.paidAt ? formatDateTime(payment.paidAt) : formatDateTime(payment.createdAt)}
                        </p>
                        {payment.failureReason && (
                          <p className="text-xs text-red-600">{payment.failureReason}</p>
                        )}
                      </div>
                      {getPaymentStatusBadge(payment.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoice.pdfUrl && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </a>
                </Button>
              )}
              
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/jobs/${invoice.jobId}`}>
                  <Car className="mr-2 h-4 w-4" />
                  View Job Details
                </Link>
              </Button>
              
              {invoice.customer && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/admin/accounts/customers/${invoice.customerId}`}>
                    <User className="mr-2 h-4 w-4" />
                    View Customer
                  </Link>
                </Button>
              )}
              
              {invoice.dealership && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/admin/accounts/dealerships/${invoice.dealershipId}`}>
                    <Building className="mr-2 h-4 w-4" />
                    View Dealership
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
