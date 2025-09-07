import { NextRequest, NextResponse } from 'next/server'
import { checkExpiringWarranties, checkExpiredWarranties } from '@/app/actions/warranties'

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting warranty check cron job...')

    // Check for warranties expiring in the next 30 days
    const expiringResult = await checkExpiringWarranties(30)
    
    // Check for warranties expiring in the next 7 days (more urgent)
    const urgentResult = await checkExpiringWarranties(7)
    
    // Process expired warranties
    const expiredResult = await checkExpiredWarranties()

    const summary = {
      timestamp: new Date().toISOString(),
      expiring30Days: {
        processed: expiringResult?.processed || 0,
        success: expiringResult?.success || false,
      },
      expiring7Days: {
        processed: urgentResult?.processed || 0,
        success: urgentResult?.success || false,
      },
      expired: {
        processed: expiredResult?.expired || 0,
        followUpsSent: expiredResult?.followUpsSent || 0,
        success: expiredResult?.success || false,
      },
      totalEmailsSent: 
        (expiringResult?.success ? expiringResult.processed || 0 : 0) +
        (urgentResult?.success ? urgentResult.processed || 0 : 0) +
        (expiredResult?.success ? expiredResult.followUpsSent || 0 : 0),
    }

    console.log('Warranty check completed:', summary)

    return NextResponse.json({
      success: true,
      message: 'Warranty check completed successfully',
      summary,
    })
  } catch (error) {
    console.error('Warranty check cron job error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also allow POST requests for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
