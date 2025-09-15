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
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub
        if (token.role) {
          session.user.role = token.role as any
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
      
      if (token.sub && !token.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
        })
        if (dbUser) {
          token.role = dbUser.role
          
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
      
      return token
    },
  },
  session: {
    strategy: 'jwt',
  },
}