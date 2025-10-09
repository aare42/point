import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple health check that doesn't require database or authentication
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Point Educational Platform',
      version: process.env.npm_package_version || '1.0.0'
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}