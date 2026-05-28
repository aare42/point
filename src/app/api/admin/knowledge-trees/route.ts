// Admin CRUD for knowledge trees
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth/middleware'

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

export async function POST(req: NextRequest) {
  const authResult = await withAuth(req, ['ADMIN'])
  if (authResult instanceof Response) return authResult

  try {
    const body = await req.json()
    const { name, slug, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!slug?.trim() || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' }, { status: 400 })
    }

    const tree = await prisma.knowledgeTree.create({
      data: { name: name.trim(), slug: slug.trim(), description: description?.trim() || null },
      include: { _count: { select: { topics: true } } },
    })
    return NextResponse.json(tree, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A tree with this name or slug already exists' }, { status: 400 })
    }
    console.error('Error creating knowledge tree:', error)
    return NextResponse.json({ error: 'Failed to create knowledge tree' }, { status: 500 })
  }
}
