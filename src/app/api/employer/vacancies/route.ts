import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLocalizedText } from '@/lib/utils/multilingual'

// POST - create new vacancy
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, topicIds } = await req.json()

    if (!name || !Array.isArray(topicIds) || topicIds.length === 0) {
      return NextResponse.json({ error: 'Name and topic IDs are required' }, { status: 400 })
    }

    // Create vacancy with topic connections
    const vacancy = await prisma.vacancy.create({
      data: {
        name,
        authorId: session.user.id,
        topics: {
          create: topicIds.map((topicId: string) => ({
            topicId
          }))
        }
      },
      include: {
        topics: {
          include: {
            topic: true
          }
        }
      }
    })

    return NextResponse.json(vacancy)
  } catch (error) {
    console.error('Error creating vacancy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - fetch employer's vacancies
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const language = (url.searchParams.get('lang') || 'en') as 'en' | 'uk'

    const vacancies = await prisma.vacancy.findMany({
      where: {
        authorId: session.user.id
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        topics: {
          select: {
            topic: {
              select: {
                id: true,
                name: true,
                slug: true,
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

    // Localize the text fields
    const localizedVacancies = vacancies.map(vacancy => ({
      ...vacancy,
      name: getLocalizedText(vacancy.name as any, language),
      localizedName: getLocalizedText(vacancy.name as any, language),
      topics: vacancy.topics.map(vt => ({
        ...vt,
        topic: {
          ...vt.topic,
          name: getLocalizedText(vt.topic.name as any, language),
          localizedName: getLocalizedText(vt.topic.name as any, language)
        }
      }))
    }))

    return NextResponse.json(localizedVacancies)
  } catch (error) {
    console.error('Error fetching employer vacancies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}