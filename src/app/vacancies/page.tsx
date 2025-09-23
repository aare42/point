'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
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

interface Author {
  id: string
  name: string
  email: string
}

interface Vacancy {
  id: string
  name: string
  createdAt: string
  author: Author
  topics: VacancyTopic[]
  _count: {
    topics: number
  }
}

const statusColors = {
  NOT_LEARNED: 'bg-gray-100 text-gray-800',
  WANT_TO_LEARN: 'bg-blue-100 text-blue-800',
  LEARNING: 'bg-yellow-100 text-yellow-800',
  LEARNED: 'bg-green-100 text-green-800',
  LEARNED_AND_VALIDATED: 'bg-purple-100 text-purple-800'
}

export default function VacanciesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [vacancies, setVacancies] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userTopics, setUserTopics] = useState<any[]>([])
  const [creatingGoal, setCreatingGoal] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<'STUDENT' | 'EDUCATOR' | 'EMPLOYER' | null>(null)

  useEffect(() => {
    setMounted(true)
    fetchVacancies()
    
    // Load saved role preference
    const savedRole = localStorage.getItem('selectedRole') as 'STUDENT' | 'EDUCATOR' | 'EMPLOYER'
    if (savedRole && ['STUDENT', 'EDUCATOR', 'EMPLOYER'].includes(savedRole)) {
      setCurrentRole(savedRole)
    }
    
    if (session?.user) {
      fetchUserTopics()
    }
  }, [session])

  const fetchVacancies = async () => {
    try {
      const response = await fetch('/api/vacancies')
      if (response.ok) {
        const vacanciesData = await response.json()
        setVacancies(vacanciesData)
      } else {
        console.error('Failed to fetch vacancies')
      }
    } catch (error) {
      console.error('Error fetching vacancies:', error)
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

  const createLearningGoal = async (vacancy: Vacancy) => {
    if (!session?.user) {
      router.push('/api/auth/signin')
      return
    }

    setCreatingGoal(vacancy.id)

    try {
      // Find missing topics (topics the user hasn't learned or learned+validated)
      const missingTopics = vacancy.topics.filter(vt => {
        const userTopic = userTopics.find(ut => ut.id === vt.topic.id)
        return !userTopic || (userTopic.status !== 'LEARNED' && userTopic.status !== 'LEARNED_AND_VALIDATED')
      })

      if (missingTopics.length === 0) {
        alert('You already have all the skills required for this vacancy!')
        return
      }

      // Create goal with missing topics
      const goalData = {
        name: `Skills for: ${vacancy.name}`,
        motto: `Develop missing skills for the ${vacancy.name} position at ${vacancy.author.name}`,
        topicIds: missingTopics.map(mt => mt.topic.id),
        isPublic: false
      }

      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      })

      if (response.ok) {
        alert(`Learning goal created with ${missingTopics.length} topics! Check your goals dashboard.`)
        router.push('/student/goals')
      } else {
        const error = await response.json()
        alert(`Failed to create goal: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating learning goal:', error)
      alert('Failed to create learning goal. Please try again.')
    } finally {
      setCreatingGoal(null)
    }
  }

  const getTopicStatus = (topicId: string) => {
    const userTopic = userTopics.find(ut => ut.id === topicId)
    return userTopic?.status || 'NOT_LEARNED'
  }

  const getTopicStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || statusColors.NOT_LEARNED
  }

  const filteredVacancies = vacancies.filter(vacancy => {
    const matchesSearch = searchQuery === '' || 
      vacancy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vacancy.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">{t('vacancies.loading')}</p>
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
                💼 {t('vacancies.browse_title')}
              </h1>
              <p className="text-gray-600">
                {t('vacancies.discover_jobs')}
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-4">
              <Link
                href="/student"
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
              >
                {t('courses.student_dashboard')}
              </Link>
              <Link
                href="/knowledge-graph"
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
              >
                {t('courses.knowledge_graph')}
              </Link>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder={t('vacancies.search_placeholder')}
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
            {t('vacancies.found_vacancies', { 
              count: filteredVacancies.length.toString(), 
              plural: filteredVacancies.length !== 1 ? t('vacancies.vacancies') : t('vacancies.vacancy')
            })}
            {searchQuery && ` ${t('courses.matching_search', { query: searchQuery })}`}
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              {t('goals.clear_search')}
            </button>
          )}
        </div>

        {/* Vacancies Grid */}
        {filteredVacancies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVacancies.map((vacancy) => (
              <div
                key={vacancy.id}
                className="bg-white rounded-2xl shadow-xl border border-gray-200 hover:shadow-2xl transition-all"
              >
                <div className="p-6">
                  {/* Vacancy Header */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {vacancy.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{vacancy.author.name}</span>
                    </div>
                  </div>

                  {/* Skills Required */}
                  {vacancy.topics.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">{t('vacancies.required_skills')}</div>
                      <div className="flex flex-wrap gap-1">
                        {vacancy.topics.slice(0, 4).map((vacancyTopic) => {
                          const status = getTopicStatus(vacancyTopic.topic.id)
                          const statusColor = getTopicStatusColor(status)
                          return (
                            <span
                              key={vacancyTopic.topic.id}
                              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                              title={`${vacancyTopic.topic.name} - Status: ${status.replace('_', ' ').toLowerCase()}`}
                            >
                              <span>
                                {vacancyTopic.topic.type === 'THEORY' && '📚'}
                                {vacancyTopic.topic.type === 'PRACTICE' && '⚙️'}
                                {vacancyTopic.topic.type === 'PROJECT' && '🚀'}
                              </span>
                              <span>{vacancyTopic.topic.name}</span>
                            </span>
                          )
                        })}
                        {vacancy.topics.length > 4 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {t('courses.more_topics', { count: (vacancy.topics.length - 4).toString() })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vacancy Stats */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>{t('vacancies.skills_count', { count: vacancy._count.topics.toString() })}</span>
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(vacancy.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Create Learning Goal Button - Only for Students */}
                  {session?.user && currentRole === 'STUDENT' && (
                    <div className="mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          createLearningGoal(vacancy)
                        }}
                        disabled={creatingGoal === vacancy.id}
                        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                      >
                        {creatingGoal === vacancy.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>{t('vacancies.creating_goal')}</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{t('vacancies.create_learning_goal')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {!session?.user && (
                    <div className="mt-4">
                      <Link
                        href="/api/auth/signin"
                        className="w-full px-4 py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium text-sm flex items-center justify-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        <span>{t('vacancies.sign_in_to_create')}</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-6">
              {searchQuery ? '🔍' : '💼'}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {searchQuery ? t('vacancies.no_vacancies_found') : t('vacancies.no_vacancies_available')}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? t('vacancies.adjust_search_vacancies')
                : t('vacancies.employers_no_vacancies')}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                {t('goals.clear_search_button')}
              </button>
            )}
          </div>
        )}

        {/* CTA Section */}
        {vacancies.length > 0 && (
          <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 text-center border border-indigo-100">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('vacancies.ready_build_skills')}</h3>
            <p className="text-gray-600 mb-6">
              {t('vacancies.explore_courses_cta')}
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Link
                href="/courses"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                {t('vacancies.browse_courses')}
              </Link>
              <Link
                href="/goals"
                className="px-6 py-3 border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
              >
                {t('vacancies.set_learning_goals')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}