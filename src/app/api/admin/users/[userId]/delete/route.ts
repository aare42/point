import { NextRequest, NextResponse } from 'next/server'
import { withRootAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const authResult = await withRootAdminAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { userId } = params

    // Prevent deleting the root admin themselves
    if (userId === authResult.sub) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    // Get user data before deletion for response
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user's content that might have foreign key constraints
    console.log(`Deleting content for user ${userId}...`)
    
    // Delete topics authored by user (and their prerequisites)
    const topicsToDelete = await prisma.topic.findMany({
      where: { authorId: userId },
      select: { id: true, slug: true }
    })
    
    if (topicsToDelete.length > 0) {
      console.log(`Deleting ${topicsToDelete.length} topics`)
      // Delete prerequisites first
      await prisma.topicPrerequisite.deleteMany({
        where: {
          OR: [
            { topicId: { in: topicsToDelete.map(t => t.id) } },
            { prerequisiteId: { in: topicsToDelete.map(t => t.id) } }
          ]
        }
      })
      // Then delete topics
      await prisma.topic.deleteMany({
        where: { authorId: userId }
      })
    }
    
    // Delete vacancies authored by user
    const vacanciesToDelete = await prisma.vacancy.findMany({
      where: { authorId: userId },
      select: { id: true, name: true }
    })
    
    if (vacanciesToDelete.length > 0) {
      console.log(`Deleting ${vacanciesToDelete.length} vacancies`)
      await prisma.vacancy.deleteMany({
        where: { authorId: userId }
      })
    }
    
    // Delete goal templates authored by user
    const goalTemplatesToDelete = await prisma.goalTemplate.findMany({
      where: { authorId: userId },
      select: { id: true, name: true }
    })
    
    if (goalTemplatesToDelete.length > 0) {
      console.log(`Deleting ${goalTemplatesToDelete.length} goal templates`)
      await prisma.goalTemplate.deleteMany({
        where: { authorId: userId }
      })
    }

    // Delete the user - Prisma cascade will handle remaining related data
    // (courses, goals, enrollments, etc.)
    console.log(`Deleting user ${userId}`)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      message: 'User and all their content deleted successfully',
      deletedUser: userToDelete
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}