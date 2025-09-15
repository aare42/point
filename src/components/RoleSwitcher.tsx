'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export type UserRole = 'STUDENT' | 'EDUCATOR' | 'EMPLOYER'

interface RoleSwitcherProps {
  currentRole: UserRole
  onRoleChange: (role: UserRole) => void
}

export default function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()

  const roles = [
    {
      id: 'STUDENT' as UserRole,
      name: 'Student',
      icon: '🎓',
      description: 'Learn and track progress'
    },
    {
      id: 'EDUCATOR' as UserRole,
      name: 'Educator', 
      icon: '👨‍🏫',
      description: 'Teach and create courses'
    },
    {
      id: 'EMPLOYER' as UserRole,
      name: 'Employer',
      icon: '💼',
      description: 'Find talent and post jobs'
    }
  ]

  const currentRoleData = roles.find(role => role.id === currentRole)

  const handleRoleSwitch = (newRole: UserRole) => {
    onRoleChange(newRole)
    setIsOpen(false)
    
    // Save the role to localStorage for persistence
    localStorage.setItem('selectedRole', newRole)
    
    // Automatically redirect to the appropriate dashboard
    const dashboardRoutes = {
      STUDENT: '/student',
      EDUCATOR: '/educator', 
      EMPLOYER: '/employer'
    }
    
    router.push(dashboardRoutes[newRole])
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{currentRoleData?.icon}</span>
          <span className="text-sm font-medium text-gray-700">{currentRoleData?.name}</span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || session.user.email || ''}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {(session?.user?.name || session?.user?.email || '').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900">{session?.user?.name}</div>
                  <div className="text-sm text-gray-500">{session?.user?.email}</div>
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-2">
                Switch Role
              </div>
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSwitch(role.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left hover:bg-gray-50 transition-colors ${
                    currentRole === role.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span className="text-lg">{role.icon}</span>
                  <div>
                    <div className="font-medium">{role.name}</div>
                    <div className="text-xs text-gray-500">{role.description}</div>
                  </div>
                  {currentRole === role.id && (
                    <svg className="w-4 h-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}