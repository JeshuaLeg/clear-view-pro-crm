export interface OCRResult {
  text: string
  confidence: number
  boundingBoxes?: BoundingBox[]
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
  text: string
  confidence: number
}

export interface VINExtractionResult {
  vin: string | null
  confidence: number
  isValid: boolean
  extractedText: string
  boundingBox?: BoundingBox
  error?: string
}

export interface NHTSADecodeResult {
  make?: string
  model?: string
  modelYear?: string
  vehicleType?: string
  trim?: string
  engineInfo?: string
  transmissionInfo?: string
  driveType?: string
  fuelType?: string
  plantCountry?: string
  plantCompanyName?: string
  plantState?: string
  plantCity?: string
  errorCode?: string
  errorText?: string
  additionalErrorText?: string
}

export interface VehicleInfo {
  vin: string
  year?: number
  make?: string
  model?: string
  trim?: string
  isValid: boolean
  confidence: number
  ocrText: string
  nhtsaData?: NHTSADecodeResult
  error?: string
}
