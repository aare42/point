import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalizedText } from '@/lib/utils/multilingual'

export async function GET(request: NextRequest) {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    }

    // Test 1: Simple count (like analytics)
    try {
      const count = await prisma.topic.count()
      results.tests.simpleCount = { success: true, count, error: null }
    } catch (error) {
      results.tests.simpleCount = { 
        success: false, 
        count: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 2: Simple findMany without includes
    try {
      const topics = await prisma.topic.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          type: true
        },
        take: 3
      })
      results.tests.simpleFindMany = { 
        success: true, 
        count: topics.length, 
        sampleTopics: topics,
        error: null 
      }
    } catch (error) {
      results.tests.simpleFindMany = { 
        success: false, 
        count: 0, 
        sampleTopics: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 3: Complex query (like the actual API)
    try {
      const topics = await prisma.topic.findMany({
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          prerequisites: {
            include: {
              prerequisite: {
                select: { id: true, name: true, slug: true, type: true },
              },
            },
          },
          dependents: {
            include: {
              topic: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          _count: {
            select: {
              studentTopics: true,
              goalTopics: true,
              courseTopics: true,
              vacancyTopics: true,
              prerequisites: true,
              dependents: true,
            },
          },
        },
        take: 2
      })
      results.tests.complexQuery = { 
        success: true, 
        count: topics.length,
        sampleTopics: topics.map(t => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          type: t.type,
          hasAuthor: Boolean(t.author),
          prerequisitesCount: t.prerequisites.length,
          dependentsCount: t.dependents.length
        })),
        error: null 
      }
    } catch (error) {
      results.tests.complexQuery = { 
        success: false, 
        count: 0,
        sampleTopics: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 4: Localization function
    try {
      const sampleTopic = await prisma.topic.findFirst({
        select: { id: true, name: true, description: true, keypoints: true }
      })
      
      if (sampleTopic) {
        const localizedName = getLocalizedText(sampleTopic.name as any, 'en')
        const localizedDesc = getLocalizedText(sampleTopic.description as any, 'en')
        results.tests.localization = {
          success: true,
          originalName: sampleTopic.name,
          localizedName,
          originalDesc: sampleTopic.description,
          localizedDesc,
          error: null
        }
      } else {
        results.tests.localization = {
          success: false,
          error: 'No topics found for localization test'
        }
      }
    } catch (error) {
      results.tests.localization = { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 5: Database connection info
    results.tests.databaseInfo = {
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.substring(0, 50) + '...' : 'Not set'
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Debug topics error:', error)
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}