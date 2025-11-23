import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getLocalizedText } from '@/lib/utils/multilingual'

const CreateGoalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  motto: z.string().optional(),
  deadline: z.string().optional(), // ISO date string
  goalTemplateId: z.string().optional(), // If creating from template
  topicIds: z.array(z.string()).optional().default([])
})

const UpdateGoalSchema = CreateGoalSchema.partial()

// GET /api/goals - List user's goals (authentication required) or browse goals (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const language = (searchParams.get('lang') || 'en') as 'en' | 'uk'
    const browse = searchParams.get('browse') === 'true'

    // If browsing, return goal templates for employers to see what students are learning
    if (browse) {
      const goalTemplates = await prisma.goalTemplate.findMany({
        where: {
          author: {
            isBlocked: false
          }
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, isBlocked: true }
          },
          topics: {
            include: {
              topic: {
                select: { id: true, name: true, slug: true, type: true }
              }
            }
          },
          _count: {
            select: { topics: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      // Convert to goal-like format and localize the text fields  
      const localizedTemplates = goalTemplates.map(template => ({
        id: template.id,
        name: getLocalizedText(template.name as any, language),
        localizedName: getLocalizedText(template.name as any, language),
        description: template.description ? getLocalizedText(template.description as any, language) : null,
        motto: template.motto ? getLocalizedText(template.motto as any, language) : null,
        deadline: null, // Templates don't have deadlines
        createdAt: template.createdAt,
        user: template.author, // Use author as "user" for compatibility
        topics: template.topics.map(gt => ({
          topic: {
            ...gt.topic,
            name: getLocalizedText(gt.topic.name as any, language),
            localizedName: getLocalizedText(gt.topic.name as any, language)
          }
        })),
        _count: template._count
      }))

      return NextResponse.json(localizedTemplates)
    }

    // Regular user goals functionality
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return user's goals with detailed info including template reference
    const goals = await prisma.goal.findMany({
      where: { userId: session.user.id },
      include: {
        goalTemplate: {
          select: {
            id: true,
            name: true,
            author: {
              select: { name: true }
            }
          }
        },
        topics: {
          include: {
            topic: {
              include: {
                studentTopics: {
                  where: { userId: session.user.id },
                  select: { status: true }
                }
              }
            }
          }
        },
        _count: {
          select: { topics: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Localize the text fields
    const localizedGoals = goals.map(goal => ({
      ...goal,
      name: getLocalizedText(goal.name as any, language),
      description: goal.description ? getLocalizedText(goal.description as any, language) : null,
      motto: goal.motto ? getLocalizedText(goal.motto as any, language) : null,
      goalTemplate: goal.goalTemplate ? {
        ...goal.goalTemplate,
        name: getLocalizedText(goal.goalTemplate.name as any, language)
      } : null,
      topics: goal.topics.map(gt => ({
        ...gt,
        topic: {
          ...gt.topic,
          name: getLocalizedText(gt.topic.name as any, language),
          localizedName: getLocalizedText(gt.topic.name as any, language)
        }
      }))
    }))

    return NextResponse.json(localizedGoals)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/goals - Create new goal (optionally from template)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateGoalSchema.parse(body)

    let finalTopicIds = validatedData.topicIds
    let templateData = null

    // If creating from template, get template data
    if (validatedData.goalTemplateId) {
      const template = await prisma.goalTemplate.findUnique({
        where: { id: validatedData.goalTemplateId },
        include: {
          topics: {
            select: { topicId: true }
          }
        }
      })

      if (!template) {
        return NextResponse.json({ error: 'Goal template not found' }, { status: 404 })
      }

      templateData = template
      // Use template topics if no topics specified
      if (finalTopicIds.length === 0) {
        finalTopicIds = template.topics.map(t => t.topicId)
      }
    }

    // Verify all topic IDs exist
    if (finalTopicIds.length > 0) {
      const existingTopics = await prisma.topic.findMany({
        where: { id: { in: finalTopicIds } },
        select: { id: true }
      })

      if (existingTopics.length !== finalTopicIds.length) {
        return NextResponse.json({ error: 'Some topics do not exist' }, { status: 400 })
      }
    }

    const goal = await prisma.goal.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        motto: validatedData.motto,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        goalTemplateId: validatedData.goalTemplateId,
        userId: session.user.id,
        topics: {
          create: finalTopicIds.map(topicId => ({
            topicId
          }))
        }
      },
      include: {
        goalTemplate: {
          select: {
            id: true,
            name: true,
            author: {
              select: { name: true }
            }
          }
        },
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

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 })
    }
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}