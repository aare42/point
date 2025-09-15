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

interface GoalTopic {
  topic: Topic
}

interface Author {
  id: string
  name: string
  email: string
}

interface GoalTemplate {
  id: string
  name: string
  description?: string
  motto?: string
  createdAt: string
  author: Author
  topics: GoalTopic[]
  _count: {
    topics: number
    goals: number
  }
}

const statusColors = {
  NOT_LEARNED: 'bg-gray-100 text-gray-800',
  WANT_TO_LEARN: 'bg-blue-100 text-blue-800',
  LEARNING: 'bg-yellow-100 text-yellow-800',
  LEARNED: 'bg-green-100 text-green-800',
  LEARNED_AND_VALIDATED: 'bg-purple-100 text-purple-800'
}

export default function GoalTemplatesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [goals, setGoals] = useState<GoalTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userTopics, setUserTopics] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    fetchGoals()
    if (session?.user) {
      fetchUserTopics()
    }
  }, [session])

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goal-templates')
      if (response.ok) {
        const goalsData = await response.json()
        setGoals(goalsData)
      } else {
        console.error('Failed to fetch goal templates')
      }
    } catch (error) {
      console.error('Error fetching goal templates:', error)
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

  const filteredGoals = goals.filter(goal => {
    const matchesSearch = searchQuery === '' || 
      goal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.motto?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading goals...</p>
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
                🎯 Browse Goals
              </h1>
              <p className="text-gray-600">
                Discover learning goals and get inspired by what others are working towards
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

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search goal templates by name, author, description, or motivation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-gray-600">
            Found <strong>{filteredGoals.length}</strong> goal template{filteredGoals.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Goals Grid */}
        {filteredGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => (
              <div
                key={goal.id}
                className="bg-white rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl hover:border-indigo-300 transition-all cursor-pointer group"
                onClick={() => router.push(`/goals/${goal.id}`)}
              >
                <div className="p-6">
                  {/* Goal Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors flex-1">
                        {goal.name}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{goal.author.name}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                      {goal.description}
                    </p>
                  )}

                  {/* Motto */}
                  {goal.motto && (
                    <div className="mb-4 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-400">
                      <p className="text-sm font-medium text-indigo-800 italic">
                        "{goal.motto}"
                      </p>
                    </div>
                  )}

                  {/* Topics Preview */}
                  {goal.topics.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">Learning Topics:</div>
                      <div className="flex flex-wrap gap-1">
                        {goal.topics.slice(0, 3).map((goalTopic) => {
                          const status = session?.user ? getTopicStatus(goalTopic.topic.id) : 'NOT_LEARNED'
                          const statusColor = getTopicStatusColor(status)
                          return (
                            <span
                              key={goalTopic.topic.id}
                              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                              title={session?.user ? `${goalTopic.topic.name} - Status: ${status.replace('_', ' ').toLowerCase()}` : goalTopic.topic.name}
                            >
                              <span>
                                {goalTopic.topic.type === 'THEORY' && '📚'}
                                {goalTopic.topic.type === 'PRACTICE' && '⚙️'}
                                {goalTopic.topic.type === 'PROJECT' && '🚀'}
                              </span>
                              <span>{goalTopic.topic.name}</span>
                            </span>
                          )
                        })}
                        {goal.topics.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            +{goal.topics.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Goal Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>{goal._count.topics} topics</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{goal._count.goals} students used</span>
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(goal.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-6">
              {searchQuery ? '🔍' : '🎯'}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {searchQuery ? 'No goal templates found' : 'No goal templates available yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search terms to find more goal templates.'
                : 'No goal templates have been created yet. Check back later or contact an admin to create some templates!'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Clear Search
              </button>
            )}
          </div>
        )}

        {/* CTA Section */}
        {goals.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 text-center border border-indigo-100">
            <div className="text-4xl mb-4">💡</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Inspired by These Goals?</h3>
            <p className="text-gray-600 mb-6">
              Start your own learning journey by setting goals and exploring courses that match your ambitions.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link
                href="/student"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Create Your Goals
              </Link>
              <Link
                href="/courses"
                className="px-6 py-3 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
              >
                Find Courses
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}