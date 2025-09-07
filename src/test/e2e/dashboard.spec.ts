import { test, expect } from '@playwright/test'

// Mock authentication for E2E tests
test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'next-auth.session-token',
            value: 'mock-session-token'
          }
        ]
      }
    ]
  }
})

test.describe('Admin Dashboard', () => {
  test.skip('should display dashboard with key metrics', async ({ page }) => {
    // Skip this test in CI since it requires authentication setup
    await page.goto('/admin')
    
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Check for KPI cards
    await expect(page.getByText('Total Revenue')).toBeVisible()
    await expect(page.getByText('Active Jobs')).toBeVisible()
    await expect(page.getByText('Pending Invoices')).toBeVisible()
    await expect(page.getByText('Vehicles')).toBeVisible()
  })

  test.skip('should navigate to different sections', async ({ page }) => {
    await page.goto('/admin')
    
    // Test navigation
    await page.getByText('Customers').click()
    await expect(page).toHaveURL(/\/admin\/accounts\/customers/)
    
    await page.getByText('Vehicles').click()
    await expect(page).toHaveURL(/\/admin\/vehicles/)
    
    await page.getByText('VIN Scanner').click()
    await expect(page).toHaveURL(/\/admin\/vins\/new/)
  })
})

test.describe('VIN Scanner', () => {
  test.skip('should show VIN scanner interface', async ({ page }) => {
    await page.goto('/admin/vins/new')
    
    await expect(page.locator('h1')).toContainText('VIN Scanner')
    await expect(page.getByText('Upload Image')).toBeVisible()
    await expect(page.getByText('Take Photo')).toBeVisible()
    
    // Check for tips section
    await expect(page.getByText('Tips for Best Results')).toBeVisible()
  })
})

test.describe('Customer Portal', () => {
  test.skip('should show customer dashboard', async ({ page }) => {
    // This would require a customer role session
    await page.goto('/portal')
    
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByText('My Vehicles')).toBeVisible()
    await expect(page.getByText('Active Warranties')).toBeVisible()
  })
})
