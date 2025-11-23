import { NextRequest, NextResponse } from 'next/server'
import { withRootAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withRootAdminAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { id: courseId } = params

    // Get course data before deletion for response
    const courseToDelete = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        educator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          enrollments: true,
          topics: true
        }
      }
    })

    if (!courseToDelete) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Delete the course - Prisma cascade will handle related data
    // (enrollments, course topics will be deleted automatically)
    await prisma.course.delete({
      where: { id: courseId }
    })

    return NextResponse.json({
      message: 'Course and all related data deleted successfully',
      deletedCourse: courseToDelete
    })

  } catch (error) {
    console.error('Delete course error:', error)
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    )
  }
}