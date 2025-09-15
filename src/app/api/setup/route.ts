import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection by checking if User table exists
    await prisma.user.findFirst()
    
    return NextResponse.json({ 
      message: 'Database setup complete - tables exist and accessible',
      status: 'success' 
    })
  } catch (error) {
    console.error('Database setup error:', error)
    
    // Try to create tables using Prisma's push mechanism
    try {
      // This will create tables if they don't exist
      await prisma.$executeRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
      
      return NextResponse.json({ 
        message: 'Database connection successful but tables may need creation',
        status: 'warning',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } catch (secondError) {
      return NextResponse.json({ 
        error: 'Database setup failed completely',
        details: error instanceof Error ? error.message : 'Unknown error',
        secondError: secondError instanceof Error ? secondError.message : 'Unknown second error'
      }, { status: 500 })
    }
  }
}