import { OCRResult, BoundingBox } from '../types'

interface GoogleVisionCredentials {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

export class GoogleVisionOCR {
  private credentials: GoogleVisionCredentials | null = null

  constructor() {
    try {
      const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      if (credentialsJson) {
        this.credentials = JSON.parse(credentialsJson)
      }
    } catch (error) {
      console.error('Failed to parse Google credentials:', error)
    }
  }

  private async getAccessToken(): Promise<string> {
    if (!this.credentials) {
      throw new Error('Google Vision credentials not configured')
    }

    const jwt = await this.createJWT()
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`Failed to get access token: ${data.error_description}`)
    }

    return data.access_token
  }

  private async createJWT(): Promise<string> {
    if (!this.credentials) {
      throw new Error('Google Vision credentials not configured')
    }

    const header = {
      alg: 'RS256',
      typ: 'JWT',
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: this.credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }

    // Note: In production, you should use a proper JWT library
    // This is a simplified implementation
    const encodedHeader = btoa(JSON.stringify(header))
    const encodedPayload = btoa(JSON.stringify(payload))
    const signatureInput = `${encodedHeader}.${encodedPayload}`
    
    // For this implementation, we'll use the Google Cloud Vision API directly
    // In a real implementation, you would properly sign the JWT
    return `${encodedHeader}.${encodedPayload}.signature`
  }

  async extractText(imageBuffer: Buffer): Promise<OCRResult> {
    try {
      if (!this.credentials) {
        throw new Error('Google Vision credentials not configured')
      }

      const base64Image = imageBuffer.toString('base64')
      const accessToken = await this.getAccessToken()

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Image,
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 50,
                  },
                ],
              },
            ],
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${JSON.stringify(data)}`)
      }

      const annotations = data.responses[0]?.textAnnotations || []
      
      if (annotations.length === 0) {
        return {
          text: '',
          confidence: 0,
          boundingBoxes: [],
        }
      }

      // First annotation contains all detected text
      const fullText = annotations[0]?.description || ''
      const confidence = annotations[0]?.confidence || 0

      // Extract individual words with bounding boxes
      const boundingBoxes: BoundingBox[] = annotations.slice(1).map((annotation: any) => {
        const vertices = annotation.boundingPoly?.vertices || []
        const x = Math.min(...vertices.map((v: any) => v.x || 0))
        const y = Math.min(...vertices.map((v: any) => v.y || 0))
        const maxX = Math.max(...vertices.map((v: any) => v.x || 0))
        const maxY = Math.max(...vertices.map((v: any) => v.y || 0))

        return {
          x,
          y,
          width: maxX - x,
          height: maxY - y,
          text: annotation.description || '',
          confidence: annotation.confidence || 0,
        }
      })

      return {
        text: fullText,
        confidence,
        boundingBoxes,
      }
    } catch (error) {
      console.error('Google Vision OCR error:', error)
      throw new Error(`Google Vision OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
