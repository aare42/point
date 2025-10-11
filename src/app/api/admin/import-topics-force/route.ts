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
    if (!data.data || !data.data.topic || !Array.isArray(data.data.topic)) {
      return NextResponse.json({ error: 'Invalid JSON format - topics array not found' }, { status: 400 })
    }

    const force = request.nextUrl.searchParams.get('force') === 'true'
    const importResults = {
      total: data.data.topic.length,
      created: 0,
      skipped: 0,
      updated: 0,
      errors: 0,
      details: [] as string[]
    }

    // Clear existing topics if force mode
    if (force) {
      console.log('🧹 Force mode: clearing existing topics')
      await prisma.topicPrerequisite.deleteMany({})
      await prisma.studentTopic.deleteMany({})
      await prisma.courseTopic.deleteMany({})
      await prisma.goalTemplateTopic.deleteMany({})
      await prisma.goalTopic.deleteMany({})
      await prisma.vacancyTopic.deleteMany({})
      await prisma.topic.deleteMany({})
      importResults.details.push('Cleared existing topics due to force mode')
    }

    const topicMapping: Record<string, string> = {}

    // Import topics
    for (const topic of data.data.topic) {
      try {
        const existingTopic = await prisma.topic.findUnique({
          where: { slug: topic.slug }
        })

        if (existingTopic && !force) {
          topicMapping[topic.id] = existingTopic.id
          importResults.skipped++
          importResults.details.push(`Skipped existing topic: ${topic.slug}`)
          continue
        }

        // Transform topic data
        const transformedTopic = {
          name: typeof topic.name === 'string' 
            ? createMultilingualText(topic.name) 
            : topic.name,
          slug: topic.slug,
          type: topic.type,
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

        let newTopic
        if (existingTopic && force) {
          // Update existing topic in force mode
          newTopic = await prisma.topic.update({
            where: { id: existingTopic.id },
            data: transformedTopic
          })
          topicMapping[topic.id] = newTopic.id
          importResults.updated++
          importResults.details.push(`Updated topic: ${topic.slug}`)
        } else {
          // Create new topic
          newTopic = await prisma.topic.create({ data: transformedTopic })
          topicMapping[topic.id] = newTopic.id
          importResults.created++
          importResults.details.push(`Created topic: ${topic.slug}`)
        }

      } catch (error) {
        importResults.errors++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        importResults.details.push(`Error with topic ${topic.slug}: ${errorMsg}`)
        console.error(`Topic import error for ${topic.slug}:`, error)
      }
    }

    // Import prerequisites if topics were imported
    let prerequisitesImported = 0
    if (data.data.topicPrerequisite && Array.isArray(data.data.topicPrerequisite)) {
      for (const prereq of data.data.topicPrerequisite) {
        try {
          const newTopicId = topicMapping[prereq.topicId]
          const newPrerequisiteId = topicMapping[prereq.prerequisiteId]
          
          if (!newTopicId || !newPrerequisiteId) {
            continue // Skip if topics don't exist
          }
          
          const existing = await prisma.topicPrerequisite.findUnique({
            where: {
              topicId_prerequisiteId: {
                topicId: newTopicId,
                prerequisiteId: newPrerequisiteId
              }
            }
          })
          
          if (!existing) {
            await prisma.topicPrerequisite.create({ 
              data: {
                topicId: newTopicId,
                prerequisiteId: newPrerequisiteId
              }
            })
            prerequisitesImported++
          }
        } catch (error) {
          console.error('Prerequisite import error:', error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Topics import completed`,
      results: importResults,
      prerequisitesImported,
      topicMapping: Object.keys(topicMapping).length
    })

  } catch (error) {
    console.error('Topics import error:', error)
    return NextResponse.json({
      success: false,
      error: `Topics import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}