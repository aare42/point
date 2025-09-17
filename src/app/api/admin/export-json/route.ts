import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const timestamp = new Date().toISOString()

    // Create backup object
    const backup = {
      timestamp,
      source: 'web-export',
      version: '1.0.0',
      data: {} as any
    }

    // Export all tables
    const tables = [
      'user',
      'topic', 
      'topicPrerequisite',
      'studentTopic',
      'course',
      'courseEnrollment',
      'courseTopic',
      'goal',
      'goalTopic',
      'goalTemplate',
      'goalTemplateTopic',
      'vacancy',
      'vacancyTopic'
    ]

    for (const table of tables) {
      try {
        const data = await (prisma as any)[table].findMany()
        backup.data[table] = data
      } catch (error) {
        console.warn(`Failed to export ${table}:`, error)
        backup.data[table] = []
      }
    }

    // Return as downloadable JSON file
    const jsonString = JSON.stringify(backup, null, 2)
    
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="database-backup-${timestamp.replace(/[:.]/g, '-')}.json"`,
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}