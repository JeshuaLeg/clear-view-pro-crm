import { describe, it, expect } from 'vitest'
import { 
  isValidVIN, 
  extractVINFromText, 
  formatCurrency, 
  formatDate,
  generateInvoiceNumber,
  calculateDueDate 
} from '../lib/utils'

describe('VIN Utilities', () => {
  it('should validate correct VINs', () => {
    const validVINs = [
      '1HGCM82633A123456',
      '1FTFW1ET5DFC12345',
      '1G1ZD5ST8GF123456'
    ]
    
    validVINs.forEach(vin => {
      expect(isValidVIN(vin)).toBe(true)
    })
  })

  it('should reject invalid VINs', () => {
    const invalidVINs = [
      '123456789',           // Too short
      '1HGCM82633A1234567',  // Too long
      '1HGCM82633A12345I',   // Contains I
      '1HGCM82633A12345O',   // Contains O
      '1HGCM82633A12345Q',   // Contains Q
      ''                     // Empty
    ]
    
    invalidVINs.forEach(vin => {
      expect(isValidVIN(vin)).toBe(false)
    })
  })

  it('should extract VIN from text', () => {
    const testCases = [
      {
        text: 'VIN: 1HGCM82633A123456 Model: Honda Accord',
        expected: '1HGCM82633A123456'
      },
      {
        text: 'Vehicle Identification Number 1FTFW1ET5DFC12345',
        expected: '1FTFW1ET5DFC12345'
      },
      {
        text: 'No VIN here, just random text',
        expected: null
      }
    ]
    
    testCases.forEach(({ text, expected }) => {
      expect(extractVINFromText(text)).toBe(expected)
    })
  })
})

describe('Formatting Utilities', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(123.45)).toBe('$123.45')
    expect(formatCurrency(1000)).toBe('$1,000.00')
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency('123.45')).toBe('$123.45')
  })

  it('should format dates correctly', () => {
    const testDate = new Date('2024-01-15T10:30:00Z')
    const formatted = formatDate(testDate)
    expect(formatted).toMatch(/Jan 15, 2024/)
  })
})

describe('Business Logic Utilities', () => {
  it('should generate unique invoice numbers', () => {
    const invoice1 = generateInvoiceNumber()
    const invoice2 = generateInvoiceNumber()
    
    expect(invoice1).toMatch(/^INV-\d{4}-[A-Z0-9]{6}$/)
    expect(invoice2).toMatch(/^INV-\d{4}-[A-Z0-9]{6}$/)
    expect(invoice1).not.toBe(invoice2)
  })

  it('should calculate due dates correctly', () => {
    const baseDate = new Date('2024-01-15')
    
    const immediateDate = calculateDueDate('IMMEDIATE', baseDate)
    expect(immediateDate).toEqual(baseDate)
    
    const net15Date = calculateDueDate('NET_15', baseDate)
    const expectedNet15 = new Date('2024-01-30')
    expect(net15Date).toEqual(expectedNet15)
    
    const net30Date = calculateDueDate('NET_30', baseDate)
    const expectedNet30 = new Date('2024-02-14')
    expect(net30Date).toEqual(expectedNet30)
  })
})
