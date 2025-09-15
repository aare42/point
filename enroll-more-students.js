const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Enrolling students in additional courses for realistic data...')

  // Get all courses and students
  const courses = await prisma.course.findMany()
  const students = await prisma.user.findMany({
    where: { 
      role: 'USER',
      email: { contains: '@' }
    }
  })

  console.log(`Found ${courses.length} courses and ${students.length} students`)

  // Enroll some students in other courses too (not everyone in every course)
  for (const course of courses) {
    // Skip if this is the course we already enrolled everyone in
    if (course.name === 'Frontend Fundamentals') continue
    
    console.log(`\nEnrolling students in: "${course.name}"`)
    
    // Randomly select 60-80% of students for each course
    const shuffledStudents = students.sort(() => 0.5 - Math.random())
    const enrollmentCount = Math.floor(students.length * (0.6 + Math.random() * 0.2))
    const studentsToEnroll = shuffledStudents.slice(0, enrollmentCount)
    
    let enrolled = 0
    for (const student of studentsToEnroll) {
      try {
        await prisma.courseEnrollment.create({
          data: {
            courseId: course.id,
            studentId: student.id
          }
        })
        enrolled++
      } catch (error) {
        // Skip if already enrolled
      }
    }
    
    console.log(`✓ Enrolled ${enrolled} students in "${course.name}"`)
  }

  console.log(`\n🎉 Additional enrollments completed!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })