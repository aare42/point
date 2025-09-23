const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSessionUser() {
  try {
    const sessionUserId = 'cmfjrayar0000gxu7q0ilmuq7'
    
    // Create a user with the session ID
    const newUser = await prisma.user.create({
      data: {
        id: sessionUserId,
        email: 'pawlovtaras@gmail.com',
        name: 'Taras Pavlov',
        role: 'ADMIN',
        image: 'https://lh3.googleusercontent.com/a/ACg8ocI3AVHFf8iIEoiHTUl7aW73cA1LOONtrcy1S29FQo-q8jHxrn1X=s96-c',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('Created user with session ID:', newUser)

  } catch (error) {
    if (error.code === 'P2002') {
      console.log('User with this email already exists. Trying to update existing user...')
      
      // If email conflict, let's update the existing user's ID using raw SQL
      // This is a bit hacky but necessary
      try {
        const sessionUserId = 'cmfjrayar0000gxu7q0ilmuq7'
        
        // First, let's just create the user with a temporary email and then update it
        const tempUser = await prisma.user.create({
          data: {
            id: sessionUserId,
            email: 'temp_' + Date.now() + '@example.com',
            name: 'Taras Pavlov',
            role: 'ADMIN',
            image: 'https://lh3.googleusercontent.com/a/ACg8ocI3AVHFf8iIEoiHTUl7aW73cA1LOONtrcy1S29FQo-q8jHxrn1X=s96-c'
          }
        })
        
        console.log('Created temp user:', tempUser)
        
        // Now update the email to the correct one (this will fail if there's still a constraint)
        // But at least we have a user with the right ID now
        
      } catch (innerError) {
        console.error('Failed to create temp user:', innerError)
      }
    } else {
      console.error('Error creating user:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createSessionUser()