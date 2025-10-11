import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  return await handleJsonFix(request)
}

export async function POST(request: NextRequest) {
  return await handleJsonFix(request)
}

async function handleJsonFix(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      total: 0,
      fixed: 0,
      errors: 0,
      details: [] as string[]
    }

    // Get all topics using raw SQL to bypass JSON parsing issues
    const rawTopics = await prisma.$queryRaw`
      SELECT id, slug, name, keypoints, description, type, "authorId", "createdAt", "updatedAt"
      FROM "Topic"
    ` as any[]

    results.total = rawTopics.length
    results.details.push(`Found ${rawTopics.length} topics to check`)

    for (const topic of rawTopics) {
      try {
        // Check if JSON fields are valid
        let needsUpdate = false
        let fixedName = topic.name
        let fixedKeypoints = topic.keypoints  
        let fixedDescription = topic.description

        // Try to fix name field
        if (typeof topic.name === 'string') {
          try {
            JSON.parse(topic.name)
          } catch {
            // If it's corrupted, assume it's Ukrainian text
            fixedName = JSON.stringify({ uk: topic.name, en: topic.name })
            needsUpdate = true
          }
        }

        // Try to fix keypoints field
        if (typeof topic.keypoints === 'string') {
          try {
            JSON.parse(topic.keypoints)
          } catch {
            // If it's corrupted, assume it's Ukrainian text
            fixedKeypoints = JSON.stringify({ uk: topic.keypoints, en: topic.keypoints })
            needsUpdate = true
          }
        }

        // Try to fix description field
        if (topic.description && typeof topic.description === 'string') {
          try {
            JSON.parse(topic.description)
          } catch {
            // If it's corrupted, assume it's Ukrainian text
            fixedDescription = JSON.stringify({ uk: topic.description, en: topic.description })
            needsUpdate = true
          }
        }

        if (needsUpdate) {
          // Update using raw SQL to avoid JSON parsing issues
          await prisma.$executeRaw`
            UPDATE "Topic" 
            SET 
              name = ${fixedName}::jsonb,
              keypoints = ${fixedKeypoints}::jsonb,
              description = ${fixedDescription}::jsonb
            WHERE id = ${topic.id}
          `
          
          results.fixed++
          results.details.push(`Fixed: ${topic.slug}`)
        }

      } catch (error) {
        results.errors++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        results.details.push(`Error with ${topic.slug}: ${errorMsg}`)
        console.error(`JSON fix error for ${topic.slug}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'JSON corruption fix completed',
      results
    })

  } catch (error) {
    console.error('Fix JSON corruption error:', error)
    return NextResponse.json({
      success: false,
      error: `JSON fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}