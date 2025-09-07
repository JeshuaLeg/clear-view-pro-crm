import { OCRResult, BoundingBox } from '../types'

export class AWSTextractOCR {
  private region: string
  private accessKeyId: string
  private secretAccessKey: string

  constructor() {
    this.region = process.env.AWS_TEXTRACT_REGION || 'us-east-1'
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID || ''
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || ''

    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials not configured')
    }
  }

  private async createSignedRequest(
    method: string,
    url: string,
    body: string,
    headers: Record<string, string>
  ): Promise<Response> {
    // AWS Signature Version 4 signing process
    // This is a simplified implementation - in production, use AWS SDK
    
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '')
    const dateStamp = amzDate.substr(0, 8)
    
    const service = 'textract'
    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${dateStamp}/${this.region}/${service}/aws4_request`

    // Add required headers
    headers['host'] = `textract.${this.region}.amazonaws.com`
    headers['x-amz-date'] = amzDate
    headers['x-amz-target'] = 'Textract.DetectDocumentText'
    headers['content-type'] = 'application/x-amz-json-1.1'

    // Create canonical request
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n')
    
    const signedHeaders = Object.keys(headers)
      .sort()
      .map(key => key.toLowerCase())
      .join(';')

    const payloadHash = await this.sha256(body)
    
    const canonicalRequest = [
      method,
      '/',
      '',
      canonicalHeaders + '\n',
      signedHeaders,
      payloadHash
    ].join('\n')

    // Create string to sign
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await this.sha256(canonicalRequest)
    ].join('\n')

    // Calculate signature
    const signature = await this.calculateSignature(
      stringToSign,
      dateStamp,
      this.region,
      service
    )

    // Add authorization header
    headers['authorization'] = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    return fetch(url, {
      method,
      headers,
      body,
    })
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async hmac(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  }

  private async calculateSignature(
    stringToSign: string,
    dateStamp: string,
    region: string,
    service: string
  ): Promise<string> {
    const kDate = await this.hmac(
      new TextEncoder().encode(`AWS4${this.secretAccessKey}`),
      dateStamp
    )
    const kRegion = await this.hmac(kDate, region)
    const kService = await this.hmac(kRegion, service)
    const kSigning = await this.hmac(kService, 'aws4_request')
    const signature = await this.hmac(kSigning, stringToSign)
    
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  async extractText(imageBuffer: Buffer): Promise<OCRResult> {
    try {
      const base64Image = imageBuffer.toString('base64')
      const url = `https://textract.${this.region}.amazonaws.com/`
      
      const body = JSON.stringify({
        Document: {
          Bytes: base64Image,
        },
      })

      const headers: Record<string, string> = {}
      
      const response = await this.createSignedRequest('POST', url, body, headers)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(`AWS Textract error: ${JSON.stringify(data)}`)
      }

      const blocks = data.Blocks || []
      const textBlocks = blocks.filter((block: any) => block.BlockType === 'WORD')
      
      let fullText = ''
      const boundingBoxes: BoundingBox[] = []
      let totalConfidence = 0

      textBlocks.forEach((block: any) => {
        const text = block.Text || ''
        const confidence = block.Confidence || 0
        
        if (text.trim()) {
          fullText += (fullText ? ' ' : '') + text
          totalConfidence += confidence

          // Extract bounding box
          const bbox = block.Geometry?.BoundingBox
          if (bbox) {
            boundingBoxes.push({
              x: bbox.Left || 0,
              y: bbox.Top || 0,
              width: bbox.Width || 0,
              height: bbox.Height || 0,
              text,
              confidence: confidence / 100, // AWS returns 0-100, normalize to 0-1
            })
          }
        }
      })

      const averageConfidence = textBlocks.length > 0 
        ? (totalConfidence / textBlocks.length) / 100 // Normalize to 0-1
        : 0

      return {
        text: fullText,
        confidence: averageConfidence,
        boundingBoxes,
      }
    } catch (error) {
      console.error('AWS Textract OCR error:', error)
      throw new Error(`AWS Textract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
