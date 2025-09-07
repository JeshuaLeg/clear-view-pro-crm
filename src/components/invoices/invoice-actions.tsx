"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { createStripeCheckout, createStripePaymentLink, updateInvoiceStatus } from '@/app/actions/invoices'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  MoreHorizontal, 
  CreditCard, 
  Link, 
  Send, 
  Download,
  X,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface InvoiceActionsProps {
  invoice: {
    id: string
    number: string
    status: string
    total: number
    pdfUrl?: string | null
    customer?: { email?: string | null } | null
    dealership?: { email?: string | null } | null
  }
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const customerEmail = invoice.customer?.email || invoice.dealership?.email
  const canCreatePayment = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED'
  const canSend = customerEmail && invoice.status === 'DRAFT'
  const canCancel = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED'

  const handleCreateCheckout = async () => {
    if (!customerEmail) {
      toast({
        title: 'No email address',
        description: 'Customer email is required to create a checkout session.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const result = await createStripeCheckout(invoice.id)
      
      if (result.success && result.checkoutUrl) {
        // Open checkout in new tab
        window.open(result.checkoutUrl, '_blank')
        
        toast({
          title: 'Checkout created',
          description: 'Payment checkout has been created and opened in a new tab.',
        })
        
        router.refresh()
      } else {
        toast({
          title: 'Failed to create checkout',
          description: result.error || 'Unable to create payment checkout.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePaymentLink = async () => {
    setIsLoading(true)
    try {
      const result = await createStripePaymentLink(invoice.id)
      
      if (result.success && result.paymentUrl) {
        // Copy to clipboard
        await navigator.clipboard.writeText(result.paymentUrl)
        
        toast({
          title: 'Payment link created',
          description: 'Payment link has been created and copied to clipboard.',
        })
        
        router.refresh()
      } else {
        toast({
          title: 'Failed to create payment link',
          description: result.error || 'Unable to create payment link.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendInvoice = async () => {
    setIsLoading(true)
    try {
      const result = await updateInvoiceStatus(invoice.id, 'SENT')
      
      if (result.success) {
        toast({
          title: 'Invoice sent',
          description: 'Invoice has been marked as sent.',
        })
        
        router.refresh()
      } else {
        toast({
          title: 'Failed to send invoice',
          description: result.error || 'Unable to update invoice status.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkPaid = async () => {
    setIsLoading(true)
    try {
      const result = await updateInvoiceStatus(invoice.id, 'PAID')
      
      if (result.success) {
        toast({
          title: 'Invoice marked as paid',
          description: 'Invoice status has been updated to paid.',
        })
        
        router.refresh()
      } else {
        toast({
          title: 'Failed to update invoice',
          description: result.error || 'Unable to update invoice status.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelInvoice = async () => {
    setIsLoading(true)
    try {
      const result = await updateInvoiceStatus(invoice.id, 'CANCELLED')
      
      if (result.success) {
        toast({
          title: 'Invoice cancelled',
          description: 'Invoice has been cancelled.',
        })
        
        router.refresh()
        setShowCancelDialog(false)
      } else {
        toast({
          title: 'Failed to cancel invoice',
          description: result.error || 'Unable to cancel invoice.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center space-x-2">
        {/* Quick Actions */}
        {canCreatePayment && (
          <Button 
            onClick={handleCreateCheckout}
            disabled={isLoading || !customerEmail}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            <span>Create Checkout</span>
          </Button>
        )}

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={isLoading}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canCreatePayment && (
              <>
                <DropdownMenuItem onClick={handleCreatePaymentLink}>
                  <Link className="mr-2 h-4 w-4" />
                  Create Payment Link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            
            {canSend && (
              <DropdownMenuItem onClick={handleSendInvoice}>
                <Send className="mr-2 h-4 w-4" />
                Mark as Sent
              </DropdownMenuItem>
            )}
            
            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <DropdownMenuItem onClick={handleMarkPaid}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            
            {invoice.pdfUrl && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </a>
                </DropdownMenuItem>
              </>
            )}
            
            {canCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowCancelDialog(true)}
                  className="text-red-600"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel Invoice
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel invoice {invoice.number}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invoice</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvoice}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Cancel Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
