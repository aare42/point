'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AnalyticsData {
  totalTopics: number
  totalUsers: number
  totalCourses: number
  totalGoals: number
  totalVacancies: number
  totalEnrollments: number
  topicsByType: {
    THEORY: number
    PRACTICE: number
    PROJECT: number
  }
  usersByRole: {
    USER: number
    EDITOR: number
    ADMIN: number
  }
  recentActivity: {
    newUsersThisWeek: number
    newTopicsThisWeek: number
    newCoursesThisWeek: number
    newGoalsThisWeek: number
    newVacanciesThisWeek: number
  }
  goalsStats: {
    activeGoals: number
    overdueGoals: number
    avgTopicsPerGoal: number
    usersWithGoals: number
  }
  coursesStats: {
    avgTopicsPerCourse: number
    coursesWithEnrollments: number
    avgEnrollmentsPerCourse: number
  }
  vacanciesStats: {
    avgTopicsPerVacancy: number
  }
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into your educational platform</p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Main Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Topics</p>
              <p className="text-3xl font-bold">{data?.totalTopics || 0}</p>
            </div>
            <div className="text-4xl opacity-80">📚</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Active Users</p>
              <p className="text-3xl font-bold">{data?.totalUsers || 0}</p>
            </div>
            <div className="text-4xl opacity-80">👥</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Live Courses</p>
              <p className="text-3xl font-bold">{data?.totalCourses || 0}</p>
            </div>
            <div className="text-4xl opacity-80">🎓</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Student Goals</p>
              <p className="text-3xl font-bold">{data?.totalGoals || 0}</p>
            </div>
            <div className="text-4xl opacity-80">🎯</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100">Job Vacancies</p>
              <p className="text-3xl font-bold">{data?.totalVacancies || 0}</p>
            </div>
            <div className="text-4xl opacity-80">💼</div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Topics Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Topics by Type</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-gray-700">Theory Topics</span>
              </div>
              <span className="font-medium text-gray-900">{data?.topicsByType?.THEORY || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-700">Practice Topics</span>
              </div>
              <span className="font-medium text-gray-900">{data?.topicsByType?.PRACTICE || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span className="text-gray-700">Project Topics</span>
              </div>
              <span className="font-medium text-gray-900">{data?.topicsByType?.PROJECT || 0}</span>
            </div>
          </div>
        </div>

        {/* Users Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Role</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gray-500 rounded"></div>
                <span className="text-gray-700">Regular Users</span>
              </div>
              <span className="font-medium text-gray-900">{data?.usersByRole?.USER || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-gray-700">Editors</span>
              </div>
              <span className="font-medium text-gray-900">{data?.usersByRole?.EDITOR || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-gray-700">Administrators</span>
              </div>
              <span className="font-medium text-gray-900">{data?.usersByRole?.ADMIN || 0}</span>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Total Course Enrollments</span>
              <span className="font-medium text-gray-900">{data?.totalEnrollments || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Avg Enrollments per Course</span>
              <span className="font-medium text-gray-900">
                {data?.totalCourses && data?.totalCourses > 0 
                  ? Math.round((data?.totalEnrollments || 0) / data.totalCourses)
                  : 0
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Avg Goals per User</span>
              <span className="font-medium text-gray-900">
                {data?.totalUsers && data?.totalUsers > 0 
                  ? Math.round((data?.totalGoals || 0) / data.totalUsers * 10) / 10
                  : 0
                }
              </span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity (This Week)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm">👤</span>
                </div>
                <span className="text-gray-700">New Users</span>
              </div>
              <span className="font-medium text-green-600">+{data?.recentActivity?.newUsersThisWeek || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">📚</span>
                </div>
                <span className="text-gray-700">New Topics</span>
              </div>
              <span className="font-medium text-blue-600">+{data?.recentActivity?.newTopicsThisWeek || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm">🎓</span>
                </div>
                <span className="text-gray-700">New Courses</span>
              </div>
              <span className="font-medium text-purple-600">+{data?.recentActivity?.newCoursesThisWeek || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-sm">🎯</span>
                </div>
                <span className="text-gray-700">New Goals</span>
              </div>
              <span className="font-medium text-orange-600">+{data?.recentActivity?.newGoalsThisWeek || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-teal-600 text-sm">💼</span>
                </div>
                <span className="text-gray-700">New Vacancies</span>
              </div>
              <span className="font-medium text-teal-600">+{data?.recentActivity?.newVacanciesThisWeek || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Goals Analytics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals Analytics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-700">Active Goals</span>
              </div>
              <span className="font-medium text-gray-900">{data?.goalsStats?.activeGoals || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-gray-700">Overdue Goals</span>
              </div>
              <span className="font-medium text-gray-900">{data?.goalsStats?.overdueGoals || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Avg Topics per Goal</span>
              <span className="font-medium text-gray-900">{data?.goalsStats?.avgTopicsPerGoal || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Users with Goals</span>
              <span className="font-medium text-gray-900">{data?.goalsStats?.usersWithGoals || 0}</span>
            </div>
          </div>
        </div>

        {/* Courses Analytics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Courses Analytics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Avg Topics per Course</span>
              <span className="font-medium text-gray-900">{data?.coursesStats?.avgTopicsPerCourse || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Courses with Enrollments</span>
              <span className="font-medium text-gray-900">{data?.coursesStats?.coursesWithEnrollments || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Avg Enrollments per Course</span>
              <span className="font-medium text-gray-900">{data?.coursesStats?.avgEnrollmentsPerCourse || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Total Enrollments</span>
              <span className="font-medium text-gray-900">{data?.totalEnrollments || 0}</span>
            </div>
          </div>
        </div>

        {/* Vacancies Analytics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vacancies Analytics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Total Vacancies</span>
              <span className="font-medium text-gray-900">{data?.totalVacancies || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Avg Topics per Vacancy</span>
              <span className="font-medium text-gray-900">{data?.vacanciesStats?.avgTopicsPerVacancy || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">New This Week</span>
              <span className="font-medium text-teal-600">+{data?.recentActivity?.newVacanciesThisWeek || 0}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}