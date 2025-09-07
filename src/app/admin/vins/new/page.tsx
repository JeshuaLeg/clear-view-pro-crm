import { Metadata } from 'next'
import { VINScannerForm } from '@/components/vin/vin-scanner-form'

export const metadata: Metadata = {
  title: 'VIN Scanner',
  description: 'Scan and extract VIN information from images',
}

export default function VINScannerPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">VIN Scanner</h1>
        <p className="text-muted-foreground">
          Upload or capture an image of a VIN to automatically extract and decode vehicle information.
        </p>
      </div>

      <VINScannerForm />
    </div>
  )
}
