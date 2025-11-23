import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalizedText } from '@/lib/utils/multilingual'

// GET - fetch all vacancies for public browsing
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const language = (url.searchParams.get('lang') || 'en') as 'en' | 'uk'

    const vacancies = await prisma.vacancy.findMany({
      where: {
        author: {
          isBlocked: false
        }
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            isBlocked: true
          }
        },
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
    console.error('Error fetching vacancies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}