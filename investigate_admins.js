// Script to investigate admin users issue
const { PrismaClient } = require('@prisma/client')

async function investigateAdmins() {
  // Load environment variables
  require('dotenv').config({ path: '.env.local' })
  const prisma = new PrismaClient()

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

    console.log(`Found ${adminUsers.length} admin users:`)
    adminUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'No Name'} (${user.email})`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log(`   Root Admin: ${index === 0 ? 'YES (First Admin)' : 'NO'}`)
      console.log(`   Content Count:`, user._count)
    })

    // Check if there's content owned by multiple admins
    const contentByAdmin = {}
    for (const admin of adminUsers) {
      contentByAdmin[admin.email] = {
        topics: admin._count.authoredTopics,
        courses: admin._count.educatedCourses, 
        goals: admin._count.goals,
        enrollments: admin._count.enrollments,
        vacancies: admin._count.authoredVacancies,
        total: Object.values(admin._count).reduce((sum, count) => sum + count, 0)
      }
    }

    console.log('\n=== CONTENT OWNERSHIP SUMMARY ===')
    Object.entries(contentByAdmin).forEach(([email, counts]) => {
      console.log(`${email}: ${counts.total} total items`)
      console.log(`  Topics: ${counts.topics}, Courses: ${counts.courses}, Goals: ${counts.goals}`)
      console.log(`  Enrollments: ${counts.enrollments}, Vacancies: ${counts.vacancies}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

investigateAdmins()