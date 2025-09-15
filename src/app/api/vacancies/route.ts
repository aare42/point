import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - fetch all vacancies for public browsing
export async function GET(req: NextRequest) {
  try {
    const vacancies = await prisma.vacancy.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
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
    console.error('Error fetching vacancies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}