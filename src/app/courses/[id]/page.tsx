'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopicType } from '@prisma/client'

interface Topic {
  id: string
  name: string
  slug: string
  type: TopicType
  description?: string
}

interface CourseTopic {
  topic: Topic
}

interface Educator {
  id: string
  name: string
  email: string
}

interface Enrollment {
  student: {
    id: string
    name: string
    email: string
  }
}

interface Course {
  id: string
  name: string
  description?: string
  createdAt: string
  educator: Educator
  topics: CourseTopic[]
  enrollments: Enrollment[]
  _count: {
    topics: number
    enrollments: number
  }
}

export default function PublicCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [courseId, setCourseId] = useState<string>('')
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [unenrolling, setUnenrolling] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [canEnroll, setCanEnroll] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const resolveParams = async () => {
      const resolvedParams = await params
      setCourseId(resolvedParams.id)
      await fetchCourse(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  const fetchCourse = async (id: string) => {
    try {
      const response = await fetch(`/api/courses/${id}`)
      if (response.ok) {
        const courseData = await response.json()
        setCourse(courseData)
        
        // Check if user is already enrolled and can enroll
        const sessionResponse = await fetch('/api/auth/session')
        if (sessionResponse.ok) {
          const session = await sessionResponse.json()
          if (session?.user?.id) {
            const userIsEducator = courseData.educator.id === session.user.id
            const userIsEnrolled = courseData.enrollments.some(
              (e: Enrollment) => e.student.id === session.user.id
            )
            
            setIsEnrolled(userIsEnrolled)
            setCanEnroll(!userIsEducator && !userIsEnrolled)
          }
        }
      } else if (response.status === 404) {
        alert('Course not found')
        router.push('/courses')
      } else {
        alert('Failed to load course')
      }
    } catch (error) {
      console.error('Failed to fetch course:', error)
      alert('Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    setEnrolling(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST'
      })

      if (response.ok) {
        setIsEnrolled(true)
        setCanEnroll(false)
        // Refresh course data to update enrollment count
        await fetchCourse(courseId)
        alert('Successfully enrolled in course!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to enroll in course')
      }
    } catch (error) {
      console.error('Error enrolling:', error)
      alert('Failed to enroll in course')
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenroll = async () => {
    if (!confirm('Are you sure you want to unenroll from this course?')) return

    setUnenrolling(true)
    try {
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setIsEnrolled(false)
        setCanEnroll(true)
        // Refresh course data to update enrollment count
        await fetchCourse(courseId)
        alert('Successfully unenrolled from course')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to unenroll from course')
      }
    } catch (error) {
      console.error('Error unenrolling:', error)
      alert('Failed to unenroll from course')
    } finally {
      setUnenrolling(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading course...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!course) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link
              href="/courses"
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
                {isEnrolled && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    Enrolled
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-gray-600">
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>By {course.educator.name}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M9 20H4v-2a3 3 0 015.196-2.121m11.828-9.243a4 4 0 00-5.656 0L16 14h.01M9 14h.01l5.657-5.657a4 4 0 015.656 0z" />
                  </svg>
                  <span>{course._count.enrollments} students</span>
                </span>
                <span>{new Date(course.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About This Course</h2>
              {course.description ? (
                <p className="text-gray-700 leading-relaxed">{course.description}</p>
              ) : (
                <p className="text-gray-500 italic">No description available.</p>
              )}
            </div>

            {/* Topics Covered */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Topics Covered ({course._count.topics})</h2>
              {course.topics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.topics.map((courseTopic, index) => (
                    <div
                      key={courseTopic.topic.id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm ${
                          courseTopic.topic.type === 'THEORY' ? 'bg-blue-500' :
                          courseTopic.topic.type === 'PRACTICE' ? 'bg-green-500' : 'bg-purple-500'
                        }`}>
                          {courseTopic.topic.type === 'THEORY' && '📚'}
                          {courseTopic.topic.type === 'PRACTICE' && '⚙️'}
                          {courseTopic.topic.type === 'PROJECT' && '🚀'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{courseTopic.topic.name}</h3>
                          <p className="text-sm text-gray-500 capitalize">{courseTopic.topic.type.toLowerCase()}</p>
                          {courseTopic.topic.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{courseTopic.topic.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📚</div>
                  <p>No topics added yet</p>
                </div>
              )}
            </div>

            {/* Instructor */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Instructor</h2>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {course.educator.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{course.educator.name}</h3>
                  <p className="text-sm text-gray-600">{course.educator.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Action */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">{course._count.enrollments}</div>
                <div className="text-sm text-gray-600 mb-6">Students Enrolled</div>
                
                {canEnroll && (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
                  >
                    {enrolling && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <span>{enrolling ? 'Enrolling...' : 'Enroll in Course'}</span>
                  </button>
                )}
                
                {isEnrolled && (
                  <div className="space-y-3">
                    <div className="w-full px-6 py-3 bg-green-100 text-green-800 rounded-lg font-medium flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>You're enrolled!</span>
                    </div>
                    <button
                      onClick={handleUnenroll}
                      disabled={unenrolling}
                      className="w-full px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm flex items-center justify-center space-x-2"
                    >
                      {unenrolling && (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      <span>{unenrolling ? 'Unenrolling...' : 'Unenroll'}</span>
                    </button>
                  </div>
                )}
                
                {!canEnroll && !isEnrolled && (
                  <div className="w-full px-6 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium">
                    Cannot enroll
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
              <div className="space-y-2">
                <Link
                  href="/courses"
                  className="block px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                >
                  Browse All Courses
                </Link>
                <Link
                  href="/knowledge-graph"
                  className="block px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                >
                  Knowledge Graph
                </Link>
                <Link
                  href="/student"
                  className="block px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                >
                  Student Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}