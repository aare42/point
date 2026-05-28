// Public read-only endpoint for listing knowledge trees (used in dropdowns)
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const trees = await prisma.knowledgeTree.findMany({
      include: {
        _count: { select: { topics: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(trees)
  } catch (error) {
    console.error('Error fetching knowledge trees:', error)
    return NextResponse.json({ error: 'Failed to fetch knowledge trees' }, { status: 500 })
  }
}
