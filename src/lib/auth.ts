import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    error: '/auth/error',
  },
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub
        if (token.role) {
          session.user.role = token.role as any
        }
        
        // Block access for blocked users
        if (token.isBlocked) {
          throw new Error('User account has been blocked. Please contact support.')
        }
      }
      return session
    },
    jwt: async ({ user, token, trigger }) => {
      if (user) {
        token.uid = user.id
        
        // Auto-grant admin to specific email
        if (user.email === 'pawlovtaras@gmail.com') {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
          }).catch(() => {}) // Ignore errors if already admin
          token.role = 'ADMIN'
        }
      }
      
      // Always check user status for existing tokens
      if (token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, isBlocked: true, email: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            token.isBlocked = dbUser.isBlocked || false // Default to false if field doesn't exist
            
            // Auto-grant admin to specific email (also check here)
            if (dbUser.email === 'pawlovtaras@gmail.com' && dbUser.role !== 'ADMIN') {
              await prisma.user.update({
                where: { id: token.sub },
                data: { role: 'ADMIN' }
              }).catch(() => {})
              token.role = 'ADMIN'
            }
          }
        } catch (error) {
          // Fallback for when isBlocked field doesn't exist yet (during migration)
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, email: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            token.isBlocked = false // Default to false during migration period
          
            // Auto-grant admin to specific email (also check here)
            if (dbUser.email === 'pawlovtaras@gmail.com' && dbUser.role !== 'ADMIN') {
              await prisma.user.update({
                where: { id: token.sub },
                data: { role: 'ADMIN' }
              }).catch(() => {})
              token.role = 'ADMIN'
            }
          }
        }
      }
      
      return token
    },
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
}