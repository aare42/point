import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'EDITOR'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('🌱 Manual seeding triggered by:', session.user.email)

    // Check if database already has data
    const existingTopicsCount = await prisma.topic.count()
    console.log(`📊 Current topics in database: ${existingTopicsCount}`)

    const force = request.nextUrl.searchParams.get('force') === 'true'

    if (existingTopicsCount > 0 && !force) {
      return NextResponse.json({
        success: false,
        message: `Database already has ${existingTopicsCount} topics. Use ?force=true to reseed anyway.`,
        existingTopics: existingTopicsCount
      })
    }

    // Read production data
    const dataPath = path.join(process.cwd(), 'public', 'production-data.json')
    console.log('📂 Looking for data at:', dataPath)
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({
        success: false,
        error: 'Production data file not found',
        expectedPath: dataPath
      }, { status: 404 })
    }

    const rawData = fs.readFileSync(dataPath, 'utf8')
    const productionData = JSON.parse(rawData)

    if (!productionData.topics || !Array.isArray(productionData.topics)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid production data format - topics array not found'
      }, { status: 400 })
    }

    console.log(`📥 Found ${productionData.topics.length} topics to import`)

    // Get or create admin user
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!adminUser) {
      // Use current user as admin if no admin exists
      await prisma.user.update({
        where: { id: session.user.id },
        data: { role: 'ADMIN' }
      })
      adminUser = await prisma.user.findUnique({
        where: { id: session.user.id }
      })
      console.log('👤 Promoted current user to admin')
    }

    // Clear existing data if force mode
    if (force && existingTopicsCount > 0) {
      console.log('🧹 Force mode: clearing existing data')
      await prisma.topicPrerequisite.deleteMany({})
      await prisma.studentTopic.deleteMany({})
      await prisma.courseTopic.deleteMany({})
      await prisma.goalTemplateTopic.deleteMany({})
      await prisma.goalTopic.deleteMany({})
      await prisma.vacancyTopic.deleteMany({})
      await prisma.topic.deleteMany({})
    }

    // Import topics in transaction
    const result = await prisma.$transaction(async (tx) => {
      const topicMapping: Record<string, string> = {}

      // First pass: Create all topics without prerequisites
      for (const topicData of productionData.topics) {
        const newTopic = await tx.topic.create({
          data: {
            name: typeof topicData.name === 'string' ? 
              topicData.name : 
              JSON.stringify(topicData.name),
            slug: topicData.slug,
            type: topicData.type,
            description: topicData.description ? (
              typeof topicData.description === 'string' ? 
                topicData.description : 
                JSON.stringify(topicData.description)
            ) : null,
            keypoints: topicData.keypoints ? (
              typeof topicData.keypoints === 'string' ? 
                topicData.keypoints : 
                JSON.stringify(topicData.keypoints)
            ) : null,
            authorId: adminUser!.id
          }
        })
        topicMapping[topicData.id] = newTopic.id
      }

      // Second pass: Create prerequisites
      let prerequisitesCreated = 0
      for (const topicData of productionData.topics) {
        if (topicData.prerequisites && topicData.prerequisites.length > 0) {
          for (const prereq of topicData.prerequisites) {
            const topicId = topicMapping[topicData.id]
            const prerequisiteId = topicMapping[prereq.prerequisiteId]
            
            if (topicId && prerequisiteId) {
              await tx.topicPrerequisite.create({
                data: {
                  topicId,
                  prerequisiteId
                }
              })
              prerequisitesCreated++
            }
          }
        }
      }

      return {
        topicsCreated: Object.keys(topicMapping).length,
        prerequisitesCreated
      }
    })

    console.log(`✅ Successfully imported ${result.topicsCreated} topics with ${result.prerequisitesCreated} prerequisites`)

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      topicsCreated: result.topicsCreated,
      prerequisitesCreated: result.prerequisitesCreated,
      adminUser: adminUser?.email || 'Unknown'
    })

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    return NextResponse.json({
      success: false,
      error: 'Database seeding failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}