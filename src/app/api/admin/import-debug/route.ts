import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMultilingualText } from '@/lib/utils/multilingual'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    // Validate JSON structure
    if (!data.data || typeof data.data !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON format - missing data object' }, { status: 400 })
    }

    const debugInfo = {
      importStarted: new Date().toISOString(),
      currentUser: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role
      },
      dataStructure: {
        hasTopics: Boolean(data.data.topic),
        topicsCount: Array.isArray(data.data.topic) ? data.data.topic.length : 0,
        hasUsers: Boolean(data.data.user),
        usersCount: Array.isArray(data.data.user) ? data.data.user.length : 0,
        availableTables: Object.keys(data.data)
      },
      databaseBefore: {
        topics: await prisma.topic.count(),
        users: await prisma.user.count()
      }
    }

    // Process first 3 topics for debugging
    const topicResults = []
    if (data.data.topic && Array.isArray(data.data.topic)) {
      const topicsToProcess = data.data.topic.slice(0, 3) // Only process first 3 for debugging
      
      for (const topic of topicsToProcess) {
        const topicDebug: any = {
          originalSlug: topic.slug,
          originalName: topic.name,
          nameType: typeof topic.name,
          hasDescription: Boolean(topic.description),
          hasKeypoints: Boolean(topic.keypoints),
          type: topic.type,
          authorId: topic.authorId
        }

        try {
          // Check if topic already exists
          const existingTopic = await prisma.topic.findUnique({
            where: { slug: topic.slug }
          })
          
          if (existingTopic) {
            topicDebug.status = 'already_exists'
            topicDebug.existingId = existingTopic.id
          } else {
            // Transform topic data
            const transformedTopic = {
              ...topic,
              name: typeof topic.name === 'string' 
                ? createMultilingualText(topic.name) 
                : topic.name,
              description: topic.description 
                ? (typeof topic.description === 'string' 
                    ? createMultilingualText(topic.description) 
                    : topic.description)
                : null,
              keypoints: typeof topic.keypoints === 'string' 
                ? createMultilingualText(topic.keypoints) 
                : topic.keypoints,
              authorId: session.user.id!
            }
            
            delete transformedTopic.id
            topicDebug.transformedData = transformedTopic
            
            try {
              const newTopic = await prisma.topic.create({ data: transformedTopic })
              topicDebug.status = 'created'
              topicDebug.newId = newTopic.id
            } catch (createError) {
              topicDebug.status = 'create_failed'
              topicDebug.createError = createError instanceof Error ? createError.message : String(createError)
            }
          }
        } catch (checkError) {
          topicDebug.status = 'check_failed'
          topicDebug.checkError = checkError instanceof Error ? checkError.message : String(checkError)
        }

        topicResults.push(topicDebug)
      }
    }

    const databaseAfter = {
      topics: await prisma.topic.count(),
      users: await prisma.user.count()
    }

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      topicProcessing: topicResults,
      databaseAfter,
      summary: {
        topicsAdded: databaseAfter.topics - debugInfo.databaseBefore.topics,
        totalTopicsProcessed: topicResults.length
      }
    })

  } catch (error) {
    console.error('Import debug error:', error)
    return NextResponse.json({
      success: false,
      error: `Import debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}