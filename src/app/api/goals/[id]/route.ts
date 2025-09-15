import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().optional(),
  motto: z.string().optional(),
  deadline: z.string().optional(), // ISO date string or null to clear
  topicIds: z.array(z.string()).optional()
})

// GET /api/goals/[id] - Get specific goal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const goal = await prisma.goal.findFirst({
      where: { 
        id: resolvedParams.id,
        userId: session.user.id 
      },
      include: {
        topics: {
          include: {
            topic: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                description: true
              }
            }
          }
        }
      }
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    return NextResponse.json(goal)
  } catch (error) {
    console.error('Error fetching goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/goals/[id] - Update goal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = UpdateGoalSchema.parse(body)
    const resolvedParams = await params

    // Check if goal exists and belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: { 
        id: resolvedParams.id,
        userId: session.user.id 
      }
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
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

    // Prepare update data
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.motto !== undefined) updateData.motto = validatedData.motto
    if (validatedData.deadline !== undefined) {
      updateData.deadline = validatedData.deadline ? new Date(validatedData.deadline) : null
    }

    // Update goal with topics if provided
    const goal = await prisma.goal.update({
      where: { id: resolvedParams.id },
      data: {
        ...updateData,
        ...(validatedData.topicIds !== undefined && {
          topics: {
            deleteMany: {},
            create: validatedData.topicIds.map(topicId => ({
              topicId
            }))
          }
        })
      },
      include: {
        topics: {
          include: {
            topic: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                description: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(goal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/goals/[id] - Delete goal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params

    // Check if goal exists and belongs to user
    const existingGoal = await prisma.goal.findFirst({
      where: { 
        id: resolvedParams.id,
        userId: session.user.id 
      }
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    await prisma.goal.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}