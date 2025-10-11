import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      tests: {} as any
    }

    // Test 1: Simple topic query (we know this works)
    try {
      const topicCount = await prisma.topic.count()
      results.tests.simpleTopicCount = { success: true, count: topicCount }
    } catch (error) {
      results.tests.simpleTopicCount = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 2: Topics without any includes
    try {
      const topics = await prisma.topic.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          authorId: true
        },
        take: 3
      })
      results.tests.topicsBasicQuery = { 
        success: true, 
        count: topics.length,
        sample: topics
      }
    } catch (error) {
      results.tests.topicsBasicQuery = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 3: Topics with author relationship
    try {
      const topics = await prisma.topic.findMany({
        include: {
          author: {
            select: { id: true, name: true, email: true }
          }
        },
        take: 2
      })
      results.tests.topicsWithAuthor = { 
        success: true, 
        count: topics.length,
        sample: topics.map(t => ({
          id: t.id,
          name: t.name,
          author: t.author?.email || 'null'
        }))
      }
    } catch (error) {
      results.tests.topicsWithAuthor = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 4: Topics with prerequisites relationship
    try {
      const topics = await prisma.topic.findMany({
        include: {
          prerequisites: {
            include: {
              prerequisite: {
                select: { id: true, name: true, slug: true }
              }
            }
          }
        },
        take: 2
      })
      results.tests.topicsWithPrerequisites = { 
        success: true, 
        count: topics.length,
        sample: topics.map(t => ({
          id: t.id,
          name: t.name,
          prerequisitesCount: t.prerequisites.length
        }))
      }
    } catch (error) {
      results.tests.topicsWithPrerequisites = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 5: Check if related tables exist
    try {
      const userCount = await prisma.user.count()
      const prerequisiteCount = await prisma.topicPrerequisite.count()
      results.tests.relatedTables = {
        success: true,
        userCount,
        prerequisiteCount
      }
    } catch (error) {
      results.tests.relatedTables = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Debug relationships error:', error)
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack?.substring(0, 1000) : undefined
    }, { status: 500 })
  }
}