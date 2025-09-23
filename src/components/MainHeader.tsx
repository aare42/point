'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import RoleSwitcher, { UserRole } from './RoleSwitcher'
import LanguageSwitcher from './LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'

export default function MainHeader() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [currentRole, setCurrentRole] = useState<UserRole>('STUDENT')
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Load saved role preference on mount
  useEffect(() => {
    const savedRole = localStorage.getItem('selectedRole') as UserRole
    if (savedRole && ['STUDENT', 'EDUCATOR', 'EMPLOYER'].includes(savedRole)) {
      setCurrentRole(savedRole)
    }
  }, [])

  if (!session) return null

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole)
    localStorage.setItem('selectedRole', newRole)
  }

  // Navigation links with translations
  const navigationLinks = [
    { name: t('nav.knowledge_graph'), href: '/knowledge-graph', icon: '🧠' },
    { name: t('nav.courses'), href: '/courses', icon: '📚' },
    { name: t('nav.vacancies'), href: '/vacancies', icon: '💼' },
    { name: t('nav.goals'), href: '/goals', icon: '🎯' }
  ]

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Point
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <span>{link.icon}</span>
                <span>{link.name}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* User menu, role switcher, and language switcher */}
          <div className="flex items-center space-x-4">
            {/* Admin panel link */}
            {(session.user?.role === 'ADMIN' || session.user?.role === 'EDITOR') && (
              <Link
                href="/admin"
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
              >
                {t('nav.admin')}
              </Link>
            )}

            {/* Language switcher */}
            <LanguageSwitcher />

            {/* Role switcher */}
            <RoleSwitcher 
              currentRole={currentRole} 
              onRoleChange={handleRoleChange}
            />

            {/* Sign out */}
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-600 hover:text-red-600 transition-colors"
            >
              {t('nav.sign_out')}
            </button>
          </div>
        </div>

        {/* Mobile navigation menu */}
        {showUserMenu && (
          <div className="md:hidden border-t border-gray-200 pt-4 pb-3">
            <div className="space-y-1">
              {navigationLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                  onClick={() => setShowUserMenu(false)}
                >
                  <span>{link.icon}</span>
                  <span>{link.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}