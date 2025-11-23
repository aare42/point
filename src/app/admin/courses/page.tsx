'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedText } from '@/lib/utils/multilingual'

interface Course {
  id: string
  name: any // Multilingual object or string
  description?: any // Multilingual object or string
  isPublic: boolean
  isBlocked: boolean
  createdAt: string
  educator: {
    id: string
    name: string
    email: string
    isBlocked: boolean
  }
  _count: {
    topics: number
    enrollments: number
  }
}

export default function AdminCoursesPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [blockingCourse, setBlockingCourse] = useState<string | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null)
  const [isRootAdmin, setIsRootAdmin] = useState(false)

  useEffect(() => {
    fetchCourses()
    checkRootAdminStatus()
  }, [session])

  const checkRootAdminStatus = async () => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        // Check if current user is the first admin (root admin)
        const allAdmins = data.filter((user: any) => user.role === 'ADMIN')
        const firstAdmin = allAdmins.sort((a: any, b: any) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0]
        setIsRootAdmin(firstAdmin?.id === session.user.id)
      }
    } catch (error) {
      console.error('Error checking root admin status:', error)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/admin/courses')
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      } else {
        console.error('Failed to fetch courses')
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteCourse = async (courseId: string, courseName: any) => {
    const localizedName = getLocalizedText(courseName, language, 'Unknown')
    if (!confirm(`Are you sure you want to delete the course "${localizedName}"? This will remove all enrollments and cannot be undone.`)) {
      return
    }

    setDeleting(courseId)
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCourses(courses.filter(c => c.id !== courseId))
      } else {
        alert('Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
      alert('Failed to delete course')
    } finally {
      setDeleting(null)
    }
  }

  const togglePublic = async (courseId: string, isPublic: boolean) => {
    setUpdating(courseId)
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic })
      })

      if (response.ok) {
        setCourses(courses.map(c => 
          c.id === courseId ? { ...c, isPublic: !isPublic } : c
        ))
      } else {
        alert('Failed to update course visibility')
      }
    } catch (error) {
      console.error('Error updating course:', error)
      alert('Failed to update course visibility')
    } finally {
      setUpdating(null)
    }
  }

  const handleBlockCourse = async (courseId: string, block: boolean) => {
    if (!isRootAdmin) {
      alert('Only root admin can block/unblock courses')
      return
    }

    const course = courses.find(c => c.id === courseId)
    const localizedName = getLocalizedText(course?.name, language, 'Unknown')
    const action = block ? 'block' : 'unblock'
    
    if (!confirm(`Are you sure you want to ${action} the course "${localizedName}"?`)) {
      return
    }

    setBlockingCourse(courseId)
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/block`, {
        method: block ? 'POST' : 'DELETE'
      })

      if (response.ok) {
        setCourses(courses.map(c => 
          c.id === courseId ? { ...c, isBlocked: block } : c
        ))
        
        const result = await response.json()
        console.log(result.message)
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${action} course`)
      }
    } catch (error) {
      console.error(`Error ${action}ing course:`, error)
      alert(`Failed to ${action} course`)
    } finally {
      setBlockingCourse(null)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!isRootAdmin) {
      alert('Only root admin can permanently delete courses')
      return
    }

    const course = courses.find(c => c.id === courseId)
    const localizedName = getLocalizedText(course?.name, language, 'Unknown')
    
    if (!confirm(
      `Are you sure you want to PERMANENTLY DELETE the course "${localizedName}"? ` +
      `This will delete all enrollments and cannot be undone.`
    )) {
      return
    }

    setDeletingCourse(courseId)
    
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/delete`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCourses(courses.filter(c => c.id !== courseId))
        
        const result = await response.json()
        console.log(result.message)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete course')
      }
    } catch (error) {
      console.error('Error deleting course:', error)
      alert('Failed to delete course')
    } finally {
      setDeletingCourse(null)
    }
  }

  const filteredCourses = courses.filter(course => {
    const localizedName = getLocalizedText(course.name, language, '')
    const localizedDescription = getLocalizedText(course.description, language, '')
    return localizedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           course.educator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           localizedDescription.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📖 Course Management</h1>
          <p className="text-gray-600 mt-1">Manage all courses across your platform</p>
          {isRootAdmin && (
            <p className="text-sm text-blue-600 mt-2">
              🔒 Root Admin: You have additional privileges to block and delete courses
            </p>
          )}
        </div>
        <Link
          href="/educator/courses/new"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Course</span>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search courses, educators, or descriptions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>


      {/* Courses List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {filteredCourses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Educator
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Topics
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getLocalizedText(course.name, language, 'Unknown')}
                        </div>
                        {course.description && (
                          <div className="text-sm text-gray-500 truncate max-w-md">
                            {getLocalizedText(course.description, language, '')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{course.educator.name}</div>
                        <div className="text-sm text-gray-500">{course.educator.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {course._count.topics}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {course._count.enrollments}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="space-y-1">
                        {course.isBlocked && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            🚫 Blocked
                          </span>
                        )}
                        <button
                          onClick={() => togglePublic(course.id, course.isPublic)}
                          disabled={updating === course.id}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            course.isPublic 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          } ${updating === course.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {updating === course.id ? (
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1"></span>
                          ) : (
                            <span className="mr-1">{course.isPublic ? '🌍' : '🔒'}</span>
                          )}
                          {course.isPublic ? 'Public' : 'Private'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="space-y-2">
                        <div className="space-x-2">
                          <Link
                            href={`/admin/courses/${course.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/educator/courses/${course.id}`}
                            className="text-green-600 hover:text-green-900"
                            target="_blank"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => deleteCourse(course.id, course.name)}
                            disabled={deleting === course.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {deleting === course.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                        
                        {isRootAdmin && (
                          <div className="space-x-2">
                            <button
                              onClick={() => handleBlockCourse(course.id, !course.isBlocked)}
                              disabled={blockingCourse === course.id}
                              className={`text-xs px-2 py-1 rounded ${
                                course.isBlocked 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              } disabled:opacity-50 transition-colors`}
                            >
                              {blockingCourse === course.id ? '...' : (course.isBlocked ? 'Unblock' : 'Block')}
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              disabled={deletingCourse === course.id}
                              className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                            >
                              {deletingCourse === course.id ? '...' : 'Force Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No courses found' : 'No courses yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try adjusting your search terms.' : 'Create your first course to get started.'}
            </p>
            {!searchTerm && (
              <Link
                href="/educator/courses/new"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Course</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}