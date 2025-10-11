import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLocalizedText } from '@/lib/utils/multilingual'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const results = { timestamp: new Date().toISOString(), tests: {} as any }

    // Test 1: Student topic status counts
    try {
      const statusCounts = await prisma.studentTopic.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true }
      })
      results.tests.statusCounts = { success: true, data: statusCounts }
    } catch (error) {
      results.tests.statusCounts = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 2: Recent changes query
    try {
      const recentChanges = await prisma.studentTopic.findMany({
        where: { userId },
        include: {
          topic: {
            select: { name: true, slug: true, type: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 2
      })
      
      results.tests.recentChanges = { 
        success: true, 
        count: recentChanges.length,
        sample: recentChanges.map(change => ({
          status: change.status,
          topicSlug: change.topic.slug,
          topicName: change.topic.name,
          nameType: typeof change.topic.name
        }))
      }
    } catch (error) {
      results.tests.recentChanges = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 3: Goals query (simplified)
    try {
      const goals = await prisma.goal.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          motto: true,
          deadline: true
        },
        take: 2
      })
      
      results.tests.goals = { 
        success: true, 
        count: goals.length,
        sample: goals.map(goal => ({
          id: goal.id,
          name: goal.name,
          nameType: typeof goal.name,
          motto: goal.motto,
          mottoType: typeof goal.motto
        }))
      }
    } catch (error) {
      results.tests.goals = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 4: Enrolled courses query (simplified)
    try {
      const enrolledCourses = await prisma.courseEnrollment.findMany({
        where: { studentId: userId },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        },
        take: 2
      })
      
      results.tests.enrolledCourses = { 
        success: true, 
        count: enrolledCourses.length,
        sample: enrolledCourses.map(enrollment => ({
          courseId: enrollment.course.id,
          courseName: enrollment.course.name,
          nameType: typeof enrollment.course.name,
          description: enrollment.course.description,
          descriptionType: typeof enrollment.course.description
        }))
      }
    } catch (error) {
      results.tests.enrolledCourses = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    // Test 5: Test getLocalizedText function
    try {
      const testTopic = await prisma.topic.findFirst({
        select: { name: true, slug: true }
      })
      
      if (testTopic) {
        const localizedName = getLocalizedText(testTopic.name as any, 'uk')
        results.tests.localization = { 
          success: true, 
          originalName: testTopic.name,
          nameType: typeof testTopic.name,
          localizedName,
          localizedType: typeof localizedName
        }
      } else {
        results.tests.localization = { 
          success: false, 
          error: 'No topics found'
        }
      }
    } catch (error) {
      results.tests.localization = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Debug dashboard error:', error)
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stack: error instanceof Error ? error.stack?.substring(0, 1000) : undefined
    }, { status: 500 })
  }
}