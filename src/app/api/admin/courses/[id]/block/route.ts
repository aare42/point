import { NextRequest, NextResponse } from 'next/server'
import { withRootAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await withRootAdminAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { id: courseId } = params

    // Block the course
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { isBlocked: true },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        isBlocked: true,
        createdAt: true,
        educator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Course blocked successfully',
      course: updatedCourse
    })

  } catch (error) {
    console.error('Block course error:', error)
    return NextResponse.json(
      { error: 'Failed to block course' },
      { status: 500 }
    )
  }
}

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

    // Unblock the course
    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: { isBlocked: false },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        isBlocked: true,
        createdAt: true,
        educator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      message: 'Course unblocked successfully',
      course: updatedCourse
    })

  } catch (error) {
    console.error('Unblock course error:', error)
    return NextResponse.json(
      { error: 'Failed to unblock course' },
      { status: 500 }
    )
  }
}