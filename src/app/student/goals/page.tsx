'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedText } from '@/lib/utils/multilingual'

interface Goal {
  id: string
  name: string | any
  description?: string | any
  motto?: string | any
  deadline?: string
  createdAt: string
  topics: {
    topic: {
      id: string
      name: string | any
      localizedName?: string
      slug: string
      type: string
      description?: string | any
      studentTopics?: {
        status: string
      }[]
    }
  }[]
  _count: {
    topics: number
  }
}

export default function GoalsPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const statusLabels = {
    NOT_LEARNED: 'Not Learned',
    WANT_TO_LEARN: 'Want to Learn',
    LEARNING: 'Learning',
    LEARNED: 'Learned',
    LEARNED_AND_VALIDATED: 'Validated'
  }

  const allowedStatuses = ['NOT_LEARNED', 'WANT_TO_LEARN', 'LEARNING', 'LEARNED']

  useEffect(() => {
    fetchGoals()
  }, [language])

  const fetchGoals = async () => {
    try {
      const response = await fetch(`/api/goals?lang=${language}`)
      if (response.ok) {
        const data = await response.json()
        setGoals(data)
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    setDeleting(goalId)
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setGoals(goals.filter(goal => goal.id !== goalId))
      } else {
        alert('Failed to delete goal')
      }
    } catch (error) {
      console.error('Error deleting goal:', error)
      alert('Failed to delete goal')
    } finally {
      setDeleting(null)
    }
  }

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
        // Refresh goals to get updated progress
        fetchGoals()
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

  const calculateProgress = (goal: Goal) => {
    if (goal.topics.length === 0) return 0
    const completedTopics = goal.topics.filter(({ topic }) => {
      const status = topic.studentTopics?.[0]?.status || 'NOT_LEARNED'
      return status === 'LEARNED' || status === 'LEARNED_AND_VALIDATED'
    }).length
    return Math.round((completedTopics / goal.topics.length) * 100)
  }

  const getTopicIcon = (type: string) => {
    switch (type) {
      case 'THEORY': return '📚'
      case 'PRACTICE': return '⚙️'
      case 'PROJECT': return '🚀'
      default: return '❓'
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      NOT_LEARNED: 'text-gray-600 bg-gray-100 border-gray-300',
      WANT_TO_LEARN: 'text-blue-600 bg-blue-100 border-blue-300',
      LEARNING: 'text-yellow-600 bg-yellow-100 border-yellow-300',
      LEARNED: 'text-green-600 bg-green-100 border-green-300',
      LEARNED_AND_VALIDATED: 'text-purple-600 bg-purple-100 border-purple-300'
    }
    return colors[status as keyof typeof colors] || colors.NOT_LEARNED
  }

  const getDeadlineStatus = (deadline?: string) => {
    if (!deadline) return null

    const deadlineDate = new Date(deadline)
    const now = new Date()
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: 'overdue', text: `Overdue by ${Math.abs(diffDays)} days`, color: 'text-red-600 bg-red-50' }
    } else if (diffDays === 0) {
      return { status: 'today', text: 'Due today', color: 'text-orange-600 bg-orange-50' }
    } else if (diffDays <= 7) {
      return { status: 'soon', text: `${diffDays} days left`, color: 'text-yellow-600 bg-yellow-50' }
    } else {
      return { status: 'future', text: `${diffDays} days left`, color: 'text-green-600 bg-green-50' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your goals...</p>
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
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/student"
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                🎯 My Learning Goals
              </h1>
              <p className="text-gray-600">
                Track your learning objectives and progress towards mastery
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <div></div>
            
            <Link
              href="/student/goals/new"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Goal</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {goals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-indigo-600">{goals.length}</div>
              <div className="text-sm text-gray-600">Total Goals</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-purple-600">
                {goals.reduce((sum, goal) => sum + goal._count.topics, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Topics</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-green-600">
                {goals.filter(goal => goal.deadline && new Date(goal.deadline) > new Date()).length}
              </div>
              <div className="text-sm text-gray-600">Active Deadlines</div>
            </div>
          </div>
        )}

        {/* Goals List */}
        {goals.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {goals.map(goal => {
              const deadlineStatus = getDeadlineStatus(goal.deadline)
              const progress = calculateProgress(goal)
              
              return (
                <div key={goal.id} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{getLocalizedText(goal.name, language)}</h3>
                      {goal.description && (
                        <p className="text-gray-600 text-sm mb-3">{getLocalizedText(goal.description, language)}</p>
                      )}
                      {goal.motto && (
                        <p className="text-indigo-600 text-sm italic mb-3">"{getLocalizedText(goal.motto, language)}"</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/student/goals/${goal.id}/edit`}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        disabled={deleting === goal.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === goal.id ? (
                          <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm font-bold text-gray-900">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {goal.topics.filter(({ topic }) => {
                        const status = topic.studentTopics?.[0]?.status || 'NOT_LEARNED'
                        return status === 'LEARNED' || status === 'LEARNED_AND_VALIDATED'
                      }).length} of {goal.topics.length} topics completed
                    </div>
                  </div>

                  {/* Deadline */}
                  {deadlineStatus && (
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 ${deadlineStatus.color}`}>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {deadlineStatus.text}
                    </div>
                  )}

                  {/* Topics */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Topics ({goal._count.topics})</h4>
                      {goal._count.topics > 3 && (
                        <span className="text-xs text-gray-500">Showing first 3</span>
                      )}
                    </div>
                    
                    {goal.topics.length > 0 ? (
                      <div className="space-y-3">
                        {goal.topics.slice(0, 3).map(({ topic }) => {
                          const currentStatus = topic.studentTopics?.[0]?.status || 'NOT_LEARNED'
                          const isValidated = currentStatus === 'LEARNED_AND_VALIDATED'
                          
                          return (
                            <div key={topic.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">{getTopicIcon(topic.type)}</span>
                                <div className="flex-1">
                                  <Link 
                                    href={`/knowledge-graph?selected=${topic.id}&from=/student/goals`}
                                    className="font-medium text-gray-900 text-sm hover:text-indigo-600 cursor-pointer transition-colors"
                                  >
                                    {topic.localizedName || getLocalizedText(topic.name, language)}
                                  </Link>
                                  <div className="text-xs text-gray-500 capitalize">
                                    {topic.type?.toLowerCase() || 'unknown'} Topic
                                  </div>
                                </div>
                                
                                {/* Current Status Badge */}
                                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentStatus)}`}>
                                  {statusLabels[currentStatus as keyof typeof statusLabels]}
                                  {isValidated && ' 🎓'}
                                </div>
                              </div>
                              
                              {/* Status Change Buttons */}
                              {!isValidated && (
                                <div className="flex flex-wrap gap-2 pl-8">
                                  {allowedStatuses.map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => updateTopicStatus(topic.id, status)}
                                      disabled={updating === topic.id || currentStatus === status}
                                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                                        currentStatus === status
                                          ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                          : updating === topic.id
                                          ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      {updating === topic.id && currentStatus !== status ? '...' : statusLabels[status as keyof typeof statusLabels]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {goal._count.topics > 3 && (
                          <div className="text-center py-2 text-sm text-gray-500">
                            <Link 
                              href={`/knowledge-graph?goal=${goal.id}&from=/student/goals`}
                              className="text-indigo-600 hover:text-indigo-700 underline"
                            >
                              +{goal._count.topics - 3} more topics - View in Knowledge Graph
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No topics selected</p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Created {new Date(goal.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-200">
            <div className="text-6xl mb-6">🎯</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No Goals Yet</h3>
            <p className="text-gray-600 mb-6">
              Set your first learning goal and start tracking your progress towards mastery.
            </p>
            <Link
              href="/student/goals/new"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Your First Goal</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}