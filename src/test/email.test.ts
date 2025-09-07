import { describe, it, expect, vi } from 'vitest'
import { replaceTemplateVariables, DEFAULT_EMAIL_TEMPLATES } from '../lib/email'

describe('Email Template System', () => {
  it('should replace template variables correctly', () => {
    const template = 'Hello {customerName}, your invoice #{invoiceNumber} for {total} is due on {dueDate}.'
    const variables = {
      customerName: 'John Doe',
      invoiceNumber: 'INV-2024-001',
      total: '$150.00',
      dueDate: 'Jan 15, 2024'
    }
    
    const result = replaceTemplateVariables(template, variables)
    expect(result).toBe('Hello John Doe, your invoice #INV-2024-001 for $150.00 is due on Jan 15, 2024.')
  })

  it('should handle missing variables gracefully', () => {
    const template = 'Hello {customerName}, your balance is {amount}.'
    const variables = {
      customerName: 'John Doe'
      // amount is missing
    }
    
    const result = replaceTemplateVariables(template, variables)
    expect(result).toBe('Hello John Doe, your balance is .')
  })

  it('should have all required default templates', () => {
    const requiredTemplates = [
      'INVOICE_CREATED',
      'WARRANTY_EXPIRING', 
      'WARRANTY_EXPIRED',
      'PAYMENT_RECEIVED'
    ]
    
    requiredTemplates.forEach(templateKey => {
      expect(DEFAULT_EMAIL_TEMPLATES[templateKey]).toBeDefined()
      expect(DEFAULT_EMAIL_TEMPLATES[templateKey].key).toBeDefined()
      expect(DEFAULT_EMAIL_TEMPLATES[templateKey].subject).toBeDefined()
      expect(DEFAULT_EMAIL_TEMPLATES[templateKey].htmlBody).toBeDefined()
      expect(DEFAULT_EMAIL_TEMPLATES[templateKey].variables).toBeInstanceOf(Array)
    })
  })

  it('should have consistent variables in templates', () => {
    const template = DEFAULT_EMAIL_TEMPLATES.INVOICE_CREATED
    
    // Check that all variables mentioned in the template are in the variables array
    const subjectVariables = template.subject.match(/{(\w+)}/g) || []
    const bodyVariables = template.htmlBody.match(/{(\w+)}/g) || []
    
    const allVariables = [...subjectVariables, ...bodyVariables]
      .map(v => v.replace(/[{}]/g, ''))
    
    const uniqueVariables = [...new Set(allVariables)]
    
    uniqueVariables.forEach(variable => {
      expect(template.variables).toContain(variable)
    })
  })
})
