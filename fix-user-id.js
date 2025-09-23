const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixUserIdIssue() {
  try {
    const sessionUserId = 'cmfjrayar0000gxu7q0ilmuq7'
    const email = 'pawlovtaras@gmail.com'
    
    // Check if user with session ID exists
    const sessionUser = await prisma.user.findUnique({
      where: { id: sessionUserId }
    })
    
    if (sessionUser) {
      console.log('Session user found:', sessionUser)
      
      // Update this user to ADMIN if not already
      if (sessionUser.role !== 'ADMIN') {
        const updatedUser = await prisma.user.update({
          where: { id: sessionUserId },
          data: { role: 'ADMIN' },
          select: { id: true, email: true, name: true, role: true }
        })
        console.log('Updated user role:', updatedUser)
      } else {
        console.log('User already has ADMIN role')
      }
    } else {
      console.log('Session user not found. Creating user with session ID...')
      
      // Create user with the session ID
      const newUser = await prisma.user.create({
        data: {
          id: sessionUserId,
          email: email,
          name: 'Taras Pavlov',
          role: 'ADMIN',
          image: 'https://lh3.googleusercontent.com/a/ACg8ocI3AVHFf8iIEoiHTUl7aW73cA1LOONtrcy1S29FQo-q8jHxrn1X=s96-c'
        }
      })
      console.log('Created user:', newUser)
    }
    
    // Show all users with this email
    const usersWithEmail = await prisma.user.findMany({
      where: { email: email },
      select: { id: true, email: true, name: true, role: true }
    })
    
    console.log('All users with this email:', usersWithEmail)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserIdIssue()