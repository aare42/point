import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateGoalSchema = z.object({
  goalId: z.string().min(1, 'Goal ID is required'),
  name: z.string().min(1, 'Goal name is required').max(200),
  description: z.string().optional(),
  motto: z.string().optional(),
  deadline: z.string().optional(),
  topicIds: z.array(z.string()).optional()
})

const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required').max(200),
  description: z.string().optional(),
  motto: z.string().optional(),
  deadline: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
  userId: z.string().min(1, 'User ID is required'),
  topicIds: z.array(z.string()).optional()
})

// GET - fetch goals for admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const goals = await prisma.goal.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        motto: true,
        deadline: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        topics: {
          select: {
            topic: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        _count: {
          select: {
            topics: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - create new goal (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, motto, deadline, isPublic, userId, topicIds } = createGoalSchema.parse(body)

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create goal with topics in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.create({
        data: {
          name,
          description,
          motto,
          deadline: deadline ? new Date(deadline) : null,
          userId
        }
      })

      // Add topics if provided
      if (topicIds && topicIds.length > 0) {
        await tx.goalTopic.createMany({
          data: topicIds.map(topicId => ({
            goalId: goal.id,
            topicId
          }))
        })
      }

      return goal
    })

    return NextResponse.json({
      message: `Goal "${name}" created successfully for ${targetUser.name || targetUser.email}`,
      goal: result
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - update goal (admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { goalId, name, description, motto, deadline, topicIds } = updateGoalSchema.parse(body)

    // Check if goal exists
    const existingGoal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { id: true, name: true }
    })

    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Update goal with topics in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.update({
        where: { id: goalId },
        data: {
          name,
          description,
          motto,
          deadline: deadline ? new Date(deadline) : null
        }
      })

      // Update topics if provided
      if (topicIds !== undefined) {
        // Remove existing topics
        await tx.goalTopic.deleteMany({
          where: { goalId }
        })

        // Add new topics
        if (topicIds.length > 0) {
          await tx.goalTopic.createMany({
            data: topicIds.map(topicId => ({
              goalId,
              topicId
            }))
          })
        }
      }

      return goal
    })

    return NextResponse.json({
      message: `Goal "${name}" updated successfully`,
      goal: result
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error updating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}