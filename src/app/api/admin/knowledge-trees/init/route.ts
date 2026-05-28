// Creates the default "General" tree and assigns all unassigned topics to it
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth/middleware'

export async function POST(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN'])
  if (authResult instanceof Response) return authResult

  try {
    const generalTree = await prisma.knowledgeTree.upsert({
      where: { slug: 'general' },
      create: { name: 'General', slug: 'general', description: 'Default knowledge tree for all topics' },
      update: {},
    })

    const result = await prisma.topic.updateMany({
      where: { treeId: null },
      data: { treeId: generalTree.id },
    })

    return NextResponse.json({
      tree: generalTree,
      assignedTopics: result.count,
      message: `Assigned ${result.count} unassigned topics to "General" tree`,
    })
  } catch (error) {
    console.error('Error initializing knowledge trees:', error)
    return NextResponse.json({ error: 'Failed to initialize knowledge trees' }, { status: 500 })
  }
}
