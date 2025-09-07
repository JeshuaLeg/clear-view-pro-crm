import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to signin', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/auth\/signin/)
  })

  test('should show signin form', async ({ page }) => {
    await page.goto('/auth/signin')
    
    await expect(page.locator('h2')).toContainText('Sign in to ClearView Pro')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.getByText('Send magic link')).toBeVisible()
    await expect(page.getByText('Continue with Google')).toBeVisible()
  })

  test('should validate email input', async ({ page }) => {
    await page.goto('/auth/signin')
    
    const emailInput = page.locator('input[type="email"]')
    const submitButton = page.getByText('Send magic link')
    
    // Button should be disabled when email is empty
    await expect(submitButton).toBeDisabled()
    
    // Enter invalid email
    await emailInput.fill('invalid-email')
    // HTML5 validation should prevent submission
    
    // Enter valid email
    await emailInput.fill('test@example.com')
    await expect(submitButton).not.toBeDisabled()
  })
})

test.describe('Role-based Access', () => {
  test('should restrict admin routes', async ({ page }) => {
    // This would require setting up test users with different roles
    // For now, we'll just test the redirect behavior
    
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/auth\/signin/)
    
    await page.goto('/admin/invoices')
    await expect(page).toHaveURL(/\/auth\/signin/)
    
    await page.goto('/admin/settings')
    await expect(page).toHaveURL(/\/auth\/signin/)
  })

  test('should restrict portal routes', async ({ page }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/\/auth\/signin/)
  })
})
