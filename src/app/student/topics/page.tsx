'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedText } from '@/lib/utils/multilingual'

interface Topic {
  id: string
  name: string | any
  localizedName?: string
  slug: string
  type: string
  keypoints: string | any
  description?: string | any
  status: string
  updatedAt: string
  author: {
    name: string
  }
  prerequisites: Array<{
    prerequisite: {
      id: string
      name: string | any
      localizedName?: string
      slug: string
    }
  }>
}

const statusLabels = {
  NOT_LEARNED: 'Not Learned',
  WANT_TO_LEARN: 'Want to Learn',
  LEARNING: 'Learning',
  LEARNED: 'Learned',
  LEARNED_AND_VALIDATED: 'Validated'
}

const statusColors = {
  NOT_LEARNED: 'bg-gray-100 text-gray-800 border-gray-300',
  WANT_TO_LEARN: 'bg-blue-100 text-blue-800 border-blue-300',
  LEARNING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  LEARNED: 'bg-green-100 text-green-800 border-green-300',
  LEARNED_AND_VALIDATED: 'bg-purple-100 text-purple-800 border-purple-300'
}

const allowedStatuses = ['NOT_LEARNED', 'WANT_TO_LEARN', 'LEARNING', 'LEARNED']

export default function StudentTopics() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  useEffect(() => {
    if (session?.user) {
      fetchTopics()
    }
  }, [session, language])

  const fetchTopics = async () => {
    try {
      const response = await fetch(`/api/student/topics?lang=${language}`)
      if (response.ok) {
        const data = await response.json()
        // Filter to only show topics the user has interacted with (not NOT_LEARNED)
        const interactedTopics = data.filter((topic: Topic) => topic.status !== 'NOT_LEARNED')
        setTopics(interactedTopics)
      }
    } catch (error) {
      console.error('Error fetching topics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group topics by status and sort by updatedAt (most recent first)
  const getTopicsByStatus = (status: string) => {
    return topics
      .filter(topic => topic.status === status)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  const statusColumns = [
    { key: 'WANT_TO_LEARN', label: 'Want to Learn', color: 'blue', icon: '💭' },
    { key: 'LEARNING', label: 'Learning', color: 'yellow', icon: '📖' },
    { key: 'LEARNED', label: 'Learned', color: 'green', icon: '🎯' },
    { key: 'LEARNED_AND_VALIDATED', label: 'Validated', color: 'purple', icon: '✅' }
  ]

  const updateTopicStatus = async (topicId: string, newStatus: string) => {
    setUpdating(topicId)
    try {
      const response = await fetch('/api/student/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topicId, status: newStatus }),
      })

      if (response.ok) {
        setTopics(topics.map(topic => 
          topic.id === topicId ? { ...topic, status: newStatus } : topic
        ))
      } else {
        alert('Failed to update topic status')
      }
    } catch (error) {
      console.error('Error updating topic status:', error)
      alert('Failed to update topic status')
    } finally {
      setUpdating(null)
    }
  }

  const getColumnColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200',
      yellow: 'bg-yellow-50 border-yellow-200', 
      green: 'bg-green-50 border-green-200',
      purple: 'bg-purple-50 border-purple-200'
    }
    return colors[color as keyof typeof colors] || 'bg-gray-50 border-gray-200'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading topics...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Please sign in to access your topics.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-semibold text-gray-900">Point</Link>
              <div className="flex space-x-4">
                <Link href="/student" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <Link href="/student/topics" className="text-blue-600 font-medium">Topics</Link>
                <Link href="/student/goals" className="text-gray-600 hover:text-gray-900">Goals</Link>
                <Link href="/knowledge-graph" className="text-gray-600 hover:text-gray-900">Knowledge Graph</Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {session.user?.name}</span>
              {(session.user?.role === 'ADMIN' || session.user?.role === 'EDITOR') && (
                <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800">
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <Link
                href="/student"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">📚 Learning Progress</h1>
                <p className="text-gray-600">Topics you're actively learning or have completed</p>
              </div>
            </div>
            
            {/* Statistics */}
            <div className="text-sm text-gray-600">
              {topics.length} {topics.length === 1 ? 'topic' : 'topics'} in your learning journey
            </div>
          </div>

          {/* Status Columns */}
          {topics.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {statusColumns.map((column) => {
                const columnTopics = getTopicsByStatus(column.key)
                return (
                  <div key={column.key} className={`rounded-2xl border-2 p-4 ${getColumnColorClasses(column.color)}`}>
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center space-x-2">
                        <span className="text-lg">{column.icon}</span>
                        <span>{column.label}</span>
                      </h3>
                      <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                        {columnTopics.length}
                      </span>
                    </div>

                    {/* Topics in this column */}
                    <div className="space-y-3">
                      {columnTopics.map((topic) => (
                        <div key={topic.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all">
                          <div className="mb-3">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1">{topic.localizedName || getLocalizedText(topic.name, language)}</h4>
                            <p className="text-xs text-gray-500">by {topic.author.name}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                topic.type === 'THEORY' ? 'bg-blue-100 text-blue-800' :
                                topic.type === 'PRACTICE' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {topic.type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(topic.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {topic.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{getLocalizedText(topic.description, language)}</p>
                          )}

                          {/* Prerequisites */}
                          {topic.prerequisites.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Prerequisites:</p>
                              <div className="flex flex-wrap gap-1">
                                {topic.prerequisites.slice(0, 2).map((prereq) => (
                                  <span key={prereq.prerequisite.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                    {prereq.prerequisite.localizedName || getLocalizedText(prereq.prerequisite.name, language)}
                                  </span>
                                ))}
                                {topic.prerequisites.length > 2 && (
                                  <span className="text-xs text-gray-500">+{topic.prerequisites.length - 2} more</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Status Update Buttons */}
                          {topic.status !== 'LEARNED_AND_VALIDATED' && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-gray-700">Change to:</p>
                              <div className="grid grid-cols-2 gap-1">
                                {allowedStatuses.filter(status => status !== topic.status).map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => updateTopicStatus(topic.id, status)}
                                    disabled={updating === topic.id}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                                      updating === topic.id
                                        ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {updating === topic.id ? '...' : statusLabels[status as keyof typeof statusLabels]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {topic.status === 'LEARNED_AND_VALIDATED' && (
                            <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                              Validated through course completion
                            </div>
                          )}
                        </div>
                      ))}

                      {columnTopics.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-2xl mb-2">{column.icon}</div>
                          <p className="text-xs">No topics yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-6">📖</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">No learning activity yet</h3>
              <p className="text-gray-600 mb-8">Start your learning journey by exploring topics and setting your status!</p>
              <div className="flex items-center justify-center space-x-4">
                <Link
                  href="/knowledge-graph"
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Explore All Topics
                </Link>
                <Link
                  href="/student/goals/new"
                  className="px-6 py-3 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
                >
                  Set Learning Goals
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}