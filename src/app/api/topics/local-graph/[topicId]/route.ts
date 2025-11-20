import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLocalizedText } from '@/lib/utils/multilingual'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { topicId } = await params
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('lang') || 'uk'

    // Get center topic with its direct prerequisites and effects
    const centerTopic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: {
        author: {
          select: { name: true, email: true }
        },
        // Direct prerequisites (topics this one depends on)
        prerequisites: {
          include: {
            prerequisite: {
              include: {
                author: {
                  select: { name: true, email: true }
                },
                // Count further prerequisites for expansion badges
                prerequisites: {
                  select: { id: true }
                },
                // Count effects for expansion badges
                dependents: {
                  select: { id: true }
                }
              }
            }
          }
        },
        // Direct effects (topics that depend on this one)
        dependents: {
          include: {
            topic: {
              include: {
                author: {
                  select: { name: true, email: true }
                },
                // Count further prerequisites for expansion badges
                prerequisites: {
                  select: { id: true }
                },
                // Count effects for expansion badges
                dependents: {
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    })

    if (!centerTopic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      )
    }

    // Get user's topic statuses if authenticated
    let userStatuses: Record<string, string> = {}
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })

      if (user) {
        const allTopicIds = [
          centerTopic.id,
          ...centerTopic.prerequisites.map(p => p.prerequisite.id),
          ...centerTopic.dependents.map(d => d.topic.id)
        ]

        const statusRecords = await prisma.studentTopic.findMany({
          where: {
            userId: user.id,
            topicId: { in: allTopicIds }
          },
          select: {
            topicId: true,
            status: true
          }
        })

        userStatuses = statusRecords.reduce((acc, record) => {
          acc[record.topicId] = record.status
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Transform data for local graph
    const transformTopic = (topic: any) => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      type: topic.type,
      description: topic.description,
      keypoints: topic.keypoints,
      author: topic.author,
      status: userStatuses[topic.id] || 'NOT_LEARNED',
      // Expansion counts for badges
      prerequisiteCount: topic.prerequisites?.length || 0,
      effectCount: topic.dependents?.length || 0
    })

    // Build response data
    const localGraphData = {
      center: transformTopic(centerTopic),
      prerequisites: centerTopic.prerequisites.map(p => transformTopic(p.prerequisite)),
      effects: centerTopic.dependents.map(d => transformTopic(d.topic)),
      // Create links for the local graph
      links: [
        // Prerequisites → Center
        ...centerTopic.prerequisites.map(p => ({
          source: p.prerequisite.id,
          target: centerTopic.id,
          value: 1
        })),
        // Center → Effects
        ...centerTopic.dependents.map(d => ({
          source: centerTopic.id,
          target: d.topic.id,
          value: 1
        }))
      ]
    }

    return NextResponse.json(localGraphData)

  } catch (error) {
    console.error('Error fetching local graph data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get expansion data for a specific topic (when user expands)
export async function POST(
  request: NextRequest,
  { params }: { params: { topicId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { expandTopicId, expandDirection } = await request.json()
    
    if (!expandTopicId || !expandDirection || !['prerequisites', 'effects'].includes(expandDirection)) {
      return NextResponse.json(
        { error: 'Invalid expand parameters' },
        { status: 400 }
      )
    }

    // Get expansion data for the specified topic
    let expansionData: any[] = []
    
    if (expandDirection === 'prerequisites') {
      // Get prerequisites of the expandTopicId
      const topicWithPrereqs = await prisma.topic.findUnique({
        where: { id: expandTopicId },
        include: {
          prerequisites: {
            include: {
              prerequisite: {
                include: {
                  author: {
                    select: { name: true, email: true }
                  },
                  prerequisites: {
                    select: { id: true }
                  },
                  dependents: {
                    select: { id: true }
                  }
                }
              }
            }
          }
        }
      })
      
      expansionData = topicWithPrereqs?.prerequisites.map(p => p.prerequisite) || []
    } else {
      // Get effects of the expandTopicId
      const topicWithEffects = await prisma.topic.findUnique({
        where: { id: expandTopicId },
        include: {
          dependents: {
            include: {
              topic: {
                include: {
                  author: {
                    select: { name: true, email: true }
                  },
                  prerequisites: {
                    select: { id: true }
                  },
                  dependents: {
                    select: { id: true }
                  }
                }
              }
            }
          }
        }
      })
      
      expansionData = topicWithEffects?.dependents.map(d => d.topic) || []
    }

    // Get user statuses for new topics
    let userStatuses: Record<string, string> = {}
    if (session?.user?.email && expansionData.length > 0) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })

      if (user) {
        const topicIds = expansionData.map(t => t.id)
        const statusRecords = await prisma.studentTopic.findMany({
          where: {
            userId: user.id,
            topicId: { in: topicIds }
          },
          select: {
            topicId: true,
            status: true
          }
        })

        userStatuses = statusRecords.reduce((acc, record) => {
          acc[record.topicId] = record.status
          return acc
        }, {} as Record<string, string>)
      }
    }

    // Transform expansion data
    const transformedExpansion = expansionData.map(topic => ({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      type: topic.type,
      description: topic.description,
      keypoints: topic.keypoints,
      author: topic.author,
      status: userStatuses[topic.id] || 'NOT_LEARNED',
      prerequisiteCount: topic.prerequisites?.length || 0,
      effectCount: topic.dependents?.length || 0
    }))

    // Create new links for expansion
    const newLinks = transformedExpansion.map(topic => ({
      source: expandDirection === 'prerequisites' ? topic.id : expandTopicId,
      target: expandDirection === 'prerequisites' ? expandTopicId : topic.id,
      value: 1
    }))

    return NextResponse.json({
      topics: transformedExpansion,
      links: newLinks,
      expandedFrom: expandTopicId,
      direction: expandDirection
    })

  } catch (error) {
    console.error('Error fetching expansion data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}