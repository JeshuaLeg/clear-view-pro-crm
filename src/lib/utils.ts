import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numAmount)
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj)
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dateObj)
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase()
  return `INV-${year}-${randomSuffix}`
}

export function generateJobNumber(): string {
  const year = new Date().getFullYear()
  const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase()
  return `JOB-${year}-${randomSuffix}`
}

export function calculateDueDate(terms: string, invoiceDate: Date = new Date()): Date {
  const dueDate = new Date(invoiceDate)
  
  switch (terms) {
    case 'NET_15':
      dueDate.setDate(dueDate.getDate() + 15)
      break
    case 'NET_30':
      dueDate.setDate(dueDate.getDate() + 30)
      break
    case 'NET_45':
      dueDate.setDate(dueDate.getDate() + 45)
      break
    case 'IMMEDIATE':
    default:
      // Due immediately
      break
  }
  
  return dueDate
}

export function isValidVIN(vin: string): boolean {
  // Basic VIN validation
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) {
    return false
  }
  
  // Check digit validation (ISO 3779)
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]
  const transliteration = {
    A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
    J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
    S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9
  } as Record<string, number>
  
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const char = vin[i].toUpperCase()
    if (i === 8) continue // Skip check digit position
    
    const value = isNaN(parseInt(char)) ? transliteration[char] : parseInt(char)
    sum += value * weights[i]
  }
  
  const checkDigit = sum % 11
  const expectedCheckDigit = checkDigit === 10 ? 'X' : checkDigit.toString()
  
  return vin[8].toUpperCase() === expectedCheckDigit
}

export function extractVINFromText(text: string): string | null {
  // Look for 17-character alphanumeric strings that could be VINs
  const vinRegex = /[A-HJ-NPR-Z0-9]{17}/gi
  const matches = text.match(vinRegex)
  
  if (!matches) return null
  
  // Return the first valid VIN found
  for (const match of matches) {
    if (isValidVIN(match)) {
      return match.toUpperCase()
    }
  }
  
  return null
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
