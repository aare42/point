const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixUserIdIssue() {
  try {
    const sessionUserId = 'cmfjrayar0000gxu7q0ilmuq7'
    const email = 'pawlovtaras@gmail.com'
    
    // Find the existing admin user with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    })
    
    if (existingUser) {
      console.log('Found existing user:', existingUser)
      
      if (existingUser.id !== sessionUserId) {
        console.log('User ID mismatch. Need to update user ID to match session.')
        
        // Since we can't update the ID directly (it's a primary key), 
        // we need to delete the old user and create a new one with the session ID
        // But first, let's check if there are any dependencies
        
        // Delete the existing user and create a new one with correct ID
        console.log('Deleting old user and creating new one with session ID...')
        
        await prisma.user.delete({
          where: { id: existingUser.id }
        })
        
        const newUser = await prisma.user.create({
          data: {
            id: sessionUserId,
            email: existingUser.email,
            name: existingUser.name,
            role: 'ADMIN', // Ensure ADMIN role
            image: existingUser.image
          }
        })
        
        console.log('Created new user:', newUser)
      } else {
        console.log('User ID already matches session ID')
        
        // Just ensure the user has ADMIN role
        if (existingUser.role !== 'ADMIN') {
          const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: { role: 'ADMIN' }
          })
          console.log('Updated user role to ADMIN:', updatedUser)
        }
      }
    } else {
      console.log('No user found with this email')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserIdIssue()