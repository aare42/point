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

    const force = request.nextUrl.searchParams.get('force') === 'true'

    // Step 1: Clear all corrupted topics if force mode
    if (force) {
      console.log('🧹 Clearing all topics and related data...')
      await prisma.topicPrerequisite.deleteMany({})
      await prisma.studentTopic.deleteMany({})
      await prisma.courseTopic.deleteMany({})
      await prisma.goalTemplateTopic.deleteMany({})
      await prisma.goalTopic.deleteMany({})
      await prisma.vacancyTopic.deleteMany({})
      await prisma.topic.deleteMany({})
    }

    // Step 2: Get data from request
    const data = await request.json()
    
    if (!data.data || !data.data.topic || !Array.isArray(data.data.topic)) {
      return NextResponse.json({ error: 'Invalid JSON format - topics array not found' }, { status: 400 })
    }

    const results = {
      total: data.data.topic.length,
      created: 0,
      skipped: 0,
      errors: 0,
      details: [] as string[]
    }

    // Step 3: Import topics with encoding fix
    for (const topic of data.data.topic) {
      try {
        // Skip if topic already exists (unless force mode)
        if (!force) {
          const existing = await prisma.topic.findUnique({
            where: { slug: topic.slug }
          })
          if (existing) {
            results.skipped++
            results.details.push(`Skipped existing: ${topic.slug}`)
            continue
          }
        }

        // Clean and fix topic data
        const cleanTopic = {
          name: cleanMultilingualField(topic.name),
          slug: topic.slug,
          type: topic.type,
          description: cleanMultilingualField(topic.description),
          keypoints: cleanMultilingualField(topic.keypoints),
          authorId: session.user.id!
        }

        // Validate that all required fields are present and valid
        if (!cleanTopic.name || !cleanTopic.slug || !cleanTopic.type || !cleanTopic.keypoints) {
          results.errors++
          results.details.push(`Invalid data for: ${topic.slug}`)
          continue
        }

        // Create topic
        await prisma.topic.create({ data: cleanTopic })
        results.created++
        results.details.push(`Created: ${topic.slug}`)

      } catch (error) {
        results.errors++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.details.push(`Error with ${topic.slug}: ${errorMsg}`)
        console.error(`Topic import error for ${topic.slug}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Topics encoding fix completed',
      results
    })

  } catch (error) {
    console.error('Fix encoding error:', error)
    return NextResponse.json({
      success: false,
      error: `Encoding fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

// Helper function to clean multilingual fields
function cleanMultilingualField(field: any): any {
  if (!field) return null
  
  // If it's already an object, return as-is
  if (typeof field === 'object' && field !== null) {
    return field
  }
  
  // If it's a string, try to create multilingual text
  if (typeof field === 'string') {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(field)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed
      }
    } catch {
      // If parsing fails, treat as Ukrainian text
      return createMultilingualText(field, 'uk')
    }
  }
  
  return null
}