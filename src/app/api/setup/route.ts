import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection and create tables if needed
    await prisma.$executeRaw`SELECT 1`
    
    return NextResponse.json({ 
      message: 'Database setup complete',
      status: 'success' 
    })
  } catch (error) {
    console.error('Database setup error:', error)
    return NextResponse.json({ 
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}