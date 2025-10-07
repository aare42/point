import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateVacancySchema = z.object({
  name: z.string().min(1, 'Vacancy name is required').max(200),
  topicIds: z.array(z.string()).optional()
})

const patchVacancySchema = z.object({
  name: z.any().optional(),
  description: z.any().optional()
})

// GET - fetch vacancy details for admin
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

    const vacancy = await prisma.vacancy.findUnique({
      where: { id },
      include: {
        author: {
          select: {
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
                slug: true,
                type: true
              }
            }
          }
        }
      }
    })

    if (!vacancy) {
      return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
    }

    return NextResponse.json(vacancy)
  } catch (error) {
    console.error('Error fetching vacancy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - update vacancy details (admin only)
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
    const { name, topicIds } = updateVacancySchema.parse(body)

    // Update vacancy in a transaction
    const updatedVacancy = await prisma.$transaction(async (tx) => {
      // Update vacancy basic info
      const vacancy = await tx.vacancy.update({
        where: { id },
        data: {
          name
        }
      })

      // Update topics if provided
      if (topicIds !== undefined) {
        // Remove existing topic connections
        await tx.vacancyTopic.deleteMany({
          where: { vacancyId: id }
        })

        // Add new topic connections
        if (topicIds.length > 0) {
          await tx.vacancyTopic.createMany({
            data: topicIds.map(topicId => ({
              vacancyId: id,
              topicId
            }))
          })
        }
      }

      return vacancy
    })

    return NextResponse.json(updatedVacancy)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error updating vacancy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - delete vacancy (admin only)
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

    // Check if vacancy exists
    const vacancy = await prisma.vacancy.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!vacancy) {
      return NextResponse.json({ error: 'Vacancy not found' }, { status: 404 })
    }

    // Delete vacancy (this will cascade delete vacancy topics due to schema)
    await prisma.vacancy.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: `Vacancy "${vacancy.name}" has been deleted successfully` 
    })
  } catch (error) {
    console.error('Error deleting vacancy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - update specific vacancy fields (admin only)
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
    const validatedData = patchVacancySchema.parse(body)

    // Only include fields that are actually provided
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.description !== undefined) updateData.description = validatedData.description

    const updatedVacancy = await prisma.vacancy.update({
      where: { id },
      data: updateData,
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
          select: { topics: true }
        }
      }
    })

    return NextResponse.json(updatedVacancy)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error updating vacancy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}