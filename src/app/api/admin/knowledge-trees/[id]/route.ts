// Admin per-tree operations: read, update, delete
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth/middleware'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tree = await prisma.knowledgeTree.findUnique({
      where: { id },
      include: { _count: { select: { topics: true } } },
    })
    if (!tree) return NextResponse.json({ error: 'Tree not found' }, { status: 404 })
    return NextResponse.json(tree)
  } catch (error) {
    console.error('Error fetching tree:', error)
    return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withAuth(req, ['ADMIN'])
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const body = await req.json()
    const { name, slug, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!slug?.trim() || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' }, { status: 400 })
    }

    const tree = await prisma.knowledgeTree.update({
      where: { id },
      data: { name: name.trim(), slug: slug.trim(), description: description?.trim() || null },
      include: { _count: { select: { topics: true } } },
    })
    return NextResponse.json(tree)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Tree not found' }, { status: 404 })
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A tree with this name or slug already exists' }, { status: 400 })
    }
    console.error('Error updating tree:', error)
    return NextResponse.json({ error: 'Failed to update tree' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await withAuth(req, ['ADMIN'])
  if (authResult instanceof Response) return authResult

  try {
    const { id } = await params
    const tree = await prisma.knowledgeTree.findUnique({
      where: { id },
      include: { _count: { select: { topics: true } } },
    })

    if (!tree) return NextResponse.json({ error: 'Tree not found' }, { status: 404 })

    if (tree._count.topics > 0) {
      return NextResponse.json(
        { error: `Cannot delete tree with ${tree._count.topics} assigned topics. Reassign them first.` },
        { status: 400 }
      )
    }

    await prisma.knowledgeTree.delete({ where: { id } })
    return NextResponse.json({ message: 'Tree deleted successfully' })
  } catch (error) {
    console.error('Error deleting tree:', error)
    return NextResponse.json({ error: 'Failed to delete tree' }, { status: 500 })
  }
}
