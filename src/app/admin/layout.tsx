'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'EDITOR')) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      {/* Enhanced Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Point</span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-600">Admin Control Center</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full px-4 py-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {session.user?.name?.charAt(0) || session.user?.email?.charAt(0)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{session.user?.name}</div>
                  <div className="text-xs text-indigo-600 font-medium">{session.user?.role}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          {/* Enhanced Sidebar */}
          <aside className="w-72">
            <div className="bg-white/60 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 sticky top-6">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🚀</span>
                  </div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Admin Center</h3>
                </div>
                
                {/* Main Sections */}
                <div className="space-y-4 mb-6">
                  <Link
                    href="/admin"
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-indigo-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">🏠</span>
                    <span>Admin Home</span>
                  </Link>
                  <Link
                    href="/admin/analytics"
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">📊</span>
                    <span>Analytics</span>
                  </Link>
                  <Link
                    href="/admin/manage"
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-emerald-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 transition-all duration-200 group"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">⚙️</span>
                    <span>Manage Data</span>
                  </Link>
                </div>

                {/* Direct Management Links */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Quick Access</h4>
                  <nav className="space-y-1">
                    <Link
                      href="/admin/topics"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 transition-all duration-200 group"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform">🧠</span>
                      <span>Topics</span>
                    </Link>
                    <Link
                      href="/admin/users"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-200 group"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform">👥</span>
                      <span>Users</span>
                    </Link>
                    <Link
                      href="/admin/courses"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-purple-700 hover:bg-purple-50 transition-all duration-200 group"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform">🎓</span>
                      <span>Courses</span>
                    </Link>
                    <Link
                      href="/admin/goal-templates"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-orange-700 hover:bg-orange-50 transition-all duration-200 group"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform">🎯</span>
                      <span>Goal Templates</span>
                    </Link>
                    <Link
                      href="/admin/vacancies"
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:text-teal-700 hover:bg-teal-50 transition-all duration-200 group"
                    >
                      <span className="text-sm group-hover:scale-110 transition-transform">💼</span>
                      <span>Vacancies</span>
                    </Link>
                  </nav>
                </div>

                {/* Quick Stats */}
                <div className="mt-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Platform Health</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">System Status</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-600 font-medium">Online</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Active Sessions</span>
                      <span className="text-indigo-600 font-medium">1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}