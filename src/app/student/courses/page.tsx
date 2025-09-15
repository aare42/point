'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Course {
  id: string
  name: string
  description?: string
  educator: {
    name: string
    email: string
  }
  enrolledAt: string
  progress: number
  totalTopics: number
  completedTopics: number
  totalEnrollments: number
}

export default function StudentCoursesPage() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchCourses()
    }
  }, [session])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/student/dashboard')
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses || [])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCourseStatusIcon = (progress: number) => {
    if (progress === 100) return '🎉'
    if (progress > 0) return '📚'
    return '🎯'
  }

  const getCourseStatusText = (progress: number) => {
    if (progress === 100) return 'Completed'
    if (progress > 0) return 'In Progress'
    return 'Enrolled'
  }

  const getCourseStatusColor = (progress: number) => {
    if (progress === 100) return 'bg-green-100 text-green-800'
    if (progress > 0) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your courses...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link
              href="/student"
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                📚 Your Courses
              </h1>
              <p className="text-gray-600">Track your progress across all enrolled courses</p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                {courses.length} {courses.length === 1 ? 'course' : 'courses'} enrolled
              </span>
            </div>
            <Link
              href="/courses"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Browse More Courses
            </Link>
          </div>
        </div>

        {/* Courses Grid */}
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900 line-clamp-2">{course.name}</h3>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getCourseStatusColor(course.progress)}`}>
                    {getCourseStatusIcon(course.progress)} {getCourseStatusText(course.progress)}
                  </span>
                </div>

                {course.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{course.description}</p>
                )}

                {/* Progress Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">Progress</span>
                    <span className="text-gray-500">{course.completedTopics}/{course.totalTopics} topics</span>
                  </div>
                  
                  {/* Segmented Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div className="flex h-full rounded-full overflow-hidden">
                      {Array.from({ length: course.totalTopics }, (_, index) => (
                        <div
                          key={index}
                          className={`flex-1 ${index < course.completedTopics 
                            ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' 
                            : 'bg-gray-200'
                          } ${index > 0 ? 'border-l-2 border-white' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <span className="text-lg font-bold text-indigo-600">{course.progress}%</span>
                    <span className="text-gray-500 text-sm ml-1">complete</span>
                  </div>
                </div>

                {/* Course Info */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Instructor: <span className="font-medium text-gray-700">{course.educator.name}</span>
                    </span>
                    <span className="text-gray-500">
                      {course.totalEnrollments} students
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Enrolled: {new Date(course.enrolledAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center space-x-2">
                  <Link
                    href={`/courses/${course.id}`}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center text-sm font-medium"
                  >
                    Continue Learning
                  </Link>
                  {course.progress === 100 && (
                    <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                      🏆 Completed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">📚</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">No courses yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start your learning journey by enrolling in courses that match your interests and goals.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link
                href="/courses"
                className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-lg"
              >
                Browse Courses
              </Link>
              <Link
                href="/student/goals/new"
                className="px-8 py-4 border border-indigo-300 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-colors font-semibold text-lg"
              >
                Set Learning Goals
              </Link>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        {courses.length > 0 && (
          <div className="mt-12 bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Learning Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <div className="text-3xl font-bold text-blue-600">{courses.length}</div>
                <div className="text-sm text-gray-600">Courses Enrolled</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                <div className="text-3xl font-bold text-green-600">
                  {courses.filter(c => c.progress === 100).length}
                </div>
                <div className="text-sm text-gray-600">Courses Completed</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
                <div className="text-3xl font-bold text-purple-600">
                  {courses.reduce((sum, c) => sum + c.completedTopics, 0)}
                </div>
                <div className="text-sm text-gray-600">Topics Mastered</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
                <div className="text-3xl font-bold text-orange-600">
                  {Math.round(courses.reduce((sum, c) => sum + c.progress, 0) / courses.length) || 0}%
                </div>
                <div className="text-sm text-gray-600">Average Progress</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}