import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLocalizedText } from '@/lib/utils/multilingual'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const language = (url.searchParams.get('lang') || 'en') as 'en' | 'uk'
    
    const topics = await prisma.topic.findMany({
      include: {
        prerequisites: {
          include: {
            prerequisite: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true
              }
            }
          }
        }
      }
    })

    // Transform to match the expected format for knowledge graph
    const transformedTopics = topics.map(topic => ({
      id: topic.id,
      name: getLocalizedText(topic.name as any, language),
      slug: topic.slug,
      type: topic.type,
      description: getLocalizedText(topic.description as any, language),
      keypoints: getLocalizedText(topic.keypoints as any, language),
      status: 'NOT_LEARNED', // Default status for unauthenticated users
      prerequisites: topic.prerequisites.map(p => ({
        ...p,
        prerequisite: {
          ...p.prerequisite,
          name: getLocalizedText(p.prerequisite.name as any, language)
        }
      }))
    }))

    // Sort by localized name
    transformedTopics.sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(transformedTopics)
  } catch (error) {
    console.error('Error fetching public topics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    )
  }
}