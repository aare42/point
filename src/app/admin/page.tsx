'use client'

import Link from 'next/link'

export default function AdminPage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              🚀 Admin Dashboard
            </h1>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
              Platform administration split into analytics and data management
            </p>
          </div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link
          href="/admin/analytics"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-12">
            <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300 text-center">📊</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-indigo-700 transition-colors text-center">
              Analytics
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors text-center text-lg">
              View platform statistics, user engagement metrics, and detailed insights about your educational ecosystem
            </p>
            <div className="mt-8 flex items-center justify-center text-indigo-600 group-hover:text-indigo-800">
              <span className="font-medium text-lg">View Analytics</span>
              <svg className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/manage"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-12">
            <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300 text-center">⚙️</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-emerald-700 transition-colors text-center">
              Manage Data
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors text-center text-lg">
              Create, edit, and delete platform entities: topics, courses, users, goals, and vacancies
            </p>
            <div className="mt-8 flex items-center justify-center text-emerald-600 group-hover:text-emerald-800">
              <span className="font-medium text-lg">Manage Data</span>
              <svg className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}