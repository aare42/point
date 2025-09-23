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

interface VacancyTopic {
  topic: Topic
}

interface Vacancy {
  id: string
  name: string
  createdAt: string
  topics: VacancyTopic[]
  _count: {
    topics: number
  }
}

interface Goal {
  id: string
  name: string
  description?: string
  motto?: string
  deadline?: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string
  }
  topics: {
    topic: Topic
  }[]
  _count: {
    topics: number
  }
}

export default function EmployerDashboard() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [candidateGoals, setCandidateGoals] = useState<Goal[]>([])
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
      const [vacanciesResponse, goalsResponse] = await Promise.all([
        fetch('/api/employer/vacancies'),
        fetch('/api/goals?browse=true')
      ])

      if (vacanciesResponse.ok) {
        const vacanciesData = await vacanciesResponse.json()
        setVacancies(vacanciesData)
      }

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json()
        setCandidateGoals(goalsData.slice(0, 5))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEmployerStats = () => {
    const totalVacancies = vacancies.length
    const totalTopicsRequired = vacancies.reduce((sum, vacancy) => sum + vacancy._count.topics, 0)
    const uniqueTopics = new Set(
      vacancies.flatMap(v => v.topics.map(vt => vt.topic.id))
    ).size
    const averageTopicsPerVacancy = totalVacancies > 0 ? Math.round(totalTopicsRequired / totalVacancies) : 0

    return { totalVacancies, totalTopicsRequired, uniqueTopics, averageTopicsPerVacancy }
  }

  const isGoalOverdue = (deadline?: string) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
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

  const stats = getEmployerStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            💼 {t('employer.dashboard_title')}
          </h1>
          <p className="text-gray-600">
            {t('employer.welcome_back', { name: session?.user?.name || '' })}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100">
                <span className="text-2xl">💼</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.totalVacancies}</p>
                <p className="text-gray-600 text-sm">{t('employer.open_positions')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <span className="text-2xl">⚙️</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.totalTopicsRequired}</p>
                <p className="text-gray-600 text-sm">{t('employer.skills_required')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <span className="text-2xl">🎯</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueTopics}</p>
                <p className="text-gray-600 text-sm">{t('employer.unique_skills')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.averageTopicsPerVacancy}</p>
                <p className="text-gray-600 text-sm">{t('employer.avg_per_position')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Your Vacancies */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('employer.your_job_postings')}</h2>
              <Link
                href="/employer/vacancies/create"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                {t('employer.post_job')}
              </Link>
            </div>

            {vacancies.length > 0 ? (
              <div className="space-y-4">
                {vacancies.slice(0, 3).map((vacancy) => (
                  <div
                    key={vacancy.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/employer/vacancies/${vacancy.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{vacancy.name}</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {t('employer.active')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{t('employer.skills_required_count', { count: vacancy._count.topics.toString() })}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {t('employer.posted_date', { date: new Date(vacancy.createdAt).toLocaleDateString() })}
                      </span>
                    </div>
                  </div>
                ))}
                
                {vacancies.length > 3 && (
                  <Link
                    href="/employer/vacancies"
                    className="block text-center py-3 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {t('employer.view_all_positions', { count: vacancies.length.toString() })}
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">💼</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('employer.no_job_postings')}</h3>
                <p className="text-gray-600 mb-4">{t('employer.create_first_posting')}</p>
                <Link
                  href="/employer/vacancies/create"
                  className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('employer.post_first_job')}
                </Link>
              </div>
            )}
          </div>

          {/* Potential Candidates */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('employer.potential_candidates')}</h2>
              <Link
                href="/goals"
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
              >
                {t('employer.browse_all')}
              </Link>
            </div>

            {candidateGoals.length > 0 ? (
              <div className="space-y-3">
                {candidateGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/goals/${goal.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {goal.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{goal.user?.name || 'Unknown User'}</div>
                        <div className="text-sm text-gray-600">{goal.name}</div>
                        <div className="text-xs text-gray-500">{t('employer.skills_count', { count: goal._count.topics.toString() })}</div>
                      </div>
                    </div>
                    {goal.deadline && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isGoalOverdue(goal.deadline) 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {isGoalOverdue(goal.deadline) ? `⏰ ${t('student.overdue')}` : `🎯 ${t('employer.active')}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎓</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('employer.no_candidates')}</h3>
                <p className="text-gray-600 mb-4">{t('employer.students_will_appear')}</p>
                <Link
                  href="/goals"
                  className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {t('employer.browse_learning_goals')}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t('employer.quick_actions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/employer/vacancies/create"
              className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-200"
            >
              <span className="text-2xl">➕</span>
              <div>
                <div className="font-semibold text-gray-900">{t('employer.post_new_job')}</div>
                <div className="text-sm text-gray-600">{t('employer.post_job_description')}</div>
              </div>
            </Link>

            <Link
              href="/goals"
              className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-200"
            >
              <span className="text-2xl">🎯</span>
              <div>
                <div className="font-semibold text-gray-900">{t('employer.browse_candidates')}</div>
                <div className="text-sm text-gray-600">{t('employer.browse_candidates_description')}</div>
              </div>
            </Link>

            <Link
              href="/knowledge-graph"
              className="flex items-center space-x-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow border border-gray-200"
            >
              <span className="text-2xl">🧠</span>
              <div>
                <div className="font-semibold text-gray-900">{t('employer.skill_map')}</div>
                <div className="text-sm text-gray-600">{t('employer.skill_map_description')}</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}