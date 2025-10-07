import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createMultilingualText } from '@/lib/utils/multilingual'

const createVacancySchema = z.object({
  name: z.string().min(1, 'Vacancy name is required').max(200),
  topicIds: z.array(z.string()).optional()
})

// GET - fetch all vacancies for admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, email: true }
    })

    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email) 
    console.log('Database user found:', user)
    console.log('User role:', user?.role)

    if (!['ADMIN', 'EDITOR'].includes(user?.role || '')) {
      console.log('Access denied for user:', session.user.email, 'with role:', user?.role)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const vacancies = await prisma.vacancy.findMany({
      include: {
        author: {
          select: {
            name: true,
            email: true
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

    return NextResponse.json(vacancies)
  } catch (error) {
    console.error('Error fetching vacancies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - create new vacancy (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, email: true }
    })

    console.log('Session user ID:', session.user.id)
    console.log('Session user email:', session.user.email) 
    console.log('Database user found:', user)
    console.log('User role:', user?.role)

    if (!['ADMIN', 'EDITOR'].includes(user?.role || '')) {
      console.log('Access denied for user:', session.user.email, 'with role:', user?.role)
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { name, topicIds } = createVacancySchema.parse(body)

    // Create vacancy in a transaction
    const vacancy = await prisma.$transaction(async (tx) => {
      // Create vacancy with multilingual name
      const newVacancy = await tx.vacancy.create({
        data: {
          name: JSON.stringify(createMultilingualText(name)),
          authorId: session.user.id
        }
      })

      // Add topic connections if provided
      if (topicIds && topicIds.length > 0) {
        await tx.vacancyTopic.createMany({
          data: topicIds.map(topicId => ({
            vacancyId: newVacancy.id,
            topicId
          }))
        })
      }

      return newVacancy
    })

    return NextResponse.json(vacancy, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error creating vacancy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}