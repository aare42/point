import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getLocalizedText } from '@/lib/utils/multilingual'

const UpdateCourseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long').optional(),
  description: z.string().optional(),
  topicIds: z.array(z.string()).optional()
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const url = new URL(req.url)
    const language = (url.searchParams.get('lang') || 'en') as 'en' | 'uk'
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        educator: {
          select: { id: true, name: true, email: true },
        },
        topics: {
          include: {
            topic: {
              select: { id: true, name: true, slug: true, type: true, description: true },
            },
          },
        },
        enrollments: {
          include: {
            student: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: {
            topics: true,
            enrollments: true,
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Localize the text fields
    const localizedCourse = {
      ...course,
      name: getLocalizedText(course.name as any, language),
      localizedName: getLocalizedText(course.name as any, language),
      description: course.description ? getLocalizedText(course.description as any, language) : null,
      topics: course.topics.map(ct => ({
        ...ct,
        topic: {
          ...ct.topic,
          name: getLocalizedText(ct.topic.name as any, language),
          localizedName: getLocalizedText(ct.topic.name as any, language),
          description: ct.topic.description ? getLocalizedText(ct.topic.description as any, language) : null
        }
      }))
    }

    return NextResponse.json(localizedCourse)
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const validatedData = UpdateCourseSchema.parse(body)

    const existingCourse = await prisma.course.findUnique({
      where: { id },
      select: { educatorId: true }
    })

    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (existingCourse.educatorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this course' }, { status: 403 })
    }

    // Verify all topic IDs exist if provided
    if (validatedData.topicIds && validatedData.topicIds.length > 0) {
      const existingTopics = await prisma.topic.findMany({
        where: { id: { in: validatedData.topicIds } },
        select: { id: true }
      })

      if (existingTopics.length !== validatedData.topicIds.length) {
        return NextResponse.json({ error: 'Some topics do not exist' }, { status: 400 })
      }
    }

    const course = await prisma.$transaction(async (tx) => {
      // Update topics if provided
      if (validatedData.topicIds !== undefined) {
        await tx.courseTopic.deleteMany({
          where: { courseId: id },
        })

        if (validatedData.topicIds.length > 0) {
          await tx.courseTopic.createMany({
            data: validatedData.topicIds.map((topicId) => ({
              courseId: id,
              topicId: topicId,
            })),
          })
        }
      }

      return tx.course.update({
        where: { id },
        data: {
          name: validatedData.name,
          description: validatedData.description,
        },
        include: {
          educator: {
            select: { id: true, name: true, email: true },
          },
          topics: {
            include: {
              topic: {
                select: { id: true, name: true, slug: true, type: true },
              },
            },
          },
          _count: {
            select: { topics: true, enrollments: true }
          }
        },
      })
    })

    return NextResponse.json(course)
  } catch (error) {
    console.error('Error updating course:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const course = await prisma.course.findUnique({
      where: { id },
      select: { 
        educatorId: true,
        _count: {
          select: { enrollments: true }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (course.educatorId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this course' }, { status: 403 })
    }

    if (course._count.enrollments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete course with enrolled students' },
        { status: 400 }
      )
    }

    await prisma.course.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    )
  }
}