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

    // Get topic counts and samples
    const totalTopics = await prisma.topic.count()
    const topicsByType = await prisma.topic.groupBy({
      by: ['type'],
      _count: { type: true }
    })

    // Get sample topics with details
    const sampleTopics = await prisma.topic.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        authorId: true,
        createdAt: true,
        author: {
          select: {
            email: true,
            name: true
          }
        },
        _count: {
          select: {
            prerequisites: true,
            dependents: true,
            studentTopics: true,
            courseTopics: true
          }
        }
      }
    })

    // Check for duplicate slugs (shouldn't exist due to unique constraint)
    const duplicateSlugs = await prisma.topic.groupBy({
      by: ['slug'],
      _count: { slug: true },
      having: {
        slug: {
          _count: {
            gt: 1
          }
        }
      }
    })

    // Get prerequisites count
    const prerequisitesCount = await prisma.topicPrerequisite.count()

    // Get orphaned topics (topics with no prerequisites and no dependents)
    const orphanedTopics = await prisma.topic.findMany({
      where: {
        AND: [
          { prerequisites: { none: {} } },
          { dependents: { none: {} } }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true
      },
      take: 5
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalTopics,
        prerequisitesCount,
        topicsByType: topicsByType.reduce((acc, item) => {
          acc[item.type] = item._count.type
          return acc
        }, {}),
        duplicateSlugs: duplicateSlugs.length,
        orphanedTopics: orphanedTopics.length
      },
      sampleTopics,
      orphanedTopics,
      duplicateSlugs,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.substring(0, 30) + '...' : 'Not set'
      }
    })

  } catch (error) {
    console.error('Topics status error:', error)
    return NextResponse.json({
      success: false,
      error: `Topics status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}