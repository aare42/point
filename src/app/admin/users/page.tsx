'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface User {
  id: string
  name?: string
  email: string
  image?: string
  role: 'USER' | 'EDITOR' | 'ADMIN'
  isBlocked: boolean
  createdAt: string
  updatedAt: string
  _count: {
    authoredTopics: number
    goals: number
    educatedCourses: number
    enrollments: number
    authoredVacancies: number
  }
}

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'EDITOR' | 'ADMIN'>('ALL')
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [blockingUser, setBlockingUser] = useState<string | null>(null)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [isRootAdmin, setIsRootAdmin] = useState(false)

  useEffect(() => {
    fetchUsers()
    checkRootAdminStatus()
  }, [session])

  const checkRootAdminStatus = async () => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        // Check if current user is the first admin (root admin)
        const allAdmins = data.filter((user: User) => user.role === 'ADMIN')
        const firstAdmin = allAdmins.sort((a: User, b: User) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0]
        setIsRootAdmin(firstAdmin?.id === session.user.id)
      }
    } catch (error) {
      console.error('Error checking root admin status:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'USER' | 'EDITOR' | 'ADMIN') => {
    setUpdatingRole(userId)
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (response.ok) {
        // Update user in state
        setUsers(users.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        ))
        
        const result = await response.json()
        // You could show a success toast here
        console.log(result.message)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update user role')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      alert('Failed to update user role')
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleBlockUser = async (userId: string, block: boolean) => {
    if (!isRootAdmin) {
      alert('Only root admin can block/unblock users')
      return
    }

    const action = block ? 'block' : 'unblock'
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return
    }

    setBlockingUser(userId)
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: block ? 'POST' : 'DELETE'
      })

      if (response.ok) {
        setUsers(users.map(user => 
          user.id === userId ? { ...user, isBlocked: block } : user
        ))
        
        const result = await response.json()
        console.log(result.message)
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${action} user`)
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error)
      alert(`Failed to ${action} user`)
    } finally {
      setBlockingUser(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!isRootAdmin) {
      alert('Only root admin can delete users')
      return
    }

    const user = users.find(u => u.id === userId)
    if (!confirm(
      `Are you sure you want to PERMANENTLY DELETE ${user?.email}? ` +
      `This will delete all their content (courses, goals, topics, etc.) and cannot be undone.`
    )) {
      return
    }

    setDeletingUser(userId)
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId))
        
        const result = await response.json()
        console.log(result.message)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    } finally {
      setDeletingUser(null)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800'
      case 'EDITOR': return 'bg-yellow-100 text-yellow-800'
      case 'USER': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const usersByRole = {
    ALL: users.length,
    USER: users.filter(u => u.role === 'USER').length,
    EDITOR: users.filter(u => u.role === 'EDITOR').length,
    ADMIN: users.filter(u => u.role === 'ADMIN').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage user accounts, roles, and permissions</p>
          {isRootAdmin && (
            <p className="text-sm text-blue-600 mt-2">
              🔒 Root Admin: You have additional privileges to block and delete users
            </p>
          )}
        </div>
        <div className="flex space-x-4">
          <Link
            href="/admin/manage"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← Back to Management
          </Link>
        </div>
      </div>


      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex space-x-2">
            {(['ALL', 'USER', 'EDITOR', 'ADMIN'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  roleFilter === role
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role} ({usersByRole[role]})
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          {filteredUsers.length} users found
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name || user.email}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                        <span className="text-gray-600 font-medium">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="space-y-1">
                    {user._count.educatedCourses > 0 && (
                      <div className="text-xs">📚 {user._count.educatedCourses} courses</div>
                    )}
                    {user._count.enrollments > 0 && (
                      <div className="text-xs">🎓 {user._count.enrollments} enrollments</div>
                    )}
                    {user._count.authoredTopics > 0 && (
                      <div className="text-xs">🧠 {user._count.authoredTopics} topics</div>
                    )}
                    {user._count.goals > 0 && (
                      <div className="text-xs">🎯 {user._count.goals} goals</div>
                    )}
                    {user._count.authoredVacancies > 0 && (
                      <div className="text-xs">💼 {user._count.authoredVacancies} vacancies</div>
                    )}
                    {Object.values(user._count).every(count => count === 0) && (
                      <div className="text-xs text-gray-400">No activity</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="space-y-2">
                    <div>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'USER' | 'EDITOR' | 'ADMIN')}
                        disabled={updatingRole === user.id}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      >
                        <option value="USER">USER</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      {updatingRole === user.id && (
                        <div className="text-xs text-gray-500 mt-1">Updating...</div>
                      )}
                    </div>
                    
                    {isRootAdmin && user.id !== session?.user?.id && (
                      <div className="space-x-2">
                        <button
                          onClick={() => handleBlockUser(user.id, !user.isBlocked)}
                          disabled={blockingUser === user.id}
                          className={`text-xs px-2 py-1 rounded ${
                            user.isBlocked 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          } disabled:opacity-50 transition-colors`}
                        >
                          {blockingUser === user.id ? '...' : (user.isBlocked ? 'Unblock' : 'Block')}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingUser === user.id}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                        >
                          {deletingUser === user.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    )}
                    
                    {isRootAdmin && user.id === session?.user?.id && (
                      <div className="text-xs text-gray-500">Root Admin (You)</div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No users found</div>
            {search && (
              <div className="text-gray-400 text-sm mt-2">
                Try adjusting your search terms or filters
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}