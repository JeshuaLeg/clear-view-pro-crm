"use server"

import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OCRService } from '@/lib/ocr'
import { z } from 'zod'

const extractVinSchema = z.object({
  imageUrl: z.string().url(),
  fileName: z.string().optional(),
})

export async function extractVinFromImage(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'TECH', 'STAFF'].includes(session.user.role)) {
      return { 
        success: false, 
        error: 'Unauthorized' 
      }
    }

    const file = formData.get('image') as File
    if (!file) {
      return { 
        success: false, 
        error: 'No image file provided' 
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract VIN using OCR
    const ocrService = new OCRService()
    const vehicleInfo = await ocrService.processVINImage(buffer)

    if (!vehicleInfo.vin) {
      return {
        success: false,
        error: vehicleInfo.error || 'No VIN detected in image',
        extractedText: vehicleInfo.ocrText,
        confidence: vehicleInfo.confidence,
      }
    }

    // Store the image and create vehicle record
    // Note: In production, you would upload the image to your storage service first
    const imageUrl = `data:${file.type};base64,${buffer.toString('base64')}`

    const vehicle = await prisma.vehicle.create({
      data: {
        vin: vehicleInfo.vin,
        year: vehicleInfo.year,
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        trim: vehicleInfo.trim,
        imageUrl,
        ocrText: vehicleInfo.ocrText,
        confidence: vehicleInfo.confidence,
        vinMeta: {
          ocr: {
            extractedText: vehicleInfo.ocrText,
            confidence: vehicleInfo.confidence,
            processedAt: new Date().toISOString(),
          },
          nhtsa: vehicleInfo.nhtsaData as any,
        } as any,
      },
    })

    revalidatePath('/admin/vehicles')

    return {
      success: true,
      vehicle: {
        id: vehicle.id,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        confidence: vehicleInfo.confidence,
        isValid: vehicleInfo.isValid,
      },
    }
  } catch (error) {
    console.error('VIN extraction error:', error)
    
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Invalid input data',
        details: error.errors,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract VIN',
    }
  }
}

export async function assignVehicleToAccount(vehicleId: string, accountId: string, accountType: 'customer' | 'dealership') {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'TECH', 'STAFF'].includes(session.user.role)) {
      return { 
        success: false, 
        error: 'Unauthorized' 
      }
    }

    const updateData = accountType === 'customer' 
      ? { customerId: accountId, dealershipId: null }
      : { dealershipId: accountId, customerId: null }

    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateData,
      include: {
        customer: true,
        dealership: true,
      },
    })

    revalidatePath('/admin/vehicles')
    revalidatePath(`/admin/vehicles/${vehicleId}`)

    return {
      success: true,
      vehicle,
    }
  } catch (error) {
    console.error('Vehicle assignment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign vehicle',
    }
  }
}

export async function updateVehicleInfo(vehicleId: string, data: {
  vin?: string
  year?: number
  make?: string
  model?: string
  trim?: string
  color?: string
  mileage?: number
}) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['ADMIN', 'TECH', 'STAFF'].includes(session.user.role)) {
      return { 
        success: false, 
        error: 'Unauthorized' 
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data,
      include: {
        customer: true,
        dealership: true,
      },
    })

    revalidatePath('/admin/vehicles')
    revalidatePath(`/admin/vehicles/${vehicleId}`)

    return {
      success: true,
      vehicle,
    }
  } catch (error) {
    console.error('Vehicle update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update vehicle',
    }
  }
}
