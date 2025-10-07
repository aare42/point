import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getLocalizedText } from '@/lib/utils/multilingual'

// GET - fetch all goal templates (public endpoint)
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const language = (url.searchParams.get('lang') || 'en') as 'en' | 'uk'

    const goalTemplates = await prisma.goalTemplate.findMany({
      include: {
        author: {
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
          select: { topics: true, goals: true }
        }
      },
      orderBy: { createdAt: 'desc' }
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

const createGoalTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  motto: z.string().optional(),
  topicIds: z.array(z.string()).min(1, 'At least one topic is required')
})

// POST - create a goal template (admin/educator only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins and educators can create goal templates
    if (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createGoalTemplateSchema.parse(body)

    // Verify all topics exist
    const topics = await prisma.topic.findMany({
      where: { id: { in: validatedData.topicIds } }
    })

    if (topics.length !== validatedData.topicIds.length) {
      return NextResponse.json({ error: 'Some topics do not exist' }, { status: 400 })
    }

    // Create goal template with topics
    const goalTemplate = await prisma.goalTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        motto: validatedData.motto,
        authorId: session.user.id,
        topics: {
          create: validatedData.topicIds.map(topicId => ({
            topicId
          }))
        }
      },
      include: {
        author: {
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
          select: { topics: true, goals: true }
        }
      }
    })

    return NextResponse.json(goalTemplate, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 })
    }
    
    console.error('Error creating goal template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}