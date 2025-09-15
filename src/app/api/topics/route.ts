import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createTopicSchema } from '@/lib/validations/topic'
import { withAuth } from '@/lib/auth/middleware'

export async function GET() {
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
    })

    return NextResponse.json(topics)
  } catch (error) {
    console.error('Error fetching topics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN', 'EDITOR'])
  if (authResult instanceof Response) return authResult

  try {
    const body = await req.json()
    const validatedData = createTopicSchema.parse(body)
    
    const { prerequisiteIds, ...topicData } = validatedData
    
    if (prerequisiteIds?.includes(undefined as any)) {
      return NextResponse.json(
        { error: 'Invalid prerequisite IDs' },
        { status: 400 }
      )
    }

    if (topicData.type === 'PROJECT' && prerequisiteIds && prerequisiteIds.length > 0) {
      const projectPrereqs = await prisma.topic.findMany({
        where: { 
          id: { in: prerequisiteIds },
          type: 'PROJECT' 
        }
      })
      
      if (projectPrereqs.length > 0) {
        return NextResponse.json(
          { error: 'PROJECT type topics cannot be prerequisites' },
          { status: 400 }
        )
      }
    }

    const existingTopic = await prisma.topic.findUnique({
      where: { slug: topicData.slug },
    })

    if (existingTopic) {
      return NextResponse.json(
        { error: 'Topic with this slug already exists' },
        { status: 400 }
      )
    }

    const topic = await prisma.topic.create({
      data: {
        ...topicData,
        authorId: authResult.sub!,
        prerequisites: prerequisiteIds
          ? {
              create: prerequisiteIds.map((prereqId) => ({
                prerequisiteId: prereqId,
              })),
            }
          : undefined,
      },
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
      },
    })

    return NextResponse.json(topic, { status: 201 })
  } catch (error) {
    console.error('Error creating topic:', error)
    if (error instanceof Error && 'code' in error) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    )
  }
}