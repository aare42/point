import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || !['ADMIN', 'EDITOR'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const topicId = params.id
    const updates = await request.json()

    // Update the topic
    const updatedTopic = await prisma.topic.update({
      where: { id: topicId },
      data: updates,
      include: {
        author: {
          select: { id: true, name: true, email: true }
        },
        prerequisites: {
          include: {
            prerequisite: {
              select: { id: true, name: true, slug: true, type: true }
            }
          }
        }
      }
    })

    return NextResponse.json(updatedTopic)
  } catch (error) {
    console.error('Error updating topic:', error)
    return NextResponse.json(
      { error: 'Failed to update topic' },
      { status: 500 }
    )
  }
}