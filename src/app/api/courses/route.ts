import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getLocalizedText } from '@/lib/utils/multilingual'

const CreateCourseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  topicIds: z.array(z.string()).optional().default([])
})

// GET /api/courses - List courses (optionally filtered by educator)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const educatorId = searchParams.get('educatorId')
    const language = (searchParams.get('lang') || 'en') as 'en' | 'uk'

    // For educator-specific queries, require authentication
    if (educatorId && !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courses = await prisma.course.findMany({
      where: educatorId ? { educatorId } : { isPublic: true },
      include: {
        educator: {
          select: { id: true, name: true, email: true }
        },
        topics: {
          include: {
            topic: {
              select: { id: true, name: true, slug: true, type: true }
            }
          }
        },
        _count: {
          select: { topics: true, enrollments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Localize the text fields
    const localizedCourses = courses.map(course => ({
      ...course,
      name: getLocalizedText(course.name as any, language),
      description: course.description ? getLocalizedText(course.description as any, language) : null,
      topics: course.topics.map(ct => ({
        ...ct,
        topic: {
          ...ct.topic,
          name: getLocalizedText(ct.topic.name as any, language)
        }
      }))
    }))

    return NextResponse.json(localizedCourses)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/courses - Create new course
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateCourseSchema.parse(body)

    // Verify all topic IDs exist
    if (validatedData.topicIds.length > 0) {
      const existingTopics = await prisma.topic.findMany({
        where: { id: { in: validatedData.topicIds } },
        select: { id: true }
      })

      if (existingTopics.length !== validatedData.topicIds.length) {
        return NextResponse.json({ error: 'Some topics do not exist' }, { status: 400 })
      }
    }

    const course = await prisma.course.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        isPublic: validatedData.isPublic,
        educatorId: session.user.id,
        topics: {
          create: validatedData.topicIds.map(topicId => ({
            topicId
          }))
        }
      },
      include: {
        educator: {
          select: { id: true, name: true, email: true }
        },
        topics: {
          include: {
            topic: {
              select: { id: true, name: true, slug: true, type: true }
            }
          }
        },
        _count: {
          select: { topics: true, enrollments: true }
        }
      }
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Error creating course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}