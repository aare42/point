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

    // Read backup file to see what goal templates should exist
    const backupPath = path.join(process.cwd(), 'public', 'backup.json')
    const backupContent = fs.readFileSync(backupPath, 'utf8')
    const data = JSON.parse(backupContent)

    // Check current goal templates in production
    const currentGoalTemplates = await prisma.goalTemplate.findMany({
      select: { id: true, name: true, authorId: true },
      orderBy: { name: 'asc' }
    })

    // Check current users for mapping
    const currentUsers = await prisma.user.findMany({
      select: { id: true, email: true }
    })

    // Build user mapping
    const userMapping: Record<string, string> = {}
    if (data.data.user && Array.isArray(data.data.user)) {
      for (const backupUser of data.data.user) {
        const currentUser = currentUsers.find(u => u.email === backupUser.email)
        if (currentUser) {
          userMapping[backupUser.id] = currentUser.id
        }
      }
    }

    // Analyze backup goal templates
    const backupGoalTemplates = data.data.goalTemplate || []
    const analysisResults = {
      currentGoalTemplates: currentGoalTemplates.length,
      backupGoalTemplates: backupGoalTemplates.length,
      userMappings: Object.keys(userMapping).length,
      matchAnalysis: [] as any[],
      backupSample: backupGoalTemplates.slice(0, 3),
      currentSample: currentGoalTemplates.slice(0, 3)
    }

    // Analyze each backup goal template
    for (const backupTemplate of backupGoalTemplates) {
      const newAuthorId = userMapping[backupTemplate.authorId]
      const matchingTemplate = currentGoalTemplates.find(gt => 
        gt.name === backupTemplate.name && gt.authorId === newAuthorId
      )

      analysisResults.matchAnalysis.push({
        backupName: backupTemplate.name,
        backupAuthorId: backupTemplate.authorId,
        newAuthorId,
        hasAuthorMatch: !!newAuthorId,
        hasTemplateMatch: !!matchingTemplate,
        matchingTemplateId: matchingTemplate?.id
      })
    }

    // Check goal template topics in backup
    const backupGoalTemplateTopics = data.data.goalTemplateTopic || []
    
    // Check current goal template topics
    const currentGoalTemplateTopics = await prisma.goalTemplateTopic.count()

    return NextResponse.json({
      success: true,
      analysis: analysisResults,
      relationships: {
        backupGoalTemplateTopics: backupGoalTemplateTopics.length,
        currentGoalTemplateTopics,
        sampleBackupRelationships: backupGoalTemplateTopics.slice(0, 5)
      }
    })

  } catch (error) {
    console.error('Debug goal templates error:', error)
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}