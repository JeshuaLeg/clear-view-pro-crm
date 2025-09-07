import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'
import { formatCurrency, formatDate } from './utils'

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2563eb',
  },
  companyInfo: {
    marginBottom: 20,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  column: {
    flex: 1,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    flex: 1,
  },
  tableCellRight: {
    flex: 1,
    textAlign: 'right',
  },
  total: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalAmount: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280',
  },
})

interface InvoiceData {
  invoice: {
    id: string
    number: string
    status: string
    subtotal: number
    taxAmount: number
    total: number
    dueAt: Date | null
    createdAt: Date
    notes?: string
  }
  customer?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  dealership?: {
    name: string
    email?: string
    phone?: string
  }
  job: {
    jobNumber: string
    vehicle: {
      vin: string
      year?: number
      make?: string
      model?: string
      trim?: string
    }
    serviceItems: Array<{
      description: string
      quantity: number
      unitPrice: number
      type: string
    }>
    completedAt?: Date
  }
  company: {
    name: string
    email: string
    phone: string
    address?: string
  }
}

// Invoice PDF Component
export const InvoicePDF = ({ data }: { data: InvoiceData }) => {
  const customerName = data.customer 
    ? `${data.customer.firstName || ''} ${data.customer.lastName || ''}`.trim()
    : data.dealership?.name || 'Unknown Customer'

  const customerEmail = data.customer?.email || data.dealership?.email
  const customerPhone = data.customer?.phone || data.dealership?.phone

  const vehicleDescription = [
    data.job.vehicle.year,
    data.job.vehicle.make,
    data.job.vehicle.model,
    data.job.vehicle.trim
  ].filter(Boolean).join(' ')

  return (
    <Document>
      <Page style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{data.company.name}</Text>
            <Text>{data.company.email}</Text>
            <Text>{data.company.phone}</Text>
            {data.company.address && <Text>{data.company.address}</Text>}
          </View>
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Invoice Details</Text>
              <Text>Invoice #: {data.invoice.number}</Text>
              <Text>Date: {formatDate(data.invoice.createdAt)}</Text>
              {data.invoice.dueAt && (
                <Text>Due Date: {formatDate(data.invoice.dueAt)}</Text>
              )}
              <Text>Status: {data.invoice.status}</Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <Text>{customerName}</Text>
              {customerEmail && <Text>{customerEmail}</Text>}
              {customerPhone && <Text>{customerPhone}</Text>}
            </View>
          </View>
        </View>

        {/* Vehicle Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <Text>VIN: {data.job.vehicle.vin}</Text>
          <Text>Vehicle: {vehicleDescription || 'Unknown Vehicle'}</Text>
          <Text>Job #: {data.job.jobNumber}</Text>
          {data.job.completedAt && (
            <Text>Service Date: {formatDate(data.job.completedAt)}</Text>
          )}
        </View>

        {/* Service Items Table */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>Services Performed</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCell}>Description</Text>
            <Text style={styles.tableCell}>Type</Text>
            <Text style={styles.tableCellRight}>Qty</Text>
            <Text style={styles.tableCellRight}>Rate</Text>
            <Text style={styles.tableCellRight}>Amount</Text>
          </View>
          {data.job.serviceItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.description}</Text>
              <Text style={styles.tableCell}>{item.type}</Text>
              <Text style={styles.tableCellRight}>{item.quantity}</Text>
              <Text style={styles.tableCellRight}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={styles.tableCellRight}>
                {formatCurrency(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.total}>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(data.invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax:</Text>
            <Text>{formatCurrency(data.invoice.taxAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>
              {formatCurrency(data.invoice.total)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {data.invoice.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{data.invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for choosing {data.company.name} for your headlight restoration needs!
        </Text>
      </Page>
    </Document>
  )
}

// Generate PDF buffer (for server-side use)
export const generateInvoicePDF = async (data: InvoiceData): Promise<Buffer> => {
  // Note: This would require a server-side PDF generation library
  // For now, we'll return a placeholder
  // In production, you might use puppeteer, react-pdf, or similar
  
  const pdfContent = `
    INVOICE - ${data.invoice.number}
    
    ${data.company.name}
    ${data.company.email}
    ${data.company.phone}
    
    Bill To: ${data.customer ? `${data.customer.firstName} ${data.customer.lastName}` : data.dealership?.name}
    
    Vehicle: ${data.job.vehicle.year} ${data.job.vehicle.make} ${data.job.vehicle.model}
    VIN: ${data.job.vehicle.vin}
    
    Services:
    ${data.job.serviceItems.map(item => 
      `${item.description} - ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.quantity * item.unitPrice)}`
    ).join('\n')}
    
    Subtotal: ${formatCurrency(data.invoice.subtotal)}
    Tax: ${formatCurrency(data.invoice.taxAmount)}
    Total: ${formatCurrency(data.invoice.total)}
  `
  
  return Buffer.from(pdfContent, 'utf-8')
}

// Save PDF to storage (placeholder)
export const savePDFToStorage = async (pdfBuffer: Buffer, fileName: string): Promise<string> => {
  // In production, you would upload to your storage service (S3, Vercel Blob, etc.)
  // For now, return a placeholder URL
  return `https://your-storage.com/invoices/${fileName}`
}
