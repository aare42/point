import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      databaseUrl: process.env.DATABASE_URL?.substring(0, 20) + '...',
      tests: {} as any
    }

    // Test 1: Simple count
    try {
      const topicCount = await prisma.topic.count()
      results.tests.topicCount = { success: true, count: topicCount }
    } catch (error) {
      results.tests.topicCount = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 2: Try to read topic data
    try {
      const sampleTopic = await prisma.topic.findFirst({
        select: {
          id: true,
          slug: true,
          name: true,
          type: true
        }
      })
      
      results.tests.sampleTopic = { 
        success: true, 
        topic: sampleTopic,
        nameType: typeof sampleTopic?.name
      }
    } catch (error) {
      results.tests.sampleTopic = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 3: Try to read all topics (minimal data)
    try {
      const topics = await prisma.topic.findMany({
        select: {
          slug: true,
          type: true
        },
        take: 5
      })
      
      results.tests.topicList = { 
        success: true, 
        count: topics.length,
        sample: topics
      }
    } catch (error) {
      results.tests.topicList = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Debug local error:', error)
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}