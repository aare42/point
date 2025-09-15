import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - fetch employer's vacancies
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vacancies = await prisma.vacancy.findMany({
      where: {
        authorId: session.user.id
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        topics: {
          select: {
            topic: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true
              }
            }
          }
        },
        _count: {
          select: {
            topics: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(vacancies)
  } catch (error) {
    console.error('Error fetching employer vacancies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}