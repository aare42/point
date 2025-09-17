import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    let importedCount = 0
    const results = []

    // Import Users first (if any)
    if (data.data.user && Array.isArray(data.data.user)) {
      try {
        for (const user of data.data.user) {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          
          if (!existingUser) {
            await prisma.user.create({ data: user })
            importedCount++
          }
        }
        results.push(`${data.data.user.length} users processed`)
      } catch (error) {
        results.push(`Users import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Topics
    if (data.data.topic && Array.isArray(data.data.topic)) {
      try {
        for (const topic of data.data.topic) {
          // Check if topic already exists
          const existingTopic = await prisma.topic.findUnique({
            where: { slug: topic.slug }
          })
          
          if (!existingTopic) {
            // Create topic without prerequisites first
            const { ...topicData } = topic
            await prisma.topic.create({ data: topicData })
            importedCount++
          }
        }
        results.push(`${data.data.topic.length} topics processed`)
      } catch (error) {
        results.push(`Topics import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Topic Prerequisites (after all topics exist)
    if (data.data.topicPrerequisite && Array.isArray(data.data.topicPrerequisite)) {
      try {
        for (const prereq of data.data.topicPrerequisite) {
          // Check if prerequisite relationship already exists
          const existing = await prisma.topicPrerequisite.findUnique({
            where: {
              topicId_prerequisiteId: {
                topicId: prereq.topicId,
                prerequisiteId: prereq.prerequisiteId
              }
            }
          })
          
          if (!existing) {
            await prisma.topicPrerequisite.create({ data: prereq })
            importedCount++
          }
        }
        results.push(`${data.data.topicPrerequisite.length} prerequisites processed`)
      } catch (error) {
        results.push(`Prerequisites import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Courses
    if (data.data.course && Array.isArray(data.data.course)) {
      try {
        for (const course of data.data.course) {
          const existingCourse = await prisma.course.findUnique({
            where: { id: course.id }
          })
          
          if (!existingCourse) {
            await prisma.course.create({ data: course })
            importedCount++
          }
        }
        results.push(`${data.data.course.length} courses processed`)
      } catch (error) {
        results.push(`Courses import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Goals
    if (data.data.goal && Array.isArray(data.data.goal)) {
      try {
        for (const goal of data.data.goal) {
          const existingGoal = await prisma.goal.findUnique({
            where: { id: goal.id }
          })
          
          if (!existingGoal) {
            await prisma.goal.create({ data: goal })
            importedCount++
          }
        }
        results.push(`${data.data.goal.length} goals processed`)
      } catch (error) {
        results.push(`Goals import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: `Import completed. ${importedCount} new records created. ${results.join(', ')}`
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}