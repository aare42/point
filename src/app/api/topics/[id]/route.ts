import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateTopicSchema } from '@/lib/validations/topic'
import { withAuth } from '@/lib/auth/middleware'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const topic = await prisma.topic.findUnique({
      where: { id },
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
              select: { id: true, name: true, slug: true, type: true },
            },
          },
        },
        _count: {
          select: {
            studentTopics: true,
            goalTopics: true,
          },
        },
      },
    })

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    return NextResponse.json(topic)
  } catch (error) {
    console.error('Error fetching topic:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topic' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withAuth(req, ['ADMIN', 'EDITOR'])
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const body = await req.json()
    const validatedData = updateTopicSchema.parse({ ...body, id })
    
    const { id: topicId, prerequisiteIds, ...updateData } = validatedData

    const existingTopic = await prisma.topic.findUnique({
      where: { id },
    })

    if (!existingTopic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    if (updateData.slug && updateData.slug !== existingTopic.slug) {
      const slugExists = await prisma.topic.findUnique({
        where: { slug: updateData.slug },
      })
      if (slugExists) {
        return NextResponse.json(
          { error: 'Topic with this slug already exists' },
          { status: 400 }
        )
      }
    }

    const topic = await prisma.$transaction(async (tx) => {
      if (prerequisiteIds !== undefined) {
        await tx.topicPrerequisite.deleteMany({
          where: { topicId: id },
        })

        if (prerequisiteIds.length > 0) {
          if (prerequisiteIds.includes(id)) {
            throw new Error('Topic cannot be a prerequisite of itself')
          }

          await tx.topicPrerequisite.createMany({
            data: prerequisiteIds.map((prereqId) => ({
              topicId: id,
              prerequisiteId: prereqId,
            })),
          })
        }
      }

      return tx.topic.update({
        where: { id },
        data: updateData,
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
    })

    return NextResponse.json(topic)
  } catch (error) {
    console.error('Error updating topic:', error)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update topic' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withAuth(req, ['ADMIN'])
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            studentTopics: true,
            goalTopics: true,
                        dependents: true,
          },
        },
      },
    })

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    const hasUsage = topic._count.studentTopics > 0 || 
                     topic._count.goalTopics > 0 || 
                     topic._count.dependents > 0

    if (hasUsage) {
      return NextResponse.json(
        { error: 'Cannot delete topic that is being used in goals, courses, or as a prerequisite' },
        { status: 400 }
      )
    }

    await prisma.topic.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Topic deleted successfully' })
  } catch (error) {
    console.error('Error deleting topic:', error)
    return NextResponse.json(
      { error: 'Failed to delete topic' },
      { status: 500 }
    )
  }
}