'use client'

import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Home() {
  const { data: session, status } = useSession()
  const { t, language, setLanguage } = useLanguage()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (session) {
      // Check for saved role and redirect to appropriate dashboard
      const savedRole = localStorage.getItem('selectedRole')
      if (savedRole) {
        const dashboardRoutes = {
          STUDENT: '/student',
          EDUCATOR: '/educator',
          EMPLOYER: '/employer'
        }
        const route = dashboardRoutes[savedRole as keyof typeof dashboardRoutes]
        if (route) {
          router.push(route)
          return
        }
      }
      // Default to student dashboard if no saved role
      router.push('/student')
    }
  }, [session, router])

  if (status === 'loading' || !mounted) {
    return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Language Switcher */}
        <div className="absolute top-4 right-4 z-10">
          <div className="flex space-x-2">
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                language === 'en' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white/80 text-gray-700 hover:bg-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('uk')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                language === 'uk' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white/80 text-gray-700 hover:bg-white'
              }`}
            >
              УК
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
                🧠 {t('landing.platform_title')}
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto">
                {t('landing.hero_subtitle')}
              </p>
              <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
                {t('landing.hero_description')}
              </p>
              
              <button
                onClick={() => signIn('google')}
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-full shadow-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition hover:scale-105"
              >
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('landing.start_journey')}
              </button>
            </div>
          </div>
        </div>

        {/* Platform Concept */}
        <div className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {t('landing.how_platform_works')}
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                {t('landing.platform_explanation')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Knowledge Graph Concept */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🕸️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('landing.knowledge_graph_concept')}</h3>
                <p className="text-gray-600">
                  {t('landing.knowledge_graph_desc')}
                </p>
              </div>

              {/* Unified Goals */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('landing.unified_topics')}</h3>
                <p className="text-gray-600">
                  {t('landing.unified_topics_desc')}
                </p>
              </div>

              {/* Portfolio Building */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('landing.knowledge_portfolio')}</h3>
                <p className="text-gray-600">
                  {t('landing.knowledge_portfolio_desc')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Three Roles Section */}
        <div className="py-20 bg-gradient-to-br from-gray-50 to-indigo-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {t('landing.three_ways_title')}
              </h2>
              <p className="text-lg text-gray-600">
                {t('landing.three_ways_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Student Role */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
                  <span className="text-3xl">🎓</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('landing.for_students')}</h3>
                <p className="text-gray-600 mb-6">
                  {t('landing.students_description')}
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">📝</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('landing.set_learning_goals')}</h4>
                      <p className="text-sm text-gray-600">{t('landing.set_goals_desc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">📚</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('landing.find_courses')}</h4>
                      <p className="text-sm text-gray-600">{t('landing.find_courses_desc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">💼</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('landing.explore_careers')}</h4>
                      <p className="text-sm text-gray-600">{t('landing.explore_careers_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Educator Role */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 hover:border-green-300 transition-colors">
                <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                  <span className="text-3xl">👩‍🏫</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('landing.for_educators')}</h3>
                <p className="text-gray-600 mb-6">
                  {t('landing.educators_description')}
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">🏗️</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('landing.create_courses')}</h4>
                      <p className="text-sm text-gray-600">{t('landing.create_courses_desc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">✅</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('landing.validate_learning')}</h4>
                      <p className="text-sm text-gray-600">{t('landing.validate_learning_desc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">👥</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('landing.track_students')}</h4>
                      <p className="text-sm text-gray-600">{t('landing.track_students_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employer Role */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 hover:border-purple-300 transition-colors">
                <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6">
                  <span className="text-3xl">💼</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('landing.for_employers')}</h3>
                <p className="text-gray-600 mb-6">
                  {t('landing.employers_description')}
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">📋</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('landing.post_vacancies')}</h4>
                      <p className="text-sm text-gray-600">{t('landing.post_vacancies_desc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">🔍</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('landing.find_talent')}</h4>
                      <p className="text-sm text-gray-600">{t('landing.find_talent_desc')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs">🎯</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('landing.skill_mapping')}</h4>
                      <p className="text-sm text-gray-600">{t('landing.skill_mapping_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="py-20 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t('landing.ready_start_title')}
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              {t('landing.ready_start_subtitle')}
            </p>
            <button
              onClick={() => signIn('google')}
              className="inline-flex items-center px-8 py-4 border-2 border-white text-lg font-medium rounded-full text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transform transition hover:scale-105"
            >
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('landing.get_started')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('landing.welcome')}</h2>
            <p className="text-xl text-gray-600 mb-8">{t('landing.educational_platform')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {/* Student Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.student_dashboard')}</h3>
              <p className="text-gray-600 mb-6">{t('landing.student_description')}</p>
              <Link 
                href="/student"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
{t('landing.go_to_dashboard')}
              </Link>
            </div>

            {/* Goals Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.learning_goals')}</h3>
              <p className="text-gray-600 mb-6">{t('landing.goals_description')}</p>
              <Link 
                href="/student/goals"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
              >
{t('landing.manage_goals')}
              </Link>
            </div>

            {/* Courses Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.browse_courses')}</h3>
              <p className="text-gray-600 mb-6">{t('landing.courses_description')}</p>
              <Link 
                href="/courses"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
              >
{t('landing.browse_courses')}
              </Link>
            </div>

            {/* Knowledge Graph Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('landing.knowledge_graph')}</h3>
              <p className="text-gray-600 mb-6">{t('landing.graph_description')}</p>
              <Link 
                href="/knowledge-graph"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
{t('landing.explore_graph')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}