import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getLocalizedText } from '@/lib/utils/multilingual'

const updateGoalTemplateSchema = z.object({
  goalTemplateId: z.string().min(1, 'Goal template ID is required'),
  name: z.string().min(1, 'Goal template name is required').max(200),
  description: z.string().optional(),
  motto: z.string().optional(),
  topicIds: z.array(z.string()).optional()
})

const createGoalTemplateSchema = z.object({
  name: z.string().min(1, 'Goal template name is required').max(200),
  description: z.string().optional(),
  motto: z.string().optional(),
  topicIds: z.array(z.string()).optional()
})

// GET - fetch goal templates for admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const language = (url.searchParams.get('lang') || 'en') as 'en' | 'uk'

    // Check if user is admin or editor
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'EDITOR') {
      return NextResponse.json({ error: 'Admin or Editor access required' }, { status: 403 })
    }

    const goalTemplates = await prisma.goalTemplate.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        motto: true,
        createdAt: true,
        updatedAt: true,
        author: {
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
            topics: true,
            goals: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Localize the text fields
    const localizedGoalTemplates = goalTemplates.map(template => ({
      ...template,
      name: getLocalizedText(template.name as any, language),
      localizedName: getLocalizedText(template.name as any, language),
      description: template.description ? getLocalizedText(template.description as any, language) : null,
      motto: template.motto ? getLocalizedText(template.motto as any, language) : null,
      topics: template.topics.map(tt => ({
        ...tt,
        topic: {
          ...tt.topic,
          name: getLocalizedText(tt.topic.name as any, language),
          localizedName: getLocalizedText(tt.topic.name as any, language)
        }
      }))
    }))

    return NextResponse.json(localizedGoalTemplates)
  } catch (error) {
    console.error('Error fetching goal templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - create new goal template (admin/editor only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or editor
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'EDITOR') {
      return NextResponse.json({ error: 'Admin or Editor access required' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, motto, topicIds } = createGoalTemplateSchema.parse(body)

    // Create goal template with topics in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const goalTemplate = await tx.goalTemplate.create({
        data: {
          name,
          description,
          motto,
          authorId: session.user.id
        }
      })

      // Add topics if provided
      if (topicIds && topicIds.length > 0) {
        await tx.goalTemplateTopic.createMany({
          data: topicIds.map(topicId => ({
            goalTemplateId: goalTemplate.id,
            topicId
          }))
        })
      }

      return goalTemplate
    })

    return NextResponse.json({
      message: `Goal template "${name}" created successfully`,
      goalTemplate: result
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error creating goal template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - update goal template (admin/editor only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or editor
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN' && user?.role !== 'EDITOR') {
      return NextResponse.json({ error: 'Admin or Editor access required' }, { status: 403 })
    }

    const body = await req.json()
    const { goalTemplateId, name, description, motto, topicIds } = updateGoalTemplateSchema.parse(body)

    // Check if goal template exists
    const existingTemplate = await prisma.goalTemplate.findUnique({
      where: { id: goalTemplateId },
      select: { id: true, name: true }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Goal template not found' }, { status: 404 })
    }

    // Update goal template with topics in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const goalTemplate = await tx.goalTemplate.update({
        where: { id: goalTemplateId },
        data: {
          name,
          description,
          motto
        }
      })

      // Update topics if provided
      if (topicIds !== undefined) {
        // Remove existing topics
        await tx.goalTemplateTopic.deleteMany({
          where: { goalTemplateId }
        })

        // Add new topics
        if (topicIds.length > 0) {
          await tx.goalTemplateTopic.createMany({
            data: topicIds.map(topicId => ({
              goalTemplateId,
              topicId
            }))
          })
        }
      }

      return goalTemplate
    })

    return NextResponse.json({
      message: `Goal template "${name}" updated successfully`,
      goalTemplate: result
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error updating goal template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}