import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// NUCLEAR OPTION: Delete everything from database
export async function POST(request: Request) {
  try {
    const { confirm } = await request.json()
    if (confirm !== 'NUCLEAR_RESET_EVERYTHING') {
      return NextResponse.json({
        error: 'This will DELETE EVERYTHING! Send { "confirm": "NUCLEAR_RESET_EVERYTHING" }'
      }, { status: 400 })
    }

    console.log('🚨 NUCLEAR RESET: DELETING ALL DATA 🚨')

    // Delete in correct order to handle foreign keys
    await prisma.courseEnrollment.deleteMany({})
    await prisma.studentTopic.deleteMany({})
    await prisma.goalTopic.deleteMany({})
    await prisma.goalTemplateTopic.deleteMany({})
    await prisma.courseTopic.deleteMany({})
    await prisma.vacancyTopic.deleteMany({})
    await prisma.topicPrerequisite.deleteMany({})
    
    await prisma.goal.deleteMany({})
    await prisma.goalTemplate.deleteMany({})
    await prisma.course.deleteMany({})
    await prisma.vacancy.deleteMany({})
    await prisma.topic.deleteMany({})
    
    await prisma.session.deleteMany({})
    await prisma.account.deleteMany({})
    await prisma.user.deleteMany({})

    console.log('💥 ALL DATA DELETED 💥')

    return NextResponse.json({
      message: 'NUCLEAR RESET COMPLETE. All data deleted. You can now register fresh.',
      warning: 'Log out and register again to become first admin.'
    })

  } catch (error) {
    console.error('Nuclear reset error:', error)
    return NextResponse.json({
      error: 'Nuclear reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}