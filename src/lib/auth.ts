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
  callbacks: {
    async signIn({ user, account, profile }) {
      // Clean approach: Always allow sign-in and handle user creation/linking by email
      if (account?.provider === 'google' && user?.email) {
        try {
          // Find or create user by email (primary key)
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          
          if (existingUser) {
            // User exists - ensure this Google account is linked
            const existingAccount = await prisma.account.findFirst({
              where: {
                provider: 'google',
                providerAccountId: account.providerAccountId
              }
            })
            
            if (!existingAccount) {
              // Link this Google account to existing user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  token_type: account.token_type,
                  expires_at: account.expires_at,
                  refresh_token: account.refresh_token,
                  scope: account.scope,
                  id_token: account.id_token
                }
              })
            }
            
            // Auto-promote your email to admin
            if (user.email === 'pawlovtaras@gmail.com' && existingUser.role !== 'ADMIN') {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { 
                  role: 'ADMIN',
                  createdAt: new Date('2020-01-01') // Root admin
                }
              })
            }
          }
          // If user doesn't exist, let Prisma adapter create it normally
        } catch (error) {
          console.error('SignIn callback error:', error)
          // Continue with sign-in even if linking fails
        }
      }
      
      return true
    },
    
    async session({ session, token }) {
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
    
    async jwt({ user, token }) {
      // Always fetch fresh user data from database
      if (token?.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, isBlocked: true, email: true }
          })
          
          if (dbUser) {
            token.sub = dbUser.id
            token.role = dbUser.role
            token.isBlocked = dbUser.isBlocked || false
            
            // Auto-promote your email to admin
            if (dbUser.email === 'pawlovtaras@gmail.com' && dbUser.role !== 'ADMIN') {
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { 
                  role: 'ADMIN',
                  createdAt: new Date('2020-01-01')
                }
              })
              token.role = 'ADMIN'
            }
          }
        } catch (error) {
          console.error('JWT callback error:', error)
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