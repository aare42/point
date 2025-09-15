const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Creating mock students and enrolling them in courses...')

  // First, get existing courses
  const courses = await prisma.course.findMany()
  if (courses.length === 0) {
    console.log('No courses found. Please run create-mock-data.js first.')
    return
  }

  const testCourse = courses[0] // Use the first course as our test course
  console.log(`Using course: "${testCourse.name}" for enrollment`)

  // Create diverse mock student users
  const mockStudents = [
    {
      email: 'alice.johnson@student.edu',
      name: 'Alice Johnson',
      role: 'USER',
    },
    {
      email: 'bob.smith@university.edu',
      name: 'Bob Smith',
      role: 'USER',
    },
    {
      email: 'carol.williams@college.edu',
      name: 'Carol Williams',
      role: 'USER',
    },
    {
      email: 'david.brown@academy.edu',
      name: 'David Brown',
      role: 'USER',
    },
    {
      email: 'emma.davis@institute.edu',
      name: 'Emma Davis',
      role: 'USER',
    },
    {
      email: 'frank.miller@school.edu',
      name: 'Frank Miller',
      role: 'USER',
    },
    {
      email: 'grace.wilson@campus.edu',
      name: 'Grace Wilson',
      role: 'USER',
    },
    {
      email: 'henry.moore@learning.edu',
      name: 'Henry Moore',
      role: 'USER',
    },
    {
      email: 'isabel.taylor@student.org',
      name: 'Isabel Taylor',
      role: 'USER',
    },
    {
      email: 'jack.anderson@uni.edu',
      name: 'Jack Anderson',
      role: 'USER',
    },
    {
      email: 'kate.thomas@academy.org',
      name: 'Kate Thomas',
      role: 'USER',
    },
    {
      email: 'liam.jackson@education.edu',
      name: 'Liam Jackson',
      role: 'USER',
    }
  ]

  console.log(`Creating ${mockStudents.length} mock students...`)

  // Create students
  const createdStudents = []
  for (const studentData of mockStudents) {
    try {
      const student = await prisma.user.create({
        data: studentData
      })
      createdStudents.push(student)
      console.log(`✓ Created student: ${student.name}`)
    } catch (error) {
      console.log(`- Skipped ${studentData.name} (might already exist)`)
    }
  }

  console.log(`\nEnrolling students in course: "${testCourse.name}"...`)

  // Enroll students in the test course
  let enrollmentCount = 0
  for (const student of createdStudents) {
    try {
      await prisma.courseEnrollment.create({
        data: {
          courseId: testCourse.id,
          studentId: student.id
        }
      })
      console.log(`✓ Enrolled: ${student.name}`)
      enrollmentCount++
    } catch (error) {
      console.log(`- Skipped enrollment for ${student.name} (might already be enrolled)`)
    }
  }

  // Get course topics to create some student progress
  const courseTopics = await prisma.courseTopic.findMany({
    where: { courseId: testCourse.id },
    include: { topic: true }
  })

  console.log(`\nCreating realistic student progress...`)

  // Create varied progress for students
  const statuses = ['NOT_LEARNED', 'WANT_TO_LEARN', 'LEARNING', 'LEARNED']
  
  for (const student of createdStudents) {
    // Each student will have different progress levels
    const progressLevel = Math.random()
    
    for (let i = 0; i < courseTopics.length; i++) {
      const topic = courseTopics[i].topic
      let status = 'NOT_LEARNED'
      
      // Create realistic progression - earlier topics more likely to be completed
      const topicProgress = progressLevel - (i * 0.2) + (Math.random() * 0.3)
      
      if (topicProgress > 0.8) status = 'LEARNED'
      else if (topicProgress > 0.5) status = 'LEARNING'
      else if (topicProgress > 0.2) status = 'WANT_TO_LEARN'
      
      try {
        await prisma.studentTopic.create({
          data: {
            userId: student.id,
            topicId: topic.id,
            status: status
          }
        })
      } catch (error) {
        // Skip if already exists
      }
    }
    
    console.log(`✓ Created progress for: ${student.name}`)
  }

  console.log(`\n🎉 Mock data creation completed!`)
  console.log(`Summary:`)
  console.log(`- Created ${createdStudents.length} mock students`)
  console.log(`- Enrolled ${enrollmentCount} students in "${testCourse.name}"`)
  console.log(`- Generated realistic learning progress for each student`)
  console.log(`\nYou can now test the educator view for managing students!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })