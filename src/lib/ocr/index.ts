import { GoogleVisionOCR } from './providers/google'
import { AWSTextractOCR } from './providers/aws'
import { TesseractOCR } from './providers/tesseract'
import { OCRResult, VINExtractionResult, VehicleInfo, NHTSADecodeResult } from './types'
import { extractVINFromText, isValidVIN } from '@/lib/utils'

export class OCRService {
  private provider: GoogleVisionOCR | AWSTextractOCR | TesseractOCR

  constructor() {
    const ocrProvider = process.env.OCR_PROVIDER || 'tesseract'
    
    switch (ocrProvider.toLowerCase()) {
      case 'google':
        this.provider = new GoogleVisionOCR()
        break
      case 'aws':
        this.provider = new AWSTextractOCR()
        break
      case 'tesseract':
      default:
        this.provider = new TesseractOCR()
        break
    }
  }

  async extractVINFromImage(imageBuffer: Buffer): Promise<VINExtractionResult> {
    try {
      const ocrResult = await this.provider.extractText(imageBuffer)
      const extractedVIN = extractVINFromText(ocrResult.text)
      
      if (!extractedVIN) {
        return {
          vin: null,
          confidence: ocrResult.confidence,
          isValid: false,
          extractedText: ocrResult.text,
          error: 'No valid VIN found in image',
        }
      }

      const isValid = isValidVIN(extractedVIN)
      
      // Find the bounding box for the VIN if available
      const vinBoundingBox = ocrResult.boundingBoxes?.find(box => 
        box.text.includes(extractedVIN) || extractedVIN.includes(box.text)
      )

      return {
        vin: extractedVIN,
        confidence: ocrResult.confidence,
        isValid,
        extractedText: ocrResult.text,
        boundingBox: vinBoundingBox,
        error: isValid ? undefined : 'VIN failed validation check',
      }
    } catch (error) {
      console.error('VIN extraction error:', error)
      return {
        vin: null,
        confidence: 0,
        isValid: false,
        extractedText: '',
        error: error instanceof Error ? error.message : 'OCR extraction failed',
      }
    }
  }

  async decodeVIN(vin: string): Promise<NHTSADecodeResult> {
    try {
      const nhtsaApiBase = process.env.NHTSA_API_BASE || 'https://vpic.nhtsa.dot.gov/api'
      const response = await fetch(
        `${nhtsaApiBase}/vehicles/DecodeVin/${vin}?format=json`
      )

      if (!response.ok) {
        throw new Error(`NHTSA API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const results = data.Results || []

      // Parse the results into a more usable format
      const decoded: NHTSADecodeResult = {}
      
      results.forEach((result: any) => {
        switch (result.Variable) {
          case 'Make':
            decoded.make = result.Value
            break
          case 'Model':
            decoded.model = result.Value
            break
          case 'Model Year':
            decoded.modelYear = result.Value
            break
          case 'Vehicle Type':
            decoded.vehicleType = result.Value
            break
          case 'Trim':
            decoded.trim = result.Value
            break
          case 'Engine Model':
            decoded.engineInfo = result.Value
            break
          case 'Transmission Style':
            decoded.transmissionInfo = result.Value
            break
          case 'Drive Type':
            decoded.driveType = result.Value
            break
          case 'Fuel Type - Primary':
            decoded.fuelType = result.Value
            break
          case 'Plant Country':
            decoded.plantCountry = result.Value
            break
          case 'Plant Company Name':
            decoded.plantCompanyName = result.Value
            break
          case 'Plant State':
            decoded.plantState = result.Value
            break
          case 'Plant City':
            decoded.plantCity = result.Value
            break
        }
      })

      // Check for any errors in the response
      const errorResult = results.find((r: any) => r.Variable === 'Error Code')
      if (errorResult && errorResult.Value !== '0') {
        decoded.errorCode = errorResult.Value
        const errorTextResult = results.find((r: any) => r.Variable === 'Error Text')
        decoded.errorText = errorTextResult?.Value
        const additionalErrorResult = results.find((r: any) => r.Variable === 'Additional Error Text')
        decoded.additionalErrorText = additionalErrorResult?.Value
      }

      return decoded
    } catch (error) {
      console.error('NHTSA decode error:', error)
      return {
        errorCode: '999',
        errorText: 'Failed to decode VIN',
        additionalErrorText: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async processVINImage(imageBuffer: Buffer): Promise<VehicleInfo> {
    const vinExtraction = await this.extractVINFromImage(imageBuffer)
    
    if (!vinExtraction.vin || !vinExtraction.isValid) {
      return {
        vin: vinExtraction.vin || '',
        isValid: false,
        confidence: vinExtraction.confidence,
        ocrText: vinExtraction.extractedText,
        error: vinExtraction.error,
      }
    }

    const nhtsaData = await this.decodeVIN(vinExtraction.vin)
    
    return {
      vin: vinExtraction.vin,
      year: nhtsaData.modelYear ? parseInt(nhtsaData.modelYear) : undefined,
      make: nhtsaData.make || undefined,
      model: nhtsaData.model || undefined,
      trim: nhtsaData.trim || undefined,
      isValid: true,
      confidence: vinExtraction.confidence,
      ocrText: vinExtraction.extractedText,
      nhtsaData,
      error: nhtsaData.errorCode && nhtsaData.errorCode !== '0' 
        ? nhtsaData.errorText 
        : undefined,
    }
  }
}

export * from './types'
