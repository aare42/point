import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLocalizedText } from '@/lib/utils/multilingual'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasSession: Boolean(session),
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      } : null,
      tests: {} as any
    }

    // Test 1: Analytics query (works on production)
    try {
      const totalTopics = await prisma.topic.count()
      const topicsByType = await prisma.topic.groupBy({
        by: ['type'],
        _count: { type: true }
      })
      results.tests.analyticsQuery = { 
        success: true, 
        totalTopics,
        topicsByType,
        error: null 
      }
    } catch (error) {
      results.tests.analyticsQuery = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 2: Admin topics page query (fails on production)
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
        orderBy: { createdAt: 'desc' },
        take: 5 // Limit for debugging
      })
      
      results.tests.adminTopicsQuery = { 
        success: true, 
        count: topics.length,
        sampleTopics: topics.map(t => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          type: t.type,
          author: t.author?.email,
          hasValidData: Boolean(t.name && t.slug && t.type)
        })),
        error: null 
      }
    } catch (error) {
      results.tests.adminTopicsQuery = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 3: Knowledge graph query (fails on production)
    try {
      const topics = await prisma.topic.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          prerequisites: {
            select: {
              prerequisiteId: true,
              prerequisite: {
                select: { id: true, name: true, slug: true, type: true }
              }
            }
          },
          dependents: {
            select: {
              topicId: true,
              topic: {
                select: { id: true, name: true, slug: true, type: true }
              }
            }
          }
        }
      })
      
      results.tests.knowledgeGraphQuery = { 
        success: true, 
        count: topics.length,
        sampleTopics: topics.slice(0, 3).map(t => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          type: t.type,
          prerequisitesCount: t.prerequisites.length,
          dependentsCount: t.dependents.length
        })),
        error: null 
      }
    } catch (error) {
      results.tests.knowledgeGraphQuery = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 4: Check for data integrity issues
    try {
      const topicsWithoutNames = await prisma.topic.count({
        where: {
          name: null
        }
      })
      
      const topicsWithoutSlugs = await prisma.topic.count({
        where: {
          slug: null
        }
      })
      
      const topicsWithInvalidAuthors = await prisma.topic.count({
        where: {
          author: null
        }
      })

      results.tests.dataIntegrity = {
        success: true,
        topicsWithoutNames,
        topicsWithoutSlugs,
        topicsWithInvalidAuthors,
        error: null
      }
    } catch (error) {
      results.tests.dataIntegrity = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 5: Sample raw topic data
    try {
      const rawTopic = await prisma.topic.findFirst({
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          keypoints: true,
          description: true,
          authorId: true,
          createdAt: true
        }
      })
      
      results.tests.rawTopicData = {
        success: true,
        sampleTopic: rawTopic,
        error: null
      }
    } catch (error) {
      results.tests.rawTopicData = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Debug production error:', error)
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack?.substring(0, 1000) : undefined
    }, { status: 500 })
  }
}