import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(
  req: NextRequest,
  context: RouteParams
) {
  try {
    console.log('PATCH /api/admin/topics/[id] called')
    
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    console.log('Session user:', session?.user?.id, 'Role:', session?.user?.role)
    
    if (!session?.user || !['ADMIN', 'EDITOR'].includes(session.user.role || '')) {
      console.log('Authorization failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: topicId } = await context.params
    const updates = await req.json()
    console.log('Topic PATCH request:', { topicId, updates })

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