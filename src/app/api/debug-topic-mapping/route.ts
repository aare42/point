import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read backup file
    const backupPath = path.join(process.cwd(), 'public', 'backup.json')
    const backupContent = fs.readFileSync(backupPath, 'utf8')
    const data = JSON.parse(backupContent)

    // Build topic mapping
    const topicMapping: Record<string, string> = {}
    const currentTopics = await prisma.topic.findMany({ select: { id: true, slug: true } })
    
    if (data.data.topic && Array.isArray(data.data.topic)) {
      for (const backupTopic of data.data.topic) {
        const currentTopic = currentTopics.find(t => t.slug === backupTopic.slug)
        if (currentTopic) {
          topicMapping[backupTopic.id] = currentTopic.id
        }
      }
    }

    // Analyze goal template topic mappings specifically
    const goalTemplateTopics = data.data.goalTemplateTopic || []
    const mappingAnalysis = []

    for (const gtt of goalTemplateTopics) {
      const oldTopicId = gtt.topicId
      const newTopicId = topicMapping[oldTopicId]
      
      // Find the backup topic info
      const backupTopic = data.data.topic.find((t: any) => t.id === oldTopicId)
      
      // Find current topic info
      const currentTopic = currentTopics.find(t => t.id === newTopicId)
      
      mappingAnalysis.push({
        oldTopicId,
        newTopicId,
        hasMapping: !!newTopicId,
        backupTopicSlug: backupTopic?.slug,
        backupTopicName: backupTopic?.name,
        currentTopicSlug: currentTopic?.slug,
        goalTemplateId: gtt.goalTemplateId
      })
    }

    // Count successful mappings
    const successfulMappings = mappingAnalysis.filter(m => m.hasMapping).length
    const failedMappings = mappingAnalysis.filter(m => !m.hasMapping).length

    return NextResponse.json({
      success: true,
      summary: {
        totalGoalTemplateTopics: goalTemplateTopics.length,
        totalTopicMappings: Object.keys(topicMapping).length,
        successfulMappings,
        failedMappings
      },
      mappingDetails: mappingAnalysis,
      sampleCurrentTopics: currentTopics.slice(0, 5).map(t => ({ id: t.id, slug: t.slug })),
      sampleBackupTopics: data.data.topic.slice(0, 5).map((t: any) => ({ id: t.id, slug: t.slug }))
    })

  } catch (error) {
    console.error('Debug topic mapping error:', error)
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}