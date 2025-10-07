import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getLocalizedText } from '@/lib/utils/multilingual'

// GET - fetch all topics with student's status
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const language = (url.searchParams.get('lang') || 'en') as 'en' | 'uk'


    const topics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        keypoints: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { name: true }
        },
        prerequisites: {
          include: {
            prerequisite: {
              select: { id: true, name: true, slug: true, type: true }
            }
          }
        },
        studentTopics: {
          where: { userId: session.user.id },
          select: { status: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    const topicsWithStatus = topics.map(topic => ({
      ...topic,
      name: getLocalizedText(topic.name as any, language),
      localizedName: getLocalizedText(topic.name as any, language),
      description: getLocalizedText(topic.description as any, language),
      keypoints: getLocalizedText(topic.keypoints as any, language),
      status: topic.studentTopics[0]?.status || 'NOT_LEARNED',
      prerequisites: topic.prerequisites.map(p => ({
        ...p,
        prerequisite: {
          ...p.prerequisite,
          name: getLocalizedText(p.prerequisite.name as any, language),
          localizedName: getLocalizedText(p.prerequisite.name as any, language)
        }
      }))
    }))

    return NextResponse.json(topicsWithStatus)
  } catch (error) {
    console.error('Error fetching student topics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const updateStatusSchema = z.object({
  topicId: z.string().min(1),
  status: z.enum(['NOT_LEARNED', 'WANT_TO_LEARN', 'LEARNING', 'LEARNED'])
})

// POST - update topic status for student
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    const body = await request.json()
    const { topicId, status } = updateStatusSchema.parse(body)

    // Check if topic exists
    const topic = await prisma.topic.findUnique({
      where: { id: topicId }
    })

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }

    // Upsert student topic status
    const studentTopic = await prisma.studentTopic.upsert({
      where: {
        userId_topicId: {
          userId: session.user.id,
          topicId: topicId
        }
      },
      update: { status },
      create: {
        userId: session.user.id,
        topicId: topicId,
        status
      }
    })

    return NextResponse.json(studentTopic)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    
    // Handle Prisma foreign key constraint errors specifically
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      console.error('Foreign key constraint violation:', error)
      return NextResponse.json({ 
        error: 'Database constraint violation - user or topic may not exist'
      }, { status: 400 })
    }
    
    console.error('Error updating student topic status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}