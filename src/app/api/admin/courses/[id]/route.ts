import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required').max(200),
  description: z.string().optional(),
  educatorId: z.string().cuid('Invalid educator ID')
})

const patchCourseSchema = z.object({
  isPublic: z.boolean().optional(),
  name: z.any().optional(),
  description: z.any().optional()
})

// GET - fetch course details for admin
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!['ADMIN', 'EDITOR'].includes(user?.role || '')) {
      return NextResponse.json({ error: 'Admin or Editor access required' }, { status: 403 })
    }

    const { id } = await params

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        educator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        topics: {
          include: {
            topic: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        _count: {
          select: {
            topics: true,
            enrollments: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - update course details (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!['ADMIN', 'EDITOR'].includes(user?.role || '')) {
      return NextResponse.json({ error: 'Admin or Editor access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, description, educatorId } = updateCourseSchema.parse(body)

    // Verify the educator exists
    const educator = await prisma.user.findUnique({
      where: { id: educatorId },
      select: { id: true }
    })

    if (!educator) {
      return NextResponse.json({ error: 'Educator not found' }, { status: 400 })
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        name,
        description,
        educatorId
      },
      include: {
        educator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error updating course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - delete course (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!['ADMIN', 'EDITOR'].includes(user?.role || '')) {
      return NextResponse.json({ error: 'Admin or Editor access required' }, { status: 403 })
    }

    const { id } = await params

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Delete course (this will cascade delete enrollments and course topics due to schema)
    await prisma.course.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: `Course "${course.name}" has been deleted successfully` 
    })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - update specific course fields (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!['ADMIN', 'EDITOR'].includes(user?.role || '')) {
      return NextResponse.json({ error: 'Admin or Editor access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const validatedData = patchCourseSchema.parse(body)

    // Only include fields that are actually provided
    const updateData: any = {}
    if (validatedData.isPublic !== undefined) updateData.isPublic = validatedData.isPublic
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        educator: {
          select: { id: true, name: true, email: true }
        },
        topics: {
          include: {
            topic: {
              select: { id: true, name: true, type: true }
            }
          }
        },
        _count: {
          select: { topics: true, enrollments: true }
        }
      }
    })

    return NextResponse.json(updatedCourse)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error updating course:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}