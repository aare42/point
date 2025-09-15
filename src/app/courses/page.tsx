'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { TopicType } from '@prisma/client'

interface Topic {
  id: string
  name: string
  slug: string
  type: TopicType
}

interface CourseTopic {
  topic: Topic
}

interface Educator {
  id: string
  name: string
  email: string
}

interface Course {
  id: string
  name: string
  description?: string
  createdAt: string
  educator: Educator
  topics: CourseTopic[]
  _count: {
    topics: number
    enrollments: number
  }
}

const statusColors = {
  NOT_LEARNED: 'bg-gray-100 text-gray-800',
  WANT_TO_LEARN: 'bg-blue-100 text-blue-800',
  LEARNING: 'bg-yellow-100 text-yellow-800',
  LEARNED: 'bg-green-100 text-green-800',
  LEARNED_AND_VALIDATED: 'bg-purple-100 text-purple-800'
}

export default function CoursesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [topicSearch, setTopicSearch] = useState<string>('')
  const [userTopics, setUserTopics] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    fetchCourses()
    if (session?.user) {
      fetchUserTopics()
    }
  }, [session])

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const coursesData = await response.json()
        setCourses(coursesData)
      } else {
        console.error('Failed to fetch courses')
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserTopics = async () => {
    try {
      const response = await fetch('/api/student/topics')
      if (response.ok) {
        const topics = await response.json()
        setUserTopics(topics)
      }
    } catch (error) {
      console.error('Error fetching user topics:', error)
    }
  }


  const getTopicStatus = (topicId: string) => {
    const userTopic = userTopics.find(ut => ut.id === topicId)
    return userTopic?.status || 'NOT_LEARNED'
  }

  const getTopicStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.NOT_LEARNED
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = searchQuery === '' || 
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.educator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesTopic = topicSearch === '' || 
      course.topics.some(ct => ct.topic.name.toLowerCase().includes(topicSearch.toLowerCase()))
    
    return matchesSearch && matchesTopic
  })

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading courses...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                📚 Browse Courses
              </h1>
              <p className="text-gray-600">
                Discover courses created by educators and start your learning journey
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-4">
              <Link
                href="/student"
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
              >
                Student Dashboard
              </Link>
              <Link
                href="/knowledge-graph"
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
              >
                Knowledge Graph
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search courses, instructors, or descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Topic Search */}
            <div className="md:w-64">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by topic name..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-gray-600">
            Found <strong>{filteredCourses.length}</strong> course{filteredCourses.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
          {(searchQuery || topicSearch) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setTopicSearch('')
              }}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl hover:border-indigo-300 transition-all cursor-pointer group"
                onClick={() => router.push(`/courses/${course.id}`)}
              >
                <div className="p-6">
                  {/* Course Header */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {course.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{course.educator.name}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {course.description && (
                    <p className="text-gray-700 text-sm mb-4 line-clamp-3">
                      {course.description}
                    </p>
                  )}

                  {/* Topics Preview */}
                  {course.topics.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {course.topics.slice(0, 3).map((courseTopic) => {
                          const status = session?.user ? getTopicStatus(courseTopic.topic.id) : 'NOT_LEARNED'
                          const statusColor = getTopicStatusColor(status)
                          return (
                            <span
                              key={courseTopic.topic.id}
                              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                              title={session?.user ? `${courseTopic.topic.name} - Status: ${status.replace('_', ' ').toLowerCase()}` : courseTopic.topic.name}
                            >
                              <span>
                                {courseTopic.topic.type === 'THEORY' && '📚'}
                                {courseTopic.topic.type === 'PRACTICE' && '⚙️'}
                                {courseTopic.topic.type === 'PROJECT' && '🚀'}
                              </span>
                              <span>{courseTopic.topic.name}</span>
                            </span>
                          )
                        })}
                        {course.topics.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            +{course.topics.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Course Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>{course._count.topics} topics</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span>{course._count.enrollments} students</span>
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-6">
              {searchQuery || topicSearch ? '🔍' : '📚'}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {searchQuery || topicSearch ? 'No courses found' : 'No courses available yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || topicSearch 
                ? 'Try adjusting your search or filters to find more courses.'
                : 'Educators haven\'t created any courses yet. Check back later!'}
            </p>
            {(searchQuery || topicSearch) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setTopicSearch('')
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* CTA Section */}
        {courses.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 text-center border border-indigo-100">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start Learning?</h3>
            <p className="text-gray-600 mb-6">
              Explore the knowledge graph to see how topics connect and plan your learning path.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link
                href="/knowledge-graph"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Explore Knowledge Graph
              </Link>
              <Link
                href="/student"
                className="px-6 py-3 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
              >
                Student Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}