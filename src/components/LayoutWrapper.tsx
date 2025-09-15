'use client'

import { usePathname } from 'next/navigation'
import MainHeader from './MainHeader'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  
  // Don't show header on admin pages
  const isAdminPage = pathname?.startsWith('/admin')
  
  return (
    <>
      {!isAdminPage && <MainHeader />}
      {children}
    </>
  )
}