'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Topic {
  id: string
  name: string
  slug: string
  type: string
}

interface Student {
  id: string
  name: string
  email: string
}

interface StudentProgress {
  student: Student
  progress: {
    [topicId: string]: {
      status: string
      updatedAt: string
    }
  }
  totalCompleted: number
  totalTopics: number
  completionPercentage: number
}

interface Course {
  id: string
  name: string
  description?: string
  createdAt: string
  topics: {
    topic: Topic
  }[]
  _count: {
    enrollments: number
    topics: number
  }
}

interface CourseManagementData {
  course: Course
  studentsProgress: StudentProgress[]
}

const statusLabels = {
  NOT_LEARNED: 'Not Learned',
  WANT_TO_LEARN: 'Want to Learn', 
  LEARNING: 'Learning',
  LEARNED: 'Learned',
  LEARNED_AND_VALIDATED: 'Validated'
}

const statusColors = {
  NOT_LEARNED: 'bg-gray-100 text-gray-800',
  WANT_TO_LEARN: 'bg-blue-100 text-blue-800',
  LEARNING: 'bg-yellow-100 text-yellow-800',
  LEARNED: 'bg-green-100 text-green-800',
  LEARNED_AND_VALIDATED: 'bg-purple-100 text-purple-800'
}

export default function CourseManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [courseId, setCourseId] = useState<string>('')
  const [data, setData] = useState<CourseManagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  // Simplified to matrix view only
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const resolveParams = async () => {
      const resolvedParams = await params
      setCourseId(resolvedParams.id)
      await fetchCourseData(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  const fetchCourseData = async (id: string) => {
    try {
      const response = await fetch(`/api/educator/courses/${id}`)
      if (response.ok) {
        const courseData = await response.json()
        setData(courseData)
      } else if (response.status === 404) {
        router.push('/educator')
      } else {
        console.error('Failed to fetch course data')
      }
    } catch (error) {
      console.error('Error fetching course data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStudentStatus = async (studentId: string, topicId: string, newStatus: string) => {
    const updateKey = `${studentId}-${topicId}`
    setUpdating(updateKey)
    
    try {
      const response = await fetch(`/api/educator/courses/${courseId}/students/${studentId}/topics/${topicId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Refresh data to show updated status
        await fetchCourseData(courseId)
      } else {
        alert('Failed to update student status')
      }
    } catch (error) {
      console.error('Error updating student status:', error)
      alert('Failed to update student status')
    } finally {
      setUpdating(null)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading course management...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto text-center py-20">
          <p className="text-red-600 font-medium">Failed to load course data</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link
              href="/educator"
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{data.course.name}</h1>
              <p className="text-gray-600 mt-1">{data.course.description}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link
                href={`/educator/courses/${courseId}/edit`}
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
              >
                Edit Course
              </Link>
            </div>
          </div>

          {/* Course Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-indigo-600">{data.course._count.enrollments}</div>
              <div className="text-sm text-gray-600">Enrolled Students</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-green-600">{data.course._count.topics}</div>
              <div className="text-sm text-gray-600">Course Topics</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-purple-600">
                {data.studentsProgress.length > 0 
                  ? Math.round(data.studentsProgress.reduce((sum, s) => sum + s.completionPercentage, 0) / data.studentsProgress.length)
                  : 0}%
              </div>
              <div className="text-sm text-gray-600">Average Completion</div>
            </div>
          </div>
        </div>

        {/* Student-Topic Progress Matrix */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Student Progress Management</h2>
            <p className="text-sm text-gray-600 mt-1">Click on status dropdowns to update student progress for each topic</p>
          </div>
          
          {data.studentsProgress.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 border-r border-gray-200">
                      Student
                    </th>
                    {data.course.topics.map((courseTopic) => {
                      const getTopicIcon = (type: string) => {
                        switch (type) {
                          case 'THEORY': return '📚'
                          case 'PRACTICE': return '🔧'  
                          case 'PROJECT': return '🚀'
                          default: return '📖'
                        }
                      }
                      
                      return (
                        <th key={courseTopic.topic.id} className="px-2 py-4 text-center text-xs font-semibold text-gray-900 border-r border-gray-200 w-20 min-w-20 max-w-20" title={`${courseTopic.topic.name} (${courseTopic.topic.type})`}>
                          <div className="flex flex-col items-center space-y-1">
                            <div className="text-lg">
                              {getTopicIcon(courseTopic.topic.type)}
                            </div>
                            <div className="text-xs leading-tight text-center break-words line-clamp-2 max-w-16">
                              {courseTopic.topic.name}
                            </div>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.studentsProgress.map((studentProgress) => (
                    <tr key={studentProgress.student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white border-r border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="relative w-12 h-12">
                              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-gray-200"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className="text-indigo-600"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  fill="none"
                                  strokeDasharray={`${studentProgress.completionPercentage}, 100`}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold text-gray-900">
                                  {studentProgress.totalCompleted}/{studentProgress.totalTopics}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {studentProgress.student.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {studentProgress.student.email.split('@')[0]}
                            </div>
                          </div>
                        </div>
                      </td>
                      {data.course.topics.map((courseTopic) => {
                        const topicStatus = studentProgress.progress[courseTopic.topic.id]
                        const status = topicStatus?.status || 'NOT_LEARNED'
                        const updateKey = `${studentProgress.student.id}-${courseTopic.topic.id}`
                        const isUpdating = updating === updateKey
                        
                        const isLearned = status === 'LEARNED' || status === 'LEARNED_AND_VALIDATED'
                        const isValidated = status === 'LEARNED_AND_VALIDATED'
                        
                        return (
                          <td key={courseTopic.topic.id} className="px-2 py-3 text-center border-r border-gray-200 w-20 min-w-20 max-w-20">
                            <div className="flex items-center justify-center">
                              {isUpdating ? (
                                <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                              ) : isValidated ? (
                                <span className="w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-sm font-bold">
                                  ✓
                                </span>
                              ) : (
                                <label className="cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isLearned}
                                    onChange={(e) => {
                                      const newStatus = e.target.checked ? 'LEARNED' : 'LEARNING'
                                      updateStudentStatus(studentProgress.student.id, courseTopic.topic.id, newStatus)
                                    }}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 border-r border-gray-200">
                      Topic Completion
                    </td>
                    {data.course.topics.map((courseTopic) => {
                      // Calculate completion percentage for this topic across all students
                      const completedCount = data.studentsProgress.reduce((count, studentProgress) => {
                        const topicStatus = studentProgress.progress[courseTopic.topic.id]
                        const status = topicStatus?.status || 'NOT_LEARNED'
                        return count + (status === 'LEARNED' || status === 'LEARNED_AND_VALIDATED' ? 1 : 0)
                      }, 0)
                      const topicCompletionPercentage = data.studentsProgress.length > 0 
                        ? Math.round((completedCount / data.studentsProgress.length) * 100)
                        : 0
                      
                      return (
                        <td key={courseTopic.topic.id} className="px-2 py-3 text-center border-r border-gray-200 w-20 min-w-20 max-w-20">
                          <div className="flex justify-center">
                            <div className="relative w-10 h-10">
                              <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-gray-200"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className="text-indigo-600"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeDasharray={`${topicCompletionPercentage}, 100`}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold text-gray-900 leading-none">
                                  {completedCount}/{data.studentsProgress.length}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No enrolled students</h3>
              <p className="text-gray-600">Students will appear here once they enroll in your course.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}