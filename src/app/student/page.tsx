'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { TopicType } from '@prisma/client'
import { useLanguage } from '@/contexts/LanguageContext'

interface Topic {
  id: string
  name: string
  slug: string
  type: TopicType
}

interface GoalTopic {
  topic: Topic
}

interface Goal {
  id: string
  name: string
  description?: string
  motto?: string
  deadline?: string
  createdAt: string
  topics: GoalTopic[]
  _count: {
    topics: number
  }
}

interface StudentTopic {
  id: string
  topicId: string
  status: string
  topic: Topic
}

interface DashboardData {
  statusCounts: Record<string, number>
  recentChanges: Array<{
    id: string
    status: string
    updatedAt: string
    topic: {
      name: string
      slug: string
      type: string
    }
  }>
  goals: Array<{
    id: string
    name: string
    motto?: string
    deadline?: string
    progress: number
    totalTopics: number
    completedTopics: number
  }>
  courses: Array<{
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
  NOT_LEARNED: 'bg-gray-100 text-gray-800',
  WANT_TO_LEARN: 'bg-blue-100 text-blue-800',
  LEARNING: 'bg-yellow-100 text-yellow-800',
  LEARNED: 'bg-green-100 text-green-800',
  LEARNED_AND_VALIDATED: 'bg-purple-100 text-purple-800'
}

export default function StudentDashboard() {
  const { data: session } = useSession()
  const { t, language } = useLanguage()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [recentTopics, setRecentTopics] = useState<StudentTopic[]>([])
  const [allTopics, setAllTopics] = useState<StudentTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (session?.user) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      const [dashboardResponse, goalsResponse, topicsResponse] = await Promise.all([
        fetch(`/api/student/dashboard?lang=${language}`),
        fetch(`/api/goals?lang=${language}`),
        fetch(`/api/student/topics?lang=${language}`)
      ])

      if (dashboardResponse.ok) {
        const fetchedDashboardData = await dashboardResponse.json()
        setDashboardData(fetchedDashboardData)
      }

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json()
        setGoals(goalsData)
      }

      if (topicsResponse.ok) {
        const topicsData = await topicsResponse.json()
        console.log('Topics data structure:', topicsData.slice(0, 2)) // Debug log
        setAllTopics(topicsData) // Store all topics for statistics
        setRecentTopics(topicsData.slice(0, 5)) // Only recent for display
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isGoalOverdue = (deadline?: string) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const isGoalCompleted = (goal: Goal) => {
    if (goal.topics.length === 0) return false
    
    // First try using dashboardData goals if available
    if (dashboardData?.goals) {
      const dashboardGoal = dashboardData.goals.find(g => g.id === goal.id)
      if (dashboardGoal) {
        return dashboardGoal.progress === 100
      }
    }
    
    // Fallback to calculating from allTopics
    return goal.topics.every(goalTopic => {
      const studentTopic = allTopics.find(st => st.topicId === goalTopic.topic.id)
      return studentTopic && (studentTopic.status === 'LEARNED' || studentTopic.status === 'LEARNED_AND_VALIDATED')
    })
  }

  const getGoalProgress = (goal: Goal) => {
    if (goal.topics.length === 0) return { completed: 0, total: 0, percentage: 0 }
    
    // First try using dashboardData goals if available (more reliable)
    if (dashboardData?.goals) {
      const dashboardGoal = dashboardData.goals.find(g => g.id === goal.id)
      if (dashboardGoal) {
        return {
          completed: dashboardGoal.completedTopics,
          total: dashboardGoal.totalTopics,
          percentage: dashboardGoal.progress
        }
      }
    }
    
    // Fallback to calculating from allTopics
    const completed = goal.topics.filter(goalTopic => {
      const studentTopic = allTopics.find(st => st.topicId === goalTopic.topic.id)
      return studentTopic && (studentTopic.status === 'LEARNED' || studentTopic.status === 'LEARNED_AND_VALIDATED')
    }).length
    
    return {
      completed,
      total: goal.topics.length,
      percentage: Math.round((completed / goal.topics.length) * 100)
    }
  }

  const getProgressStats = () => {
    // Use allTopics for accurate statistics, filter out topics with only NOT_LEARNED status
    const topicsWithProgress = allTopics.filter(st => st.status !== 'NOT_LEARNED')
    const totalTopics = topicsWithProgress.length
    const learnedTopics = topicsWithProgress.filter(st => 
      st.status === 'LEARNED' || st.status === 'LEARNED_AND_VALIDATED'
    ).length
    const learningTopics = topicsWithProgress.filter(st => st.status === 'LEARNING').length
    const wantToLearnTopics = topicsWithProgress.filter(st => st.status === 'WANT_TO_LEARN').length

    return { totalTopics, learnedTopics, learningTopics, wantToLearnTopics }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">{t('student.loading_dashboard')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <p className="text-gray-600 font-medium">{t('student.please_sign_in')}</p>
          </div>
        </div>
      </div>
    )
  }

  const stats = getProgressStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🎓 {t('student.dashboard_title')}
          </h1>
          <p className="text-gray-600">
            {t('student.welcome_back', { name: session?.user?.name || '' })}
          </p>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100">
                <span className="text-2xl">🎯</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
                <p className="text-gray-600 text-sm">{t('student.active_goals')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.learnedTopics}</p>
                <p className="text-gray-600 text-sm">{t('student.topics_learned')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <span className="text-2xl">📚</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.learningTopics}</p>
                <p className="text-gray-600 text-sm">{t('student.currently_learning')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <span className="text-2xl">🔍</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.wantToLearnTopics}</p>
                <p className="text-gray-600 text-sm">{t('student.want_to_learn')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Your Courses Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <Link href="/student/courses" className="group">
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors cursor-pointer">
                  {t('student.your_courses')}
                </h2>
              </Link>
              <Link
                href="/courses"
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
              >
                {t('student.browse_courses')}
              </Link>
            </div>

            {dashboardData?.courses && dashboardData.courses.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.courses.slice(0, 3).map((course) => (
                  <div
                    key={course.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{course.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        course.progress === 100 
                          ? 'bg-green-100 text-green-800' 
                          : course.progress > 0 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {course.progress === 100 ? `🎉 ${t('student.completed')}` : course.progress > 0 ? `📚 ${t('student.in_progress')}` : `🎯 ${t('student.enrolled')}`}
                      </span>
                    </div>
                    {course.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{course.description}</p>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700">{t('student.progress')}</span>
                        <span className="text-gray-500">{course.completedTopics}/{course.totalTopics} {t('courses.topics_count_stat', { count: course.totalTopics.toString() }).toLowerCase()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="flex h-full rounded-full overflow-hidden">
                          {Array.from({ length: course.totalTopics }, (_, index) => (
                            <div
                              key={index}
                              className={`flex-1 ${index < course.completedTopics 
                                ? 'bg-blue-500' 
                                : 'bg-gray-200'
                              } ${index > 0 ? 'border-l border-white' : ''}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{t('student.complete', { percent: course.progress.toString() })}</span>
                      <span>{t('student.by_educator', { name: course.educator.name })}</span>
                    </div>
                  </div>
                ))}
                
                {dashboardData.courses.length > 3 && (
                  <Link
                    href="/student/courses"
                    className="block text-center py-3 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {t('student.view_all_courses', { count: dashboardData.courses.length.toString() })}
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('student.no_courses_yet')}</h3>
                <p className="text-gray-600 mb-4">{t('student.enroll_courses')}</p>
                <Link
                  href="/courses"
                  className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('student.browse_courses')}
                </Link>
              </div>
            )}
          </div>
          {/* Goals Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <Link href="/student/goals" className="group">
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors cursor-pointer">
                  {t('student.your_goals')}
                </h2>
              </Link>
              <Link
                href="/student/goals/new"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                {t('student.create_goal')}
              </Link>
            </div>

            {goals.length > 0 ? (
              <div className="space-y-4">
                {goals.slice(0, 3).map((goal) => {
                  const progress = getGoalProgress(goal)
                  const completed = isGoalCompleted(goal)
                  
                  return (
                    <div
                      key={goal.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          completed 
                            ? 'bg-green-100 text-green-800' 
                            : goal.deadline && isGoalOverdue(goal.deadline)
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {completed ? `🎉 ${t('student.completed')}` : goal.deadline && isGoalOverdue(goal.deadline) ? `⏰ ${t('student.overdue')}` : `📚 ${t('student.active')}`}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{goal.description}</p>
                      )}
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700">{t('student.progress')}</span>
                          <span className="text-gray-500">{progress.completed}/{progress.total} {t('courses.topics_count_stat', { count: progress.total.toString() }).toLowerCase()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="flex h-full rounded-full overflow-hidden">
                            {Array.from({ length: progress.total }, (_, index) => (
                              <div
                                key={index}
                                className={`flex-1 ${index < progress.completed 
                                  ? 'bg-green-500' 
                                  : 'bg-gray-200'
                                } ${index > 0 ? 'border-l border-white' : ''}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{t('student.complete', { percent: progress.percentage.toString() })}</span>
                        {goal.deadline && (
                          <span>{t('student.due_date', { date: new Date(goal.deadline).toLocaleDateString() })}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {goals.length > 3 && (
                  <Link
                    href="/student/goals"
                    className="block text-center py-3 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {t('student.view_all_goals', { count: goals.length.toString() })}
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('student.no_goals_yet')}</h3>
                <p className="text-gray-600 mb-4">{t('student.create_first_goal')}</p>
                <Link
                  href="/student/goals/new"
                  className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('student.create_your_first_goal')}
                </Link>
              </div>
            )}
          </div>

          {/* Recent Learning Activity */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <Link href="/student/topics" className="group">
                <h2 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors cursor-pointer">
                  {t('student.learning_progress')}
                </h2>
              </Link>
              <Link
                href="/knowledge-graph"
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
              >
                {t('student.view_graph')}
              </Link>
            </div>

            {dashboardData?.recentChanges && dashboardData.recentChanges.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">
                  {t('student.recent_changes', { count: dashboardData.recentChanges.length.toString() })}
                </div>
                {dashboardData.recentChanges.slice(0, 5).map((change) => (
                  <div
                    key={change.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        change.topic.type === 'THEORY' ? 'bg-blue-100 text-blue-800' :
                        change.topic.type === 'PRACTICE' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {change.topic.type === 'THEORY' && '📚'}
                        {change.topic.type === 'PRACTICE' && '⚙️'}
                        {change.topic.type === 'PROJECT' && '🚀'}
                      </span>
                      <div>
                        <span className="font-medium text-gray-900 block">{change.topic.name}</span>
                        <span className="text-xs text-gray-500">
                          {t('student.changed_at', { 
                            date: new Date(change.updatedAt).toLocaleDateString(), 
                            time: new Date(change.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        change.status === 'LEARNED_AND_VALIDATED' ? 'bg-green-100 text-green-800' :
                        change.status === 'LEARNED' ? 'bg-blue-100 text-blue-800' :
                        change.status === 'LEARNING' ? 'bg-yellow-100 text-yellow-800' :
                        change.status === 'WANT_TO_LEARN' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {change.status === 'LEARNED_AND_VALIDATED' ? `✅ ${t('student.validated')}` :
                         change.status === 'LEARNED' ? `🎯 ${t('student.learned')}` :
                         change.status === 'LEARNING' ? `📖 ${t('student.learning')}` :
                         change.status === 'WANT_TO_LEARN' ? `💭 ${t('student.want_to_learn_status')}` :
                         change.status.replace('_', ' ').toLowerCase()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {dashboardData.recentChanges.length > 5 && (
                  <div className="text-center py-2">
                    <span className="text-sm text-gray-500">
                      {t('student.more_changes', { count: (dashboardData.recentChanges.length - 5).toString() })}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('student.no_learning_activity')}</h3>
                <p className="text-gray-600 mb-4">{t('student.start_learning')}</p>
                <div className="flex items-center justify-center space-x-4">
                  <Link
                    href="/knowledge-graph"
                    className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    {t('student.explore_topics')}
                  </Link>
                  <Link
                    href="/student/goals/new"
                    className="inline-block px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors text-sm"
                  >
                    {t('student.set_goals')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}