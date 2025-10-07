import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'EDITOR'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const updates = await request.json()

    // Update the goal template
    const updatedGoalTemplate = await prisma.goalTemplate.update({
      where: { id },
      data: updates,
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        topics: {
          include: {
            topic: {
              select: { id: true, name: true, slug: true, type: true }
            }
          }
        },
        _count: {
          select: { topics: true, goals: true }
        }
      }
    })

    return NextResponse.json(updatedGoalTemplate)
  } catch (error) {
    console.error('Error updating goal template:', error)
    return NextResponse.json(
      { error: 'Failed to update goal template' },
      { status: 500 }
    )
  }
}