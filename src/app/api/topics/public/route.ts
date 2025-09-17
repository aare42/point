import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
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
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform to match the expected format for knowledge graph
    const transformedTopics = topics.map(topic => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      type: topic.type,
      description: topic.description,
      keypoints: topic.keypoints,
      status: 'NOT_LEARNED', // Default status for unauthenticated users
      prerequisites: topic.prerequisites
    }))

    return NextResponse.json(transformedTopics)
  } catch (error) {
    console.error('Error fetching public topics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    )
  }
}