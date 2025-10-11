import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      timestamp: new Date().toISOString(),
      entityCounts: {} as any,
      relationshipCounts: {} as any
    }

    // Count main entities
    results.entityCounts = {
      topics: await prisma.topic.count(),
      users: await prisma.user.count(),
      goals: await prisma.goal.count(),
      goalTemplates: await prisma.goalTemplate.count(),
      courses: await prisma.course.count(),
      vacancies: await prisma.vacancy.count()
    }

    // Count relationships (these are likely broken)
    results.relationshipCounts = {
      topicPrerequisites: await prisma.topicPrerequisite.count(),
      goalTopics: await prisma.goalTopic.count(),
      goalTemplateTopics: await prisma.goalTemplateTopic.count(),
      courseTopics: await prisma.courseTopic.count(),
      vacancyTopics: await prisma.vacancyTopic.count(),
      studentTopics: await prisma.studentTopic.count(),
      courseEnrollments: await prisma.courseEnrollment.count()
    }

    // Sample some topics to see if they have any connections
    const sampleTopicsWithConnections = await prisma.topic.findMany({
      take: 5,
      select: {
        id: true,
        slug: true,
        _count: {
          select: {
            prerequisites: true,
            dependents: true,
            goalTopics: true,
            goalTemplateTopics: true,
            courseTopics: true,
            vacancyTopics: true,
            studentTopics: true
          }
        }
      }
    })

    results.relationshipCounts.sampleTopicConnections = sampleTopicsWithConnections

    return NextResponse.json(results)

  } catch (error) {
    console.error('Debug relationships count error:', error)
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}