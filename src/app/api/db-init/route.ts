import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  try {
    // This will create all database tables based on the Prisma schema
    const { stdout, stderr } = await execAsync('npx prisma db push --force-reset')
    
    return NextResponse.json({ 
      message: 'Database tables created successfully',
      status: 'success',
      stdout,
      stderr
    })
  } catch (error) {
    console.error('Database initialization error:', error)
    return NextResponse.json({ 
      error: 'Database initialization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST method to initialize database',
    instructions: 'Send a POST request to this endpoint to create database tables'
  })
}