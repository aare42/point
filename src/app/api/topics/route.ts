import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createTopicSchema } from '@/lib/validations/topic'
import { withAuth } from '@/lib/auth/middleware'
import { getLocalizedText } from '@/lib/utils/multilingual'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const language = (url.searchParams.get('lang') || 'en') as 'en' | 'uk'
    
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

    // Transform topics to include localized text
    const localizedTopics = topics.map(topic => ({
      ...topic,
      name: topic.name,
      description: topic.description,
      keypoints: topic.keypoints,
      localizedName: getLocalizedText(topic.name as any, language),
      localizedDescription: getLocalizedText(topic.description as any, language),
      localizedKeypoints: getLocalizedText(topic.keypoints as any, language),
      prerequisites: topic.prerequisites.map(p => ({
        ...p,
        prerequisite: {
          ...p.prerequisite,
          localizedName: getLocalizedText(p.prerequisite.name as any, language)
        }
      })),
      dependents: topic.dependents.map(d => ({
        ...d,
        topic: {
          ...d.topic,
          localizedName: getLocalizedText(d.topic.name as any, language)
        }
      }))
    }))

    return NextResponse.json(localizedTopics)
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
    
    // Convert plain strings to multilingual format for database storage
    const convertToMultilingual = (value: string | Record<string, string>) => {
      if (typeof value === 'string') {
        return JSON.stringify({ uk: value })
      }
      return JSON.stringify(value)
    }
    
    const dbTopicData = {
      ...topicData,
      name: convertToMultilingual(topicData.name as any),
      description: topicData.description ? convertToMultilingual(topicData.description as any) : null,
      keypoints: convertToMultilingual(topicData.keypoints as any)
    }
    
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
      where: { slug: dbTopicData.slug },
    })

    if (existingTopic) {
      return NextResponse.json(
        { error: 'Topic with this slug already exists' },
        { status: 400 }
      )
    }

    const topic = await prisma.topic.create({
      data: {
        ...dbTopicData,
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
    
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      console.error('Zod validation error:', (error as any).errors)
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: (error as any).errors,
          message: 'Please check your input data'
        },
        { status: 400 }
      )
    }
    
    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma error:', error)
      const prismaError = error as any
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: 'A topic with this slug already exists' },
          { status: 400 }
        )
      }
      
      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid prerequisite ID provided' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: prismaError.message,
          code: prismaError.code 
        },
        { status: 400 }
      )
    }
    
    // Generic error
    return NextResponse.json(
      { 
        error: 'Failed to create topic',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}