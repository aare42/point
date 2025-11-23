import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

// Debug endpoint to investigate admin users issue
export async function GET(request: NextRequest) {
  // Verify admin access (not root admin required)
  const authResult = await withAuth(request, ['ADMIN'])
  if (authResult instanceof NextResponse) {
    return authResult
  }
  try {
    console.log('=== INVESTIGATING ADMIN USERS ===')
    
    // Get all admin users
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            authoredTopics: true,
            goals: true,
            educatedCourses: true,
            enrollments: true,
            authoredVacancies: true
          }
        }
      }
    })

    const investigation = {
      totalAdminUsers: adminUsers.length,
      rootAdmin: adminUsers[0]?.email || 'None',
      adminUsers: adminUsers.map((user, index) => ({
        id: user.id,
        name: user.name || 'No Name',
        email: user.email,
        createdAt: user.createdAt,
        isRootAdmin: index === 0,
        contentCounts: user._count,
        totalContent: Object.values(user._count).reduce((sum: number, count: number) => sum + count, 0)
      })),
      contentOwnership: adminUsers.reduce((acc, user) => {
        acc[user.email] = {
          topics: user._count.authoredTopics,
          courses: user._count.educatedCourses,
          goals: user._count.goals,
          enrollments: user._count.enrollments,
          vacancies: user._count.authoredVacancies,
          total: Object.values(user._count).reduce((sum: number, count: number) => sum + count, 0)
        }
        return acc
      }, {} as Record<string, any>)
    }

    return NextResponse.json(investigation)

  } catch (error) {
    console.error('Investigation error:', error)
    return NextResponse.json({ 
      error: 'Failed to investigate admin users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}