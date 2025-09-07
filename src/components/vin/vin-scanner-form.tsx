"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { extractVinFromImage } from '@/app/actions/vin'
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, Car } from 'lucide-react'

interface VehicleResult {
  id: string
  vin: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  confidence: number
  isValid: boolean
}

export function VINScannerForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<VehicleResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      })
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await extractVinFromImage(formData)

      if (response.success && response.vehicle) {
        setResult(response.vehicle)
        toast({
          title: 'VIN extracted successfully',
          description: `Found VIN: ${response.vehicle.vin}`,
        })
      } else {
        setError(response.error || 'Failed to extract VIN')
        toast({
          title: 'VIN extraction failed',
          description: response.error || 'No VIN could be detected in the image.',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleCameraCapture = () => {
    // In a real app, you would implement camera capture here
    // For now, we'll just trigger the file input
    fileInputRef.current?.click()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const viewVehicle = () => {
    if (result) {
      router.push(`/admin/vehicles/${result.id}`)
    }
  }

  const resetForm = () => {
    setResult(null)
    setError(null)
    setPreviewImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload VIN Image</CardTitle>
          <CardDescription>
            Take a photo or upload an image of a vehicle's VIN for automatic extraction and decoding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="space-y-4">
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Image</span>
                </Button>
                <Button
                  onClick={handleCameraCapture}
                  disabled={isLoading}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Camera className="h-4 w-4" />
                  <span>Take Photo</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Drag and drop an image here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, and other image formats
              </p>
            </div>
          </div>

          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Processing image...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Image */}
      {previewImage && (
        <Card>
          <CardHeader>
            <CardTitle>Image Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img
                src={previewImage}
                alt="VIN preview"
                className="max-w-full max-h-96 rounded-lg shadow-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle className="h-5 w-5 mr-2" />
              VIN Successfully Extracted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">VIN</label>
                <p className="text-lg font-mono">{result.vin}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Confidence</label>
                <div className="flex items-center space-x-2">
                  <Badge variant={result.confidence > 0.8 ? "default" : "secondary"}>
                    {Math.round(result.confidence * 100)}%
                  </Badge>
                  {result.isValid ? (
                    <Badge className="bg-green-500">Valid</Badge>
                  ) : (
                    <Badge variant="destructive">Invalid</Badge>
                  )}
                </div>
              </div>
            </div>

            {(result.year || result.make || result.model) && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Vehicle Information</label>
                <div className="flex items-center space-x-2">
                  <Car className="h-4 w-4 text-gray-500" />
                  <span>
                    {[result.year, result.make, result.model, result.trim]
                      .filter(Boolean)
                      .join(' ')}
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <Button onClick={viewVehicle}>
                View Vehicle Details
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Scan Another VIN
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              Extraction Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">{error}</p>
            <div className="mt-4">
              <Button variant="outline" onClick={resetForm}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tips for Best Results</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Ensure the VIN is clearly visible and well-lit</li>
            <li>• Avoid shadows and reflections on the VIN plate</li>
            <li>• Take the photo straight-on, not at an angle</li>
            <li>• Make sure the entire 17-character VIN is in frame</li>
            <li>• Higher resolution images generally produce better results</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
